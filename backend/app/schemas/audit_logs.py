from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict

class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    level: str
    username: str
    action: str
    resource_type: Optional[str] = None
    resource_name: Optional[str] = None
    message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
