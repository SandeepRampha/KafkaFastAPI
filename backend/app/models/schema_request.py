from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from typing import Union
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.base import Base
from app.models.acl_request import RequestStatus  # Reuse the same enum


class SchemaRequest(Base):
    __tablename__ = "schema_requests"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, nullable=False)

    # Operation type: REGISTER_SCHEMA, DELETE_SUBJECT, DELETE_SCHEMA_VERSION, SET_COMPATIBILITY
    operation = Column(String, nullable=False)

    subject = Column(String, nullable=False, index=True)

    # For REGISTER_SCHEMA: the JSON string of the schema
    schema_str = Column(Text, nullable=True)
    schema_type = Column(String, nullable=True, default="AVRO")
    references = Column(JSON, nullable=True)
    topic = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    # For DELETE_SCHEMA_VERSION and compatibility-check
    version = Column(String, nullable=True)

    # For DELETE_SUBJECT / DELETE_SCHEMA_VERSION
    permanent = Column(Boolean, nullable=True, default=False)

    # For SET_COMPATIBILITY
    compatibility = Column(String, nullable=True)

    cluster = Column(String, nullable=False, default="default")
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    approved_by = Column(String, nullable=True)  # Admin username
    admin_comment = Column(String, nullable=True)  # Admin comment on approve/reject
