"""
Topics Router - Kafka Topic Management Endpoints

Provides REST API endpoints for managing Kafka topics with LDAP authentication.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db

from app.services.kafka_admin import kafka_admin_service, KafkaAdminService
from app.core.dependencies import verify_credentials, is_admin
from app.core.audit_logger import log_audit_event
from app.core.exceptions import (
    TopicNotFoundError,
    TopicAlreadyExistsError,
    KafkaAdminError,
)
from app.schemas.topics import (
    TopicResponse,
    TopicDetailResponse,
    TopicCreateRequest,
    TopicAlterRequest,
)

router = APIRouter()


@router.get("/", response_model=List[str])
async def list_topics(
    cluster: str = Query("default", description="Cluster identifier"),
    include_internal: bool = Query(False, description="Include internal topics"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
):
    """
    List all topics in the cluster.
    
    Requires LDAP authentication.
    """
    try:
        return await kafka_admin_service.list_topics(
            cluster=cluster,
            include_internal=include_internal,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list topics: {str(e)}",
        )


from app.schemas.topics import (
    TopicResponse,
    TopicDetailResponse,
    TopicCreateRequest,
    TopicAlterRequest,
    TopicMetadataPaginatedResponse,
)

@router.get("/metadata", response_model=TopicMetadataPaginatedResponse)
async def get_topics_metadata(
    cluster: str = Query("default", description="Cluster identifier"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for topic names"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
):
    """
    Get detailed metadata for all topics with pagination and search.
    
    This is a standalone endpoint to fetch topic details for the entire cluster.
    """
    try:
        return await kafka_admin_service.describe_topics_metadata(
            cluster=cluster,
            page=page,
            page_size=page_size,
            search=search,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch topics metadata: {str(e)}",
        )


@router.get("/{name}", response_model=TopicDetailResponse)
async def get_topic(
    name: str,
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
):
    """
    Get detailed information about a specific topic.
    
    Requires LDAP authentication.
    """
    try:
        return await kafka_admin_service.get_topic(
            name=name,
            cluster=cluster,
        )
    except TopicNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get topic: {str(e)}",
        )


@router.post("/", response_model=TopicResponse)
async def create_topic(
    topic_request: TopicCreateRequest,
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new topic.
    
    - Admins: Topic is created immediately
    - Normal users: A request is created for admin approval
    """
    from app.models.topic_request import TopicRequest
    from app.models.acl_request import RequestStatus
    
    username = user_info.get("username")
    is_admin_user = user_info.get("is_admin", False)
    
    # If not admin, create a request instead
    if not is_admin_user:
        # Prepare config dict with only non-None values
        req_config = {}
        # 1. Named shortcut fields
        if topic_request.retention_ms:
            req_config["retention.ms"] = str(topic_request.retention_ms)
        if topic_request.cleanup_policy:
            req_config["cleanup.policy"] = topic_request.cleanup_policy
        if topic_request.min_insync_replicas:
            req_config["min.insync.replicas"] = str(topic_request.min_insync_replicas)
        # 2. Arbitrary extra configs (named fields take priority)
        if topic_request.extra_configs:
            for k, v in topic_request.extra_configs.items():
                req_config.setdefault(k, v)

        # Prevent duplicate pending requests
        stmt = select(TopicRequest).where(
            TopicRequest.username == username,
            TopicRequest.operation == "CREATE",
            TopicRequest.topic_name == topic_request.name,
            TopicRequest.cluster == cluster,
            TopicRequest.status == RequestStatus.PENDING
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Topic '{topic_request.name}' already has a pending CREATE request (ID: {existing.id}) waiting for approval."
            )

        topic_req = TopicRequest(
            username=username,
            operation="CREATE",
            topic_name=topic_request.name,
            num_partitions=topic_request.num_partitions,
            replication_factor=topic_request.replication_factor,
            config=req_config,
            cluster=cluster,
            status=RequestStatus.PENDING
        )

        # Pre-validation using dry-run (validate_only)
        try:
            await kafka_admin_service.create_topic(
                name=topic_request.name,
                num_partitions=topic_request.num_partitions,
                replication_factor=topic_request.replication_factor,
                config=req_config,
                cluster=cluster,
                validate_only=True
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Topic creation validation failed: {str(e)}"
            )

        db.add(topic_req)
        await db.commit()
        await db.refresh(topic_req)
        
        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="REQUEST_CREATE_TOPIC",
            resource_type="TOPIC",
            resource_name=topic_request.name,
            message=f"User {username} requested creation of topic '{topic_request.name}'"
        )

        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail=f"Topic creation request submitted (ID: {topic_req.id}). Waiting for admin approval."
        )
    
    # Admin: Execute immediately
    try:
        config = {}
        # 1. Named shortcut fields
        if topic_request.retention_ms:
            config["retention.ms"] = str(topic_request.retention_ms)
        if topic_request.cleanup_policy:
            config["cleanup.policy"] = topic_request.cleanup_policy
        if topic_request.min_insync_replicas:
            config["min.insync.replicas"] = str(topic_request.min_insync_replicas)
        # 2. Arbitrary extra configs (named fields take priority)
        if topic_request.extra_configs:
            for k, v in topic_request.extra_configs.items():
                config.setdefault(k, v)

        from app.models.admin_action import AdminTopic
        
        result = await kafka_admin_service.create_topic(
            name=topic_request.name,
            num_partitions=topic_request.num_partitions,
            replication_factor=topic_request.replication_factor,
            config=config,
            cluster=cluster,
        )
        
        # Log to database for admins
        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="CREATE_TOPIC",
            resource_type="TOPIC",
            resource_name=topic_request.name,
            message=f"Admin {username} created topic '{topic_request.name}' with {topic_request.num_partitions} partitions"
        )
        
        return result
    except TopicAlreadyExistsError as e:
        raise HTTPException(
            status_code=409,
            detail=str(e),
        )
    except KafkaAdminError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create topic: {str(e)}",
        )


