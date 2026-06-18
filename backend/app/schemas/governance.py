from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.governance_request import GovernanceStatus, GovernanceResourceType, GovernanceOperation

class GovernanceRequestCreate(BaseModel):
    """Schema for creating a new governance request"""
    resource_type: GovernanceResourceType
    resource_name: str
    operation: GovernanceOperation = GovernanceOperation.CREATE
    payload: Dict[str, Any]
    old_payload: Optional[Dict[str, Any]] = None
    cluster_id: str = "default"

class GovernanceRequestResponse(BaseModel):
    """Schema for returning governance request details"""
    id: UUID
    resource_type: GovernanceResourceType
    resource_name: str
    operation: GovernanceOperation
    payload: Dict[str, Any]
    old_payload: Optional[Dict[str, Any]] = None
    status: GovernanceStatus
    created_by: str
    approved_by: Optional[str] = None
    implemented_by: Optional[str] = None
    error_message: Optional[str] = None
    admin_comment: Optional[str] = None
    cluster_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class GovernanceRequestAction(BaseModel):
    """Schema for approving/rejecting a request"""
    admin_comment: Optional[str] = None

class SystemSettingResponse(BaseModel):
    """Schema for system settings"""
    key: str
    value: str
    is_boolean: bool
    description: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SystemSettingUpdate(BaseModel):
    """Schema for updating a system setting"""
    value: Any
    is_boolean: bool = False
    description: Optional[str] = None

class PaginatedGovernanceResponse(BaseModel):
    """Paginated response for governance requests"""
    items: List[GovernanceRequestResponse]
    total_count: int
    page: int
    page_size: int
    pages: int
