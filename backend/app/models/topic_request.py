from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, JSON
from sqlalchemy.sql import func
from app.db.base import Base
from app.models.acl_request import RequestStatus  # Reuse the same enum

class TopicRequest(Base):
    __tablename__ = "topic_requests"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, nullable=False)
    operation = Column(String, nullable=False)  # CREATE, ALTER, DELETE
    topic_name = Column(String, nullable=False, index=True)
    num_partitions = Column(Integer, nullable=True)  # For CREATE/ALTER
    replication_factor = Column(Integer, nullable=True)  # For CREATE only
    config = Column(JSON, nullable=True)  # Topic configuration as JSON
    cluster = Column(String, nullable=False, default="default")
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    approved_by = Column(String, nullable=True)  # Admin username
    admin_comment = Column(String, nullable=True)  # Admin comment on approve/reject