@router.put("/{name}", response_model=TopicResponse)
async def alter_topic(
    name: str,
    topic_request: TopicAlterRequest,
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    """
    Alter topic configuration or increase partitions.
    
    - Admins: Topic is altered immediately
    - Normal users: A request is created for admin approval
    Note: Partition count can only be increased, not decreased.
    """
    from app.models.topic_request import TopicRequest
    from app.models.acl_request import RequestStatus
    
    username = user_info.get("username")
    is_admin_user = user_info.get("is_admin", False)

    # Validate partition count BEFORE doing anything (applies to both admins and non-admins)
    if topic_request.num_partitions is not None:
        try:
            current_topic = await kafka_admin_service.get_topic(name=name, cluster=cluster)
            if topic_request.num_partitions < current_topic.num_partitions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Cannot decrease partition count for topic '{name}'. "
                        f"Current partitions: {current_topic.num_partitions}, "
                        f"Requested: {topic_request.num_partitions}. "
                        f"Kafka only supports increasing the number of partitions."
                    ),
                )
        except HTTPException:
            raise
        except TopicNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch topic info: {str(e)}")

    # If not admin, create a request instead
    if not is_admin_user:
        request_config = {}
        # 1. Named shortcut fields
        if topic_request.retention_ms:
            request_config["retention.ms"] = str(topic_request.retention_ms)
        if topic_request.cleanup_policy:
            request_config["cleanup.policy"] = topic_request.cleanup_policy
        if topic_request.min_insync_replicas:
            request_config["min.insync.replicas"] = str(topic_request.min_insync_replicas)
        # 2. Arbitrary extra configs (named fields take priority)
        if topic_request.extra_configs:
            for k, v in topic_request.extra_configs.items():
                request_config.setdefault(k, v)

        # Prevent duplicate pending requests
        stmt = select(TopicRequest).where(
            TopicRequest.username == username,
            TopicRequest.operation == "ALTER",
            TopicRequest.topic_name == name,
            TopicRequest.cluster == cluster,
            TopicRequest.status == RequestStatus.PENDING
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Topic '{name}' already has a pending ALTER request (ID: {existing.id}) waiting for approval."
            )

        topic_req = TopicRequest(
            username=username,
            operation="ALTER",
            topic_name=name,
            num_partitions=topic_request.num_partitions,
            config=request_config,
            cluster=cluster,
            status=RequestStatus.PENDING
        )

        # Pre-validation using dry-run (validate_only)
        try:
            await kafka_admin_service.alter_topic(
                name=name,
                num_partitions=topic_request.num_partitions,
                config=request_config,
                cluster=cluster,
                validate_only=True
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Topic alter validation failed: {str(e)}"
            )

        db.add(topic_req)
        await db.commit()
        await db.refresh(topic_req)
        
        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="REQUEST_ALTER_TOPIC",
            resource_type="TOPIC",
            resource_name=name,
            message=f"User {username} requested alteration of topic '{name}'"
        )

        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail=f"Topic alter request submitted (ID: {topic_req.id}). Waiting for admin approval."
        )
    
    # Admin: Execute immediately
    try:
        config = {}
        # 1. Named shortcut fields
        if topic_request.retention_ms:
            config["retention.ms"] = str(topic_request.retention_ms)
        if topic_request.cleanup_policy:
            config["cleanup.policy"] = topic_request.cleanup_policy
        if topic_request.min_insync_replicas:
            config["min.insync.replicas"] = str(topic_request.min_insync_replicas)
        # 2. Arbitrary extra configs (named fields take priority)
        if topic_request.extra_configs:
            for k, v in topic_request.extra_configs.items():
                config.setdefault(k, v)

        result = await kafka_admin_service.alter_topic(
            name=name,
            num_partitions=topic_request.num_partitions,
            config=config,
            cluster=cluster,
        )

        # Log to audit table
        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="ALTER_TOPIC",
            resource_type="TOPIC",
            resource_name=name,
            message=f"Admin {username} altered topic '{name}'"
        )

        return result
    except TopicNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )
    except KafkaAdminError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to alter topic: {str(e)}",
        )


