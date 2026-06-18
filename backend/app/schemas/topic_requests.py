from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, Generic, TypeVar, List
from datetime import datetime
from app.models.acl_request import RequestStatus

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""
    items: List[T] = Field(..., description="List of items for the current page")
    total_count: int = Field(..., description="Total number of items available")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    pages: int = Field(..., description="Total number of pages")

class TopicRequestCreate(BaseModel):
    """
    Schema for creating a topic request.
    """
    operation: str = Field(..., description="Operation type: CREATE, ALTER, or DELETE")
    topic_name: str = Field(..., description="Name of the topic")
    num_partitions: Optional[int] = Field(None, description="Number of partitions (required for CREATE)")
    replication_factor: Optional[int] = Field(None, description="Replication factor (required for CREATE)")
    retention_ms: Optional[int] = Field(None, description="Retention in milliseconds")
    cleanup_policy: Optional[str] = Field(None, description="Cleanup policy (delete/compact)")
    min_insync_replicas: Optional[int] = Field(None, description="Minimum in-sync replicas")
    extra_configs: Optional[Dict[str, Any]] = Field(None, description="Extra Kafka configurations")
    cluster: str = Field(default="default", description="Cluster identifier")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "operation": "CREATE",
                "topic_name": "customer-events",
                "num_partitions": 3,
                "replication_factor": 2,
                "cluster": "default"
            }
        }
    )

class TopicRequestResponse(BaseModel):
    id: int
    username: str
    operation: str
    topic_name: str
    num_partitions: Optional[int]
    replication_factor: Optional[int]
    config: Optional[Dict[str, Any]]
    cluster: str
    status: RequestStatus
    created_at: datetime
    updated_at: Optional[datetime]
    approved_by: Optional[str]
    admin_comment: Optional[str] = None
    existing_config: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class TopicRequestPaginatedResponse(PaginatedResponse[TopicRequestResponse]):
    """Paginated response for topic requests."""
    pass
