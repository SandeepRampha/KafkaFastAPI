"""
FastAPI Kafka Admin Service - Main Application Entry Point

This service provides a REST API for managing Kafka clusters including:
- ACLs: Manage access control lists for security

Authentication: Keycloak SSO (OIDC) via JWT validation
"""

from contextlib import asynccontextmanager
import asyncio
from typing import Dict, Any, List
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
import logging

# Configure Logging
# Clear existing handlers to ensure re-configuration works (important for --reload)
for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

from app.core.config import settings
from app.db.session import engine
from sqlalchemy import text, func
from app.core.handlers import register_exception_handlers
from app.core.dependencies import verify_credentials, oauth2_scheme, is_admin
from app.routers import acls, acl_requests, topics, schemas, schema_requests, topic_requests, user_requests, audit_logs, governance
from app.services.kafka_admin import kafka_admin_service
from app.models.acl_request import AclRequest, RequestStatus
from app.models.topic_request import TopicRequest
from app.models.governance_request import GovernanceRequest, GovernanceStatus, GovernanceResourceType
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import SessionLocal, get_db
from app.schemas.dashboard import HealthResponse
from app.services.schema_registry import schema_registry_service
import time
import httpx



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events."""
    # Startup
    logger.info(f"[STARTUP] Starting {settings.app_name}...")
    from app.db.base import Base
    # Import models to ensure they are registered with SQLAlchemy
    from app.models.acl_request import AclRequest
    from app.models.admin_action import AdminTopic, AdminAcl, AuditLog
    from app.models.schema_version_state import SchemaVersionState
    from app.models.governance_request import GovernanceRequest
    from app.models.system_setting import SystemSetting
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start background tasks
    from app.services.cleanup import run_periodic_cleanup
    asyncio.create_task(run_periodic_cleanup(interval_hours=24, days_threshold=7))
    logger.info("[STARTUP] Periodic cleanup task started (24h interval, 7d threshold)")

    yield
    # Shutdown
    logger.info(f"[SHUTDOWN] Shutting down {settings.app_name}...")


app = FastAPI(
    title=settings.app_name,
    description="REST API for Kafka cluster administration - ACLs",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
register_exception_handlers(app)

# Register routers
app.include_router(acls.router, prefix="/acls", tags=["ACLs"])
app.include_router(acl_requests.router, prefix="/acl-requests", tags=["ACL Requests"])
app.include_router(topics.router, prefix="/topics", tags=["Topics"])
app.include_router(topic_requests.router, prefix="/topic-requests", tags=["Topic Requests"])
app.include_router(user_requests.router, prefix="/requests", tags=["User Requests"])
app.include_router(schemas.router, prefix="/schemas", tags=["Schemas"])
app.include_router(schema_requests.router, prefix="/schema-requests", tags=["Schema Requests"])
app.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Logs"])
app.include_router(governance.router, prefix="/governance", tags=["Governance"])



@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check(
    cluster: str = Query("default", description="Cluster identifier"),
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials)
):
    """
    Health check and Dashboard Data endpoint.
    Returns aggregated stats for the admin dashboard.
    Only accessible by admins.
    """
    if not user_info.get("is_admin") and not is_admin(user_info.get("username")):
        logger.warning(f"Unauthorized health check attempt by user: {user_info.get('username')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access the health and dashboard data."
        )
    # 1. Get Kafka Stats
    try:
        kafka_stats = await kafka_admin_service.get_dashboard_stats(cluster=cluster)
    except Exception as e:
        logger.exception("Error fetching Kafka dashboard stats")
        # If Kafka is down, the service is unavailable.
        # We return a 503 Service Unavailable with details.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Kafka Cluster Unreachable: {str(e)}"
        )

    # 2. Get Request Stats (Approved, Rejected, Pending)
    try:
        # Fetch counts for all statuses in one go for Topic Requests
        t_stmt = select(TopicRequest.status, func.count(TopicRequest.id)).group_by(TopicRequest.status)
        t_results = (await db.execute(t_stmt)).all()
        t_counts = {status: count for status, count in t_results}
        
        # Fetch counts for all statuses in one go for ACL Requests
        a_stmt = select(AclRequest.status, func.count(AclRequest.id)).group_by(AclRequest.status)
        a_results = (await db.execute(a_stmt)).all()
        a_counts = {status: count for status, count in a_results}

        # Fetch counts for Governance Requests (Topic vs ACL)
        g_stmt = select(
            GovernanceRequest.resource_type, 
            GovernanceRequest.status, 
            func.count(GovernanceRequest.id)
        ).group_by(GovernanceRequest.resource_type, GovernanceRequest.status)
        g_results = (await db.execute(g_stmt)).all()

        # Helper to map GovernanceStatus to RequestStatus categories
        def get_gov_counts(res_type: GovernanceResourceType):
            pending = sum(c for rt, s, c in g_results if rt == res_type and s in [GovernanceStatus.REQUESTED, GovernanceStatus.UNDER_REVIEW])
            approved = sum(c for rt, s, c in g_results if rt == res_type and s in [GovernanceStatus.APPROVED, GovernanceStatus.IMPLEMENTED])
            rejected = sum(c for rt, s, c in g_results if rt == res_type and s in [GovernanceStatus.REJECTED, GovernanceStatus.IMPLEMENTATION_FAILED])
            return pending, approved, rejected

        gt_pending, gt_approved, gt_rejected = get_gov_counts(GovernanceResourceType.TOPIC)
        ga_pending, ga_approved, ga_rejected = get_gov_counts(GovernanceResourceType.ACL)

        # Topic Totals
        topic_pending = t_counts.get(RequestStatus.PENDING, 0) + gt_pending
        topic_approved = t_counts.get(RequestStatus.APPROVED, 0) + gt_approved
        topic_rejected = t_counts.get(RequestStatus.REJECTED, 0) + gt_rejected

        # ACL Totals
        acl_pending = a_counts.get(RequestStatus.PENDING, 0) + ga_pending
        acl_approved = a_counts.get(RequestStatus.APPROVED, 0) + ga_approved
        acl_rejected = a_counts.get(RequestStatus.REJECTED, 0) + ga_rejected

        # Overall Totals
        pending_count = topic_pending + acl_pending
        approved_count = topic_approved + acl_approved
        rejected_count = topic_rejected + acl_rejected

    except Exception as e:
        logger.error(f"Database Error in Health Check: {e}")
        # If DB is down, we also consider the service unhealthy
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database Unreachable: {str(e)}"
        )

    # 3. Get Schema Registry Stats
    try:
        sr_start = time.time()
        subjects = await schema_registry_service.list_subjects()
        sr_stats = {
            "status": "Healthy",
            "subjects_count": len(subjects),
            "latency_ms": round((time.time() - sr_start) * 1000, 2)
        }
    except Exception as e:
        logger.error(f"Schema Registry Error in Health Check: {e}")
        sr_stats = {
            "status": "Unhealthy",
            "error": str(e)
        }

    return {
        **kafka_stats,
        "requests": {
            "approved": approved_count,
            "rejected": rejected_count,
            "pending": pending_count,
            "topics": {
                "approved": topic_approved,
                "rejected": topic_rejected,
                "pending": topic_pending
            },
            "acls": {
                "approved": acl_approved,
                "rejected": acl_rejected,
                "pending": acl_pending
            }
        },
        "schema_registry": sr_stats
    }




@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "message": f"Welcome to {settings.app_name}",
        "docs": "/docs",
        "health": "/health"
    }


# ============================================
# KEYCLOAK SSO ENDPOINTS
# ============================================

@app.get("/me", tags=["Authentication"])
async def get_current_user(user_info: Dict[str, Any] = Depends(verify_credentials)):
    """
    Return current user info extracted from Keycloak JWT token.
    Useful for frontend to verify auth state and get user details.
    """
    return {
        "username": user_info.get("username"),
        "role": user_info.get("role"),
        "roles": user_info.get("roles", []),
        "tenant": user_info.get("tenant"),
        "is_admin": user_info.get("is_admin", False),
        "groups": user_info.get("groups", []),
    }


@app.post("/logout", tags=["Authentication"])
async def logout(
    current_user: dict = Depends(verify_credentials),
):
    """
    Logout endpoint.
    With Keycloak SSO, the actual session invalidation happens on the Keycloak side.
    This endpoint confirms the logout to the frontend.
    """
    return {"message": "Successfully logged out", "username": current_user["username"]}


