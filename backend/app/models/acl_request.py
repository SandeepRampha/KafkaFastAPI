from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class RequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class AclRequest(Base):
    __tablename__ = "acl_requests"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, nullable=False)
    operation = Column(String, nullable=False)  # GET, POST, DELETE (API Operation)
    kafka_operation = Column(String, nullable=True) # READ, WRITE, ALL, etc. (Kafka Operation)
    permission_type = Column(String, nullable=True) # ALLOW, DENY
    pattern_type = Column(String, nullable=True, default="LITERAL") # LITERAL, PREFIXED
    resource_type = Column(String, nullable=False) # TOPIC, etc.
    resource_name = Column(String, nullable=False)
    principal = Column(String, nullable=True) # User:alice
    host = Column(String, nullable=True, default="*")
    cluster = Column(String, nullable=False, default="default")
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    approved_by = Column(String, nullable=True) # Admin username
    admin_comment = Column(String, nullable=True) # Admin comment on approve/reject
    @property
    def request_type(self):
        if self.operation == "POST":
            return "Create ACL"
        elif self.operation == "DELETE":
            return "Delete ACL"
        return self.operation
