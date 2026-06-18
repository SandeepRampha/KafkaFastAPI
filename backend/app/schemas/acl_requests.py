from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Generic, TypeVar, List
from datetime import datetime
from enum import Enum
from app.schemas.acls import ResourceType, AclOperation

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""
    items: List[T] = Field(..., description="List of items for the current page")
    total_count: int = Field(..., description="Total number of items available")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    pages: int = Field(..., description="Total number of pages")

class RequestStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class ApiOperation(str, Enum):
    GET = "GET"
    POST = "POST"
    DELETE = "DELETE"

class AclRequestBase(BaseModel):
    operation: ApiOperation
    kafka_operation: Optional[str] = None
    permission_type: Optional[str] = None
    pattern_type: Optional[str] = "LITERAL"
    resource_type: ResourceType
    resource_name: str
    principal: Optional[str] = None
    host: Optional[str] = "*"
    cluster: str = "default"

class AclRequestCreate(AclRequestBase):
    pass

class AclRequestUpdate(BaseModel):
    status: RequestStatus

class AclRequestResponse(BaseModel):
    id: int
    username: str
    status: RequestStatus
    created_at: datetime
    approved_by: Optional[str] = None
    admin_comment: Optional[str] = None
    
    # Flattened fields from AclRequestBase, excluding 'operation'
    kafka_operation: Optional[str] = None
    permission_type: Optional[str] = None
    pattern_type: Optional[str] = "LITERAL"
    resource_type: ResourceType
    resource_name: str
    principal: Optional[str] = None
    host: Optional[str] = "*"
    cluster: str = "default"
    
    # New field computed from property
    request_type: str

    model_config = ConfigDict(from_attributes=True)


class AclRequestPaginatedResponse(PaginatedResponse[AclRequestResponse]):
    """Paginated response for ACL requests."""
    pass
