from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any, Optional
import logging
from app.db.session import get_db

logger = logging.getLogger(__name__)
from app.models.topic_request import TopicRequest
from app.models.acl_request import RequestStatus
from app.schemas.topic_requests import TopicRequestCreate, TopicRequestResponse, TopicRequestPaginatedResponse
from app.schemas.schemas import AdminActionRequest
from app.core.dependencies import verify_credentials, is_admin, get_kafka_admin_service
from app.services.kafka_admin import KafkaAdminService
from app.schemas.pagination import PaginatedResponse
from app.core.audit_logger import log_audit_event

router = APIRouter()

@router.get("/", response_model=TopicRequestPaginatedResponse)
async def list_topic_requests(
    cluster: str | None = Query(None, description="Filter by cluster"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, description="Search by topic name or username"),
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials)
):
    """
    List topic requests.
    - Admins see all requests
    - Normal users see only their own requests
    """
    username = user_info.get("username")
    
    query = select(TopicRequest)
    if cluster:
        query = query.where(TopicRequest.cluster == cluster)
        
    if not is_admin(username):
        query = query.where(TopicRequest.username == username)
    
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (TopicRequest.topic_name.like(search_filter)) |
            (TopicRequest.username.like(search_filter))
        )

    # Get total count
    count_stmt = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar() or 0
    
    # Pagination
    items_stmt = query.order_by(TopicRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items_result = await db.execute(items_stmt)
    records = items_result.scalars().all()
    
    # Enrich with existing config for ALTER requests
    items = []
    kafka_service = get_kafka_admin_service()
    
    for record in records:
        # Create a dict from the record
        item_dict = {
            "id": record.id,
            "username": record.username,
            "operation": record.operation,
            "topic_name": record.topic_name,
            "num_partitions": record.num_partitions,
            "replication_factor": record.replication_factor,
            "config": record.config,
            "cluster": record.cluster,
            "status": record.status,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
            "approved_by": record.approved_by,
            "admin_comment": record.admin_comment,
            "existing_config": None
        }
        
        if record.operation == "ALTER":
            try:
                topic_info = await kafka_service.get_topic(record.topic_name, record.cluster)
                item_dict["existing_config"] = topic_info.model_dump()
            except Exception as e:
                logger.warning(f"Could not fetch existing config for topic {record.topic_name}: {e}")
                
        items.append(item_dict)
    
    pages = (int(total_count) + int(page_size) - 1) // int(page_size)
    
    return {
        "items": items,
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "pages": pages
    }

@router.post("/", response_model=TopicRequestResponse)
async def create_topic_request(
    request: TopicRequestCreate,
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials)
):
    """
    Create a new topic request.
    Normal users create requests that need admin approval.
    """
    username = user_info.get("username")
    
    # Validate operation
    if request.operation not in ["CREATE", "ALTER", "DELETE"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Operation must be CREATE, ALTER, or DELETE"
        )
    
    # Validate required fields based on operation
    if request.operation == "CREATE":
        if not request.num_partitions or not request.replication_factor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="num_partitions and replication_factor are required for CREATE operation"
            )
    
    # Prepare config dict from request fields (matching logic in topics.py)
    request_config: Dict[str, str] = {}
    if request.retention_ms:
        request_config["retention.ms"] = str(request.retention_ms)
    if request.cleanup_policy:
        request_config["cleanup.policy"] = request.cleanup_policy
    if request.min_insync_replicas:
        request_config["min.insync.replicas"] = str(request.min_insync_replicas)
    if request.extra_configs:
        for k, v in request.extra_configs.items():
            if k not in request_config:
                request_config[k] = str(v) if v is not None else ""

    # Prevent duplicate pending requests
    stmt = select(TopicRequest).where(
        TopicRequest.username == username,
        TopicRequest.operation == request.operation,
        TopicRequest.topic_name == request.topic_name,
        TopicRequest.cluster == request.cluster,
        TopicRequest.status == RequestStatus.PENDING
    )
    result = await db.execute(stmt)
    existing = result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Topic '{request.topic_name}' already has a pending {request.operation} request (ID: {existing.id}) waiting for approval."
        )

    # Create the request with built config
    topic_request_obj = TopicRequest(
        username=username,
        operation=request.operation,
        topic_name=request.topic_name,
        num_partitions=request.num_partitions,
        replication_factor=request.replication_factor,
        config=request_config if request_config else None,
        cluster=request.cluster,
        status=RequestStatus.PENDING
    )
    
    # Pre-validation using dry-run (validate_only)
    # This ensures that even for non-admin requests, we catch basic config errors immediately.
    try:
        kafka_service = await get_kafka_admin_service() # Get service instance
        if request.operation == "CREATE":
            await kafka_service.create_topic(
                name=request.topic_name,
                num_partitions=request.num_partitions,
                replication_factor=request.replication_factor,
                config=request_config,
                cluster=request.cluster,
                validate_only=True
            )
        elif request.operation == "ALTER":
            await kafka_service.alter_topic(
                name=request.topic_name,
                num_partitions=request.num_partitions,
                config=request_config,
                cluster=request.cluster,
                validate_only=True
            )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Pre-validation failed for topic request: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Topic request validation failed: {error_msg}"
        )

    db.add(topic_request_obj)
    await db.commit()
    await db.refresh(topic_request_obj)
    
    # Log to audit table for consistency
    await log_audit_event(
        db=db,
        level="INFO",
        username=username,
        action=f"REQUEST_{request.operation}_TOPIC",
        resource_type="TOPIC",
        resource_name=request.topic_name,
        message=f"User {username} requested {request.operation} on topic '{request.topic_name}'"
    )

    return topic_request_obj

