from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from app.models.acl_request import RequestStatus


class SchemaRequestResponse(BaseModel):
    id: int
    username: str
    operation: str
    subject: str
    schema_str: Optional[str] = None
    schema_type: Optional[str] = None
    references: Optional[List[Dict[str, Any]]] = None
    version: Optional[Union[int, str]] = None
    permanent: Optional[bool] = None
    compatibility: Optional[str] = None
    cluster: str = "default"
    status: RequestStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    admin_comment: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class SchemaRequestPaginatedResponse(BaseModel):
    items: List[SchemaRequestResponse]
    total_count: int
    page: int
    page_size: int
    pages: int
