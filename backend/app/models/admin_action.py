from sqlalchemy import Column, Integer, String, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.base import Base
from app.models.acl_request import RequestStatus

class AdminTopic(Base):
    __tablename__ = "admins_topics"

    id = Column(Integer, primary_key=True, index=True)
    admin_username = Column(String, index=True, nullable=False)
    topic_name = Column(String, nullable=False, index=True)
    num_partitions = Column(Integer, nullable=False)
    replication_factor = Column(Integer, nullable=False)
    config = Column(JSON, nullable=True)
    cluster = Column(String, nullable=False, default="default")
    operation = Column(String, nullable=False, default="CREATE")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AdminAcl(Base):
    __tablename__ = "admins_acls"

    id = Column(Integer, primary_key=True, index=True)
    admin_username = Column(String, index=True, nullable=False)
    resource_type = Column(String, nullable=False)
    resource_name = Column(String, nullable=False)
    pattern_type = Column(String, nullable=False, default="LITERAL")
    principal = Column(String, nullable=False)
    host = Column(String, nullable=False, default="*")
    operation = Column(String, nullable=False)
    permission_type = Column(String, nullable=False)
    cluster = Column(String, nullable=False, default="default")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    level = Column(String, nullable=False, index=True)  # INFO, WARN, ERROR
    username = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=True, index=True) # TOPIC, ACL, SCHEMA, REQUEST
    resource_name = Column(String, nullable=True, index=True)
    message = Column(String, nullable=True) # Human readable summary
