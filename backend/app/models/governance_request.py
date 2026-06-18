import enum
from uuid import uuid4
from sqlalchemy import Column, String, DateTime, JSON, Enum as SQLEnum, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base

class GovernanceResourceType(str, enum.Enum):
    TOPIC = "TOPIC"
    ACL = "ACL"

class GovernanceOperation(str, enum.Enum):
    CREATE = "CREATE"
    ALTER = "ALTER"
    DELETE = "DELETE"

class GovernanceStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    IMPLEMENTED = "IMPLEMENTED"
    REJECTED = "REJECTED"
    IMPLEMENTATION_FAILED = "IMPLEMENTATION_FAILED"

class GovernanceRequest(Base):
    """
    Unified Governance Request for Topics and ACLs.
    """
    __tablename__ = "governance_requests"

    # Use UUID for enterprise-grade identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    resource_type = Column(SQLEnum(GovernanceResourceType), nullable=False, index=True)
    resource_name = Column(String, nullable=False, index=True)
    
    # Operation details (New columns)
    operation = Column(SQLEnum(GovernanceOperation), nullable=False, default=GovernanceOperation.CREATE, index=True)
    
    # Store Topic/ACL config as structured JSON
    payload = Column(JSON, nullable=False) # Represents the requested state
    old_payload = Column(JSON, nullable=True) # Optional: state before change for diffs
    
    status = Column(SQLEnum(GovernanceStatus), default=GovernanceStatus.REQUESTED, nullable=False, index=True)
    
    # Traceability
    created_by = Column(String, nullable=False, index=True)
    approved_by = Column(String, nullable=True, index=True)
    implemented_by = Column(String, nullable=True, index=True) # Username or "SYSTEM"
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    admin_comment = Column(Text, nullable=True)
    
    # Context
    cluster_id = Column(String, nullable=False, default="default")
    
    # Audit timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
