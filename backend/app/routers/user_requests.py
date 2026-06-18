"""
User Requests Router - Unified view of all user requests

Provides a single endpoint to view all ACL and Topic requests for a user.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.acl_request import AclRequest
from app.models.topic_request import TopicRequest
from app.core.dependencies import verify_credentials, is_admin
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.acl_request import RequestStatus

router = APIRouter()


class UnifiedRequestResponse(BaseModel):
    """Unified response for both ACL and Topic requests"""
    id: int
    request_type: str  # "ACL" or "TOPIC"
    username: str
    operation: str
    resource_name: str  # topic_name or resource_name
    status: RequestStatus
    created_at: datetime
    updated_at: datetime | None
    approved_by: str | None
    
    # ACL-specific fields (optional)
    resource_type: str | None = None
    principal: str | None = None
    host: str | None = None
    permission_type: str | None = None
    
    # Topic-specific fields (optional)
    num_partitions: int | None = None
    replication_factor: int | None = None
    cluster: str | None = None
    
    model_config = ConfigDict(from_attributes=True)


@router.get("/my-requests", response_model=List[UnifiedRequestResponse])
async def list_my_requests(
    cluster: str | None = Query(None, description="Filter by cluster"),
    db: AsyncSession = Depends(get_db),
    user_info: Dict[str, Any] = Depends(verify_credentials)
):
    """
    List all requests (ACL + Topic) for the authenticated user.
    
    - Normal users see only their own requests
    - Admins see all requests
    """
    username = user_info.get("username")
    
    # Determine if user is admin
    admin = is_admin(username)
    
    # Query ACL requests
    query1 = select(AclRequest)
    if not admin:
        query1 = query1.where(AclRequest.username == username)
    if cluster:
        query1 = query1.where(AclRequest.cluster == cluster)
    result = await db.execute(query1)
    acl_requests = result.scalars().all()
    
    # Query Topic requests
    query2 = select(TopicRequest)
    if not admin:
        query2 = query2.where(TopicRequest.username == username)
    if cluster:
        query2 = query2.where(TopicRequest.cluster == cluster)
    result2 = await db.execute(query2)
    topic_requests = result2.scalars().all()
    
    # Convert to unified format
    unified_requests = []
    
    # Add ACL requests
    for acl_req in acl_requests:
        unified_requests.append(UnifiedRequestResponse(
            id=acl_req.id,
            request_type="ACL",
            username=acl_req.username,
            operation=acl_req.operation,
            resource_name=acl_req.resource_name,
            status=acl_req.status,
            created_at=acl_req.created_at,
            updated_at=acl_req.updated_at,
            approved_by=acl_req.approved_by,
            # ACL-specific
            resource_type=acl_req.resource_type,
            principal=acl_req.principal,
            host=acl_req.host,
            permission_type=acl_req.permission_type,
            # Topic-specific (None)
            num_partitions=None,
            replication_factor=None,
            cluster=None
        ))
    
    # Add Topic requests
    for topic_req in topic_requests:
        unified_requests.append(UnifiedRequestResponse(
            id=topic_req.id,
            request_type="TOPIC",
            username=topic_req.username,
            operation=topic_req.operation,
            resource_name=topic_req.topic_name,
            status=topic_req.status,
            created_at=topic_req.created_at,
            updated_at=topic_req.updated_at,
            approved_by=topic_req.approved_by,
            # ACL-specific (None)
            resource_type=None,
            principal=None,
            host=None,
            permission_type=None,
            # Topic-specific
            num_partitions=topic_req.num_partitions,
            replication_factor=topic_req.replication_factor,
            cluster=topic_req.cluster
        ))
    
    # Sort by created_at descending (newest first)
    unified_requests.sort(key=lambda x: x.created_at, reverse=True)
    
    return unified_requests
