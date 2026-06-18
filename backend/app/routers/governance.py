import logging
from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.core.dependencies import verify_credentials, require_steward, require_admin, is_admin
from app.core.audit_logger import log_audit_event
from app.models.governance_request import GovernanceRequest, GovernanceStatus, GovernanceResourceType, GovernanceOperation
from app.models.system_setting import SystemSetting
from app.services.governance_service import governance_service
from app.schemas.governance import (
    GovernanceRequestCreate, 
    GovernanceRequestResponse, 
    GovernanceRequestAction,
    SystemSettingResponse,
    SystemSettingUpdate,
    PaginatedGovernanceResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ──────────────────────────────────────────────────────────────────
# REQUEST MANAGEMENT (USER / STEWARD / ADMIN)
# ──────────────────────────────────────────────────────────────────

@router.post("/requests", response_model=GovernanceRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_governance_request(
    request: GovernanceRequestCreate,
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials)
):
    """
    Submit a new Topic or ACL governance request.
    Initial status: REQUESTED.
    """
    username = user_info.get("username")
    
    # 1. Validate payload structure
    try:
        await governance_service.validate_request_payload(request.resource_type, request.operation, request.payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # 2. Create the request
    gov_request = GovernanceRequest(
        resource_type=request.resource_type,
        resource_name=request.resource_name,
        operation=request.operation,
        payload=request.payload,
        old_payload=request.old_payload,
        cluster_id=request.cluster_id,
        created_by=username,
        status=GovernanceStatus.REQUESTED
    )
    
    db.add(gov_request)
    await db.commit()
    await db.refresh(gov_request)
    
    # Audit log
    await log_audit_event(
        db=db, level="INFO", username=username,
        action=f"CREATE_{request.resource_type}_REQUEST",
        resource_type="GOVERNANCE_REQUEST",
        resource_name=str(gov_request.id),
        message=f"Government request {gov_request.id} created for {request.resource_type} {request.resource_name}"
    )
    
    return gov_request

@router.get("/requests", response_model=PaginatedGovernanceResponse)
async def list_governance_requests(
    resource_type: Optional[GovernanceResourceType] = None,
    operation: Optional[GovernanceOperation] = None,
    status: Optional[GovernanceStatus] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials)
):
    """
    List governance requests.
    - Normal users: See only their own.
    - Stewards/Admins: See all.
    """
    username = user_info.get("username")
    admin_or_steward = user_info.get("role") in ["admin", "data_steward"]
    
    query = select(GovernanceRequest)
    
    if not admin_or_steward:
        query = query.where(GovernanceRequest.created_by == username)
    
    if resource_type:
        query = query.where(GovernanceRequest.resource_type == resource_type)
    if operation:
        query = query.where(GovernanceRequest.operation == operation)
    if status:
        query = query.where(GovernanceRequest.status == status)
        
    # Total count
    count_stmt = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar() or 0
    
    # Pagination
    items_stmt = query.order_by(GovernanceRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items_result = await db.execute(items_stmt)
    items = items_result.scalars().all()
    
    return {
        "items": items,
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "pages": (total_count + page_size - 1) // page_size if total_count > 0 else 0
    }

# ──────────────────────────────────────────────────────────────────
# APPROVAL & IMPLEMENTATION (STEWARD / ADMIN)
# ──────────────────────────────────────────────────────────────────

@router.put("/requests/{id}/approve", response_model=GovernanceRequestResponse)
async def approve_governance_request(
    id: UUID,
    action: GovernanceRequestAction,
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(require_steward)
):
    """
    Approve a request (Data Steward or Admin).
    
    If SystemSetting 'AUTO_IMPLEMENT' is True:
        -> Attempts immediate deployment.
        -> Status moves to IMPLEMENTED or IMPLEMENTATION_FAILED.
    Else:
        -> Moves to APPROVED status.
    """
    username = user_info.get("username")
    
    stmt = select(GovernanceRequest).where(GovernanceRequest.id == id)
    result = await db.execute(stmt)
    gov_request = result.scalars().first()
    
    if not gov_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if gov_request.status in [GovernanceStatus.APPROVED, GovernanceStatus.IMPLEMENTED]:
        return gov_request
        
    # Update status to APPROVED
    gov_request.status = GovernanceStatus.APPROVED
    gov_request.approved_by = username
    gov_request.admin_comment = action.admin_comment
    await db.commit()
    
    # Check AUTO_IMPLEMENT
    auto_implement = await governance_service.get_setting(db, "AUTO_IMPLEMENT", default=False)
    
    if auto_implement:
        logger.info(f"Auto-implementation triggered for request {id}")
        success = await governance_service.implement_request(db, gov_request, executed_by="SYSTEM")
        
        await log_audit_event(
            db=db, level="INFO" if success else "ERROR", username="SYSTEM",
            action="AUTO_IMPLEMENTATION",
            resource_type="GOVERNANCE_REQUEST",
            resource_name=str(id),
            message=f"Auto-implementation {'succeeded' if success else 'failed'} for {gov_request.resource_name}"
        )
    else:
        await log_audit_event(
            db=db, level="INFO", username=username,
            action="APPROVE_REQUEST",
            resource_type="GOVERNANCE_REQUEST",
            resource_name=str(id),
            message=f"User {username} approved request {id}. Awaiting manual implementation."
        )
        
    await db.refresh(gov_request)
    return gov_request

@router.put("/requests/{id}/reject", response_model=GovernanceRequestResponse)
async def reject_governance_request(
    id: UUID,
    action: GovernanceRequestAction,
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(require_steward)
):
    """Reject a request (Data Steward or Admin)"""
    username = user_info.get("username")
    
    stmt = select(GovernanceRequest).where(GovernanceRequest.id == id)
    result = await db.execute(stmt)
    gov_request = result.scalars().first()
    
    if not gov_request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    gov_request.status = GovernanceStatus.REJECTED
    gov_request.approved_by = username
    gov_request.admin_comment = action.admin_comment
    await db.commit()
    
    await log_audit_event(
        db=db, level="INFO", username=username,
        action="REJECT_REQUEST",
        resource_type="GOVERNANCE_REQUEST",
        resource_name=str(id),
        message=f"User {username} rejected request {id}. Reason: {action.admin_comment}"
    )
    
    await db.refresh(gov_request)
    return gov_request

@router.put("/requests/{id}/implement", response_model=GovernanceRequestResponse)
async def implement_governance_request(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(require_admin)
):
    """
    Manually trigger implementation of an APPROVED request (Admin only).
    Useful when manual oversight is required or after fixing a failed implementation.
    """
    username = user_info.get("username")
    
    stmt = select(GovernanceRequest).where(GovernanceRequest.id == id)
    result = await db.execute(stmt)
    gov_request = result.scalars().first()
    
    if not gov_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if gov_request.status not in [GovernanceStatus.APPROVED, GovernanceStatus.IMPLEMENTATION_FAILED]:
        raise HTTPException(
            status_code=400, 
            detail=f"Implementation only allowed for APPROVED or FAILED requests. Current status: {gov_request.status}"
        )
        
    success = await governance_service.implement_request(db, gov_request, executed_by=username)
    
    await log_audit_event(
        db=db, level="INFO" if success else "ERROR", username=username,
        action="MANUAL_IMPLEMENTATION",
        resource_type="GOVERNANCE_REQUEST",
        resource_name=str(id),
        message=f"Manual implementation by {username} {'succeeded' if success else 'failed'}"
    )
    
    await db.refresh(gov_request)
    return gov_request

# ──────────────────────────────────────────────────────────────────
# SETTINGS MANAGEMENT (ADMIN ONLY)
# ──────────────────────────────────────────────────────────────────

@router.get("/settings", response_model=List[SystemSettingResponse])
async def list_settings(
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(require_admin)
):
    """List all dynamic system settings (Admin only)."""
    stmt = select(SystemSetting)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.put("/settings/{key}", response_model=SystemSettingResponse)
async def update_setting(
    key: str,
    update_data: SystemSettingUpdate,
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(require_admin)
):
    """Update a system setting (Admin only). e.g. Toggling AUTO_IMPLEMENT."""
    username = user_info.get("username")
    setting = await governance_service.set_setting(
        db, key, update_data.value, username, is_boolean=update_data.is_boolean
    )
    
    # Audit
    await log_audit_event(
        db=db, level="INFO", username=username,
        action="UPDATE_SETTING",
        resource_type="SYSTEM_SETTING",
        resource_name=key,
        message=f"Admin {username} updated {key} to {update_data.value}"
    )
    
    return setting