@router.put("/{request_id}/approve", response_model=TopicRequestResponse)
async def approve_topic_request(
    request_id: int,
    action: AdminActionRequest,
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    kafka_service: KafkaAdminService = Depends(get_kafka_admin_service)
):
    """
    Approve a topic request and execute it on Kafka.
    Admin only.
    """
    username = user_info.get("username")
    if not is_admin(username):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can approve requests"
        )
    
    result = await db.execute(select(TopicRequest).where(TopicRequest.id == request_id))
    topic_request = result.scalars().first()
    if not topic_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if topic_request.status == RequestStatus.APPROVED:
        return topic_request
    
    # Execute on Kafka based on operation (no config support)
    try:
        if topic_request.operation == "CREATE":
            await kafka_service.create_topic(
                name=topic_request.topic_name,
                num_partitions=topic_request.num_partitions,
                replication_factor=topic_request.replication_factor,
                config=topic_request.config or {},  # Use stored config
                cluster=topic_request.cluster
            )
        elif topic_request.operation == "ALTER":
            # Extract config from JSON column
            config = topic_request.config or {}
            
            logger.info(f"Applying ALTER operation for topic '{topic_request.topic_name}' with config: {config}")
            
            # Check for replication factor if stored in config or column (schema update might be needed if column exists)
            # define replication_factor from request column if it exists, though alter_topic expects it as arg
            # In TopicRequest model, replication_factor is for CREATE.
            # But we added it to TopicAlterRequest schema.
            # We need to check if we saved it in config or if we need to update model.
            # Previously we saved retention/cleanup in config.
            # If replication_factor was in the request, we need to pass it.
            # Let's assume for now it might be passed as an argument if we update logic, 
            # but currently alter_topic signature has replication_factor. 
            # We need to extract it from config if we put it there, or just pass None if not supported in DB model yet for Alter.
            
            # Wait, in previous step for non-admin we did:
            # topic_req = TopicRequest(..., config=request_config, ...)
            # We didn't save replication_factor in a separate column for ALTER (it shares model with CREATE where it is nullable)
            # BUT `TopicRequest` model has `replication_factor` column.
            # Let's check if we populated it in `routers/topics.py`.
            # In routers/topics.py: 
            # topic_req = TopicRequest(..., num_partitions=..., config=request_config, ...)
            # We DONT set replication_factor column there for ALTER.
            # START_DEBUG: The user request has "replication_factor": null in the JSON they pasted. 
            # So they didn't request it or we didn't save it.
            # If they WANT to request it, we need to update `routers/topics.py` to save it to the DB column too.
            
            await kafka_service.alter_topic(
                name=topic_request.topic_name,
                num_partitions=topic_request.num_partitions,
                config=config,
                cluster=topic_request.cluster
            )
        elif topic_request.operation == "DELETE":
            await kafka_service.delete_topic(
                name=topic_request.topic_name,
                cluster=topic_request.cluster
            )
    except Exception as e:
        # Provide more detailed error message
        error_msg = str(e)
        logger.error(f"Error approving topic request {request_id}: {error_msg}")
        
        if "Invalid config" in error_msg or "Unknown config" in error_msg:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid topic configuration. Please check the config parameters. Error: {error_msg}"
            )
        
        # Fallback for other Kafka errors
        if "Failed to execute" in error_msg or "Failed to" in error_msg:
             raise HTTPException(
                status_code=500,
                detail=error_msg
            )

        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred while executing the topic operation: {error_msg}"
        )
    
    # Update request status
    topic_request.status = RequestStatus.APPROVED
    topic_request.approved_by = username
    topic_request.admin_comment = action.admin_comment
    await db.commit()
    await db.refresh(topic_request)

    # Log to audit table
    await log_audit_event(
        db=db,
        level="INFO",
        username=username,
        action=f"APPROVE_{topic_request.operation}_TOPIC_REQUEST",
        resource_type="TOPIC_REQUEST",
        resource_name=topic_request.topic_name,
        message=f"Admin {username} approved {topic_request.operation} request for topic '{topic_request.topic_name}' (ID: {request_id})"
    )
    
    return topic_request

@router.put("/{request_id}/reject", response_model=TopicRequestResponse)
async def reject_topic_request(
    request_id: int,
    action: AdminActionRequest,
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials)
):
    """
    Reject a topic request.
    Admin only.
    """
    username = user_info.get("username")
    if not is_admin(username):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can reject requests"
        )
    
    result = await db.execute(select(TopicRequest).where(TopicRequest.id == request_id))
    topic_request = result.scalars().first()
    if not topic_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    topic_request.status = RequestStatus.REJECTED
    topic_request.approved_by = username
    topic_request.admin_comment = action.admin_comment
    await db.commit()
    await db.refresh(topic_request)

    # Log to audit table
    await log_audit_event(
        db=db,
        level="INFO",
        username=username,
        action=f"REJECT_{topic_request.operation}_TOPIC_REQUEST",
        resource_type="TOPIC_REQUEST",
        resource_name=topic_request.topic_name,
        message=f"Admin {username} rejected {topic_request.operation} request for topic '{topic_request.topic_name}' (ID: {request_id})"
    )
    
    return topic_request
