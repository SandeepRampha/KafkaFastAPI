"""
Pydantic Schemas for Schema Registry
"""

from enum import Enum
from typing import List, Optional, Any
from pydantic import BaseModel


class SchemaType(str, Enum):
    """Supported schema types"""
    AVRO = "AVRO"
    JSON = "JSON"
    PROTOBUF = "PROTOBUF"


class SchemaResponse(BaseModel):
    """Schema registration response"""
    subject: str
    schema_id: int
    version: Optional[int] = None
    schema_type: SchemaType


class SchemaVersionResponse(BaseModel):
    """Schema versions response"""
    subject: str
    versions: List[int]
    latest_version: Optional[int] = None
    schema_type: Optional[str] = "AVRO"


class CompatibilityCheckResponse(BaseModel):
    """Compatibility check response"""
    is_compatible: bool
    messages: List[str] = []


class SubjectMetadata(BaseModel):
    """Metadata for a single schema subject"""
    subject: str
    topic: Optional[str] = None
    schema_type: SchemaType
    latest_version: Optional[int]
    version_display: Optional[str] = None
    compatibility: Optional[str]


class SchemaVersionHistoryItem(BaseModel):
    """Represents a single version in the schema's history with audit info"""
    version: int
    schema_id: int
    schema_type: SchemaType
    schema_def: Optional[str] = None
    created_at: Optional[Any] = None
    username: Optional[str] = None
    approved_by: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = False
    is_soft_deleted: bool = False


class SubjectMetadataPaginatedResponse(BaseModel):
    """Paginated response for subject metadata"""
    items: List[SubjectMetadata]
    total_count: int
    page: int
    page_size: int
    pages: int

class AdminActionRequest(BaseModel):
    """Payload for admin approve/reject actions."""
    admin_comment: Optional[str] = None
