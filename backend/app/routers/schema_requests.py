"""
Schema Requests Router - Admin Approve/Reject for Schema Registry operations.

Mirrors topic_requests.py and acl_requests.py for the Schema Registry workflow.
"""

import logging
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.schema_request import SchemaRequest
from app.models.acl_request import RequestStatus
from app.schemas.schema_requests import SchemaRequestResponse, SchemaRequestPaginatedResponse
from app.core.dependencies import verify_credentials, is_admin
from app.services.schema_registry import schema_registry_service
from app.schemas.schemas import SchemaType, AdminActionRequest
from app.schemas.pagination import PaginatedResponse
from sqlalchemy import func
from app.core.audit_logger import log_audit_event

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=SchemaRequestPaginatedResponse)
async def list_schema_requests(
    cluster: str | None = Query(None, description="Filter by cluster"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials),
):
    """
    List schema requests.
    - Admins see all requests.
    - Normal users see only their own requests.
    """
    username = user_info.get("username")

    query = select(SchemaRequest)
    if cluster:
        query = query.where(SchemaRequest.cluster == cluster)

    if not is_admin(username):
        query = query.where(SchemaRequest.username == username)

    # Get total count
    count_stmt = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar() or 0

    # Pagination
    items_stmt = query.order_by(SchemaRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items_result = await db.execute(items_stmt)
    items = items_result.scalars().all()

    pages = (total_count + page_size - 1) // page_size

    return {
        "items": items,
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "pages": pages
    }


@router.put("/{request_id}/approve", response_model=SchemaRequestResponse)
async def approve_schema_request(
    request_id: int,
    action: AdminActionRequest,
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials),
):
    """
    Approve a schema request and execute it on the Schema Registry.
    Admin only.
    """
    username = user_info.get("username")
    if not is_admin(username):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can approve requests",
        )

    stmt = select(SchemaRequest).where(SchemaRequest.id == request_id)
    result = await db.execute(stmt)
    schema_req = result.scalars().first()
    if not schema_req:
        raise HTTPException(status_code=404, detail="Request not found")

    if schema_req.status == RequestStatus.APPROVED:
        return schema_req

    try:
        if schema_req.operation == "REGISTER_SCHEMA":
            await schema_registry_service.register_schema(
                subject=schema_req.subject,
                schema_str=schema_req.schema_str,
                schema_type=SchemaType(schema_req.schema_type) if schema_req.schema_type else SchemaType.AVRO,
                references=schema_req.references,
                cluster=schema_req.cluster
            )

        elif schema_req.operation == "DELETE_SUBJECT":
            await schema_registry_service.delete_subject(
                subject=schema_req.subject,
                permanent=schema_req.permanent or False,
                cluster=schema_req.cluster
            )

        elif schema_req.operation == "DELETE_SCHEMA_VERSION":
            await schema_registry_service.delete_schema_version(
                subject=schema_req.subject,
                version=schema_req.version,
                permanent=schema_req.permanent or False,
                cluster=schema_req.cluster
            )

        elif schema_req.operation == "SET_COMPATIBILITY":
            await schema_registry_service.set_subject_compatibility(
                subject=schema_req.subject,
                compatibility=schema_req.compatibility,
                cluster=schema_req.cluster
            )

        elif schema_req.operation == "PROMOTE_SCHEMA_VERSION":
            await schema_registry_service.promote_version(
                subject=schema_req.subject,
                version=schema_req.version,
                db=db,
                cluster=schema_req.cluster
            )
            
        elif schema_req.operation == "SOFT_DELETE_SCHEMA_VERSION":
            await schema_registry_service.set_version_soft_delete(
                subject=schema_req.subject,
                version=schema_req.version,
                soft_deleted=True,
                db=db,
                cluster=schema_req.cluster
            )
            
        elif schema_req.operation == "RESTORE_SCHEMA_VERSION":
            await schema_registry_service.set_version_soft_delete(
                subject=schema_req.subject,
                version=schema_req.version,
                soft_deleted=False,
                db=db,
                cluster=schema_req.cluster
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown operation: {schema_req.operation}",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute schema operation: {str(e)}",
        )

    schema_req.status = RequestStatus.APPROVED
    schema_req.approved_by = username
    schema_req.admin_comment = action.admin_comment
    await db.commit()
    await db.refresh(schema_req)

    # Log to audit table
    await log_audit_event(
        db=db,
        level="INFO",
        username=username,
        action=f"APPROVE_{schema_req.operation}_SCHEMA_REQUEST",
        resource_type="SCHEMA_REQUEST",
        resource_name=schema_req.subject,
        message=f"Admin {username} approved {schema_req.operation} request for subject '{schema_req.subject}' (ID: {request_id})"
    )
    return schema_req


@router.put("/{request_id}/reject", response_model=SchemaRequestResponse)
async def reject_schema_request(
    request_id: int,
    action: AdminActionRequest,
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials),
):
    """
    Reject a schema request.
    Admin only.
    """
    username = user_info.get("username")
    if not is_admin(username):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can reject requests",
        )

    stmt = select(SchemaRequest).where(SchemaRequest.id == request_id)
    result = await db.execute(stmt)
    schema_req = result.scalars().first()
    if not schema_req:
        raise HTTPException(status_code=404, detail="Request not found")

    schema_req.status = RequestStatus.REJECTED
    schema_req.approved_by = username
    schema_req.admin_comment = action.admin_comment
    await db.commit()
    await db.refresh(schema_req)

    # Log to audit table
    await log_audit_event(
        db=db,
        level="INFO",
        username=username,
        action=f"REJECT_{schema_req.operation}_SCHEMA_REQUEST",
        resource_type="SCHEMA_REQUEST",
        resource_name=schema_req.subject,
        message=f"Admin {username} rejected {schema_req.operation} request for subject '{schema_req.subject}' (ID: {request_id})"
    )
    return schema_req
