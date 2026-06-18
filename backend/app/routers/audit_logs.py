from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy import desc, func

from app.db.session import get_db
from app.models.admin_action import AuditLog
from app.schemas.audit_logs import AuditLogResponse
from app.schemas.pagination import PaginatedResponse
from app.core.dependencies import verify_credentials, is_admin

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[AuditLogResponse])
async def list_audit_logs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    username_filter: Optional[str] = Query(None, alias="username"),
    action_filter: Optional[str] = Query(None, alias="action"),
    resource_type_filter: Optional[str] = Query(None, alias="resource_type"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve audit logs with pagination and optional filtering.
    Only accessible by admins.
    """
    if not is_admin(user_info.get("username")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access audit logs."
        )

    query = select(AuditLog)

    # Apply filters
    if username_filter:
        query = query.where(AuditLog.username == username_filter)
    if action_filter:
        query = query.where(AuditLog.action == action_filter)
    if resource_type_filter:
        query = query.where(AuditLog.resource_type == resource_type_filter)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply sorting (newest first) and pagination
    items_query = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit)
    items_result = await db.execute(items_query)
    items = items_result.scalars().all()

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset
    }