@router.delete("/{name}")
async def delete_topic(
    name: str,
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a topic.
    
    - Admins: Topic is deleted immediately
    - Normal users: A request is created for admin approval
    """
    from app.models.topic_request import TopicRequest
    from app.models.acl_request import RequestStatus
    
    username = user_info.get("username")
    is_admin_user = user_info.get("is_admin", False)
    
    # If not admin, create a request instead
    if not is_admin_user:
        # Prevent duplicate pending requests
        stmt = select(TopicRequest).where(
            TopicRequest.username == username,
            TopicRequest.operation == "DELETE",
            TopicRequest.topic_name == name,
            TopicRequest.cluster == cluster,
            TopicRequest.status == RequestStatus.PENDING
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Topic '{name}' already has a pending DELETE request (ID: {existing.id}) waiting for approval."
            )

        # Fetch current topic details to capture state at time of request
        try:
            topic_details = await kafka_admin_service.get_topic(name=name, cluster=cluster)
            num_partitions = topic_details.num_partitions
            replication_factor = topic_details.replication_factor
            config = topic_details.config
        except TopicNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Topic '{name}' not found. Cannot request deletion for a non-existent topic."
            )
        except Exception as e:
            # Fallback to name-only if metadata fetch fails, but log it
            num_partitions = None
            replication_factor = None
            config = None
            print(f"Warning: Failed to fetch metadata for topic '{name}' during DELETE request: {e}")

        topic_req = TopicRequest(
            username=username,
            operation="DELETE",
            topic_name=name,
            num_partitions=num_partitions,
            replication_factor=replication_factor,
            config=config,
            cluster=cluster,
            status=RequestStatus.PENDING
        )
        db.add(topic_req)
        await db.commit()
        await db.refresh(topic_req)
        
        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="REQUEST_DELETE_TOPIC",
            resource_type="TOPIC",
            resource_name=name,
            message=f"User {username} requested deletion of topic '{name}'"
        )

        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail=f"Topic deletion request submitted (ID: {topic_req.id}). Waiting for admin approval."
        )
    
    # Admin: Execute immediately
    try:
        await kafka_admin_service.delete_topic(
            name=name,
            cluster=cluster,
        )

        # Log to audit table
        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="DELETE_TOPIC",
            resource_type="TOPIC",
            resource_name=name,
            message=f"Admin {username} deleted topic '{name}'"
        )
        return {"message": f"Topic '{name}' deleted successfully"}
    except TopicNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )
    except KafkaAdminError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete topic: {str(e)}",
        )
