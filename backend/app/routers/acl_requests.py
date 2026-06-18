from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any, Optional
from app.db.session import get_db
from app.models.acl_request import AclRequest, RequestStatus
from app.schemas.acl_requests import AclRequestCreate, AclRequestResponse, AclRequestUpdate, AclRequestPaginatedResponse
from app.core.dependencies import verify_credentials, is_admin, get_kafka_admin_service
from app.services.kafka_admin import KafkaAdminService
from app.schemas.acls import ResourceType, PatternType, AclOperation, AclPermissionType
from app.schemas.schemas import AdminActionRequest
from app.schemas.pagination import PaginatedResponse
from app.core.audit_logger import log_audit_event

router = APIRouter()

# create_acl_request removed - Use POST /acls/ instead

@router.get("/", response_model=AclRequestPaginatedResponse)
async def list_acl_requests(
    cluster: str | None = Query(None, description="Filter by cluster"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, description="Search by resource name or principal or username"),
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials)
):
    username = user_info.get("username")
    
    query = select(AclRequest)
    if cluster:
        query = query.where(AclRequest.cluster == cluster)
        
    if not is_admin(username):
        query = query.where(AclRequest.username == username)
    
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (AclRequest.resource_name.like(search_filter)) |
            (AclRequest.principal.like(search_filter)) |
            (AclRequest.username.like(search_filter))
        )

    # Get total count
    count_stmt = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar() or 0
    
    # Pagination
    items_stmt = query.order_by(AclRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
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

@router.put("/{request_id}/approve", response_model=AclRequestResponse)
async def approve_acl_request(
    request_id: int,
    action: AdminActionRequest,
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    kafka_service: KafkaAdminService = Depends(get_kafka_admin_service)
):
    username = user_info.get("username")
    if not is_admin(username):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can approve requests")
        
    result = await db.execute(select(AclRequest).where(AclRequest.id == request_id))
    acl_request = result.scalars().first()
    if not acl_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if acl_request.status == RequestStatus.APPROVED:
        return acl_request
        
    # Execute on Kafka
    try:
        if not acl_request.principal or not acl_request.host:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Cannot auto-approve old requests without principal/host. User must re-submit."
            )
            
        # Sanitize principal - remove all spaces
        sanitized_principal = acl_request.principal.replace(" ", "") if acl_request.principal else acl_request.principal
            
        if acl_request.operation == "POST":
            await kafka_service.create_acl(
                resource_type=ResourceType(acl_request.resource_type),
                resource_name=acl_request.resource_name,
                pattern_type=PatternType(acl_request.pattern_type) if acl_request.pattern_type else PatternType.LITERAL,
                principal=sanitized_principal,
                host=acl_request.host,
                operation=AclOperation(acl_request.kafka_operation) if acl_request.kafka_operation else AclOperation.ALL,
                permission_type=AclPermissionType(acl_request.permission_type),
                cluster=acl_request.cluster
            )
        elif acl_request.operation == "DELETE":
             await kafka_service.delete_acl(
                resource_type=ResourceType(acl_request.resource_type),
                resource_name=acl_request.resource_name,
                pattern_type=PatternType(acl_request.pattern_type) if acl_request.pattern_type else PatternType.LITERAL,
                principal=sanitized_principal,
                host=acl_request.host,
                operation=AclOperation(acl_request.kafka_operation) if acl_request.kafka_operation else AclOperation.ALL,
                permission_type=AclPermissionType(acl_request.permission_type),
                cluster=acl_request.cluster
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply ACL to Kafka: {str(e)}")

    acl_request.status = RequestStatus.APPROVED
    acl_request.approved_by = username
    acl_request.admin_comment = action.admin_comment
    await db.commit()
    await db.refresh(acl_request)

    # Log to audit table
    await log_audit_event(
        db=db,
        level="INFO",
        username=username,
        action=f"APPROVE_{acl_request.operation}_ACL_REQUEST",
        resource_type="ACL_REQUEST",
        resource_name=acl_request.resource_name,
        message=f"Admin {username} approved {acl_request.operation} request for ACL on {acl_request.resource_type} '{acl_request.resource_name}' (ID: {request_id})"
    )
    return acl_request

@router.put("/{request_id}/reject", response_model=AclRequestResponse)
async def reject_acl_request(
    request_id: int,
    action: AdminActionRequest,
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials)
):
    username = user_info.get("username")
    if not is_admin(username):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can reject requests")
        
    result = await db.execute(select(AclRequest).where(AclRequest.id == request_id))
    acl_request = result.scalars().first()
    if not acl_request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    acl_request.status = RequestStatus.REJECTED
    acl_request.approved_by = username # Track who rejected it
    acl_request.admin_comment = action.admin_comment
    await db.commit()
    await db.refresh(acl_request)

    # Log to audit table
    await log_audit_event(
        db=db,
        level="INFO",
        username=username,
        action=f"REJECT_{acl_request.operation}_ACL_REQUEST",
        resource_type="ACL_REQUEST",
        resource_name=acl_request.resource_name,
        message=f"Admin {username} rejected {acl_request.operation} request for ACL on {acl_request.resource_type} '{acl_request.resource_name}' (ID: {request_id})"
    )
    return acl_request
