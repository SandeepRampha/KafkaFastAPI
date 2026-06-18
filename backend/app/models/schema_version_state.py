from sqlalchemy import Column, Integer, String, DateTime, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from app.db.base import Base


class SchemaVersionState(Base):
    """
    Governance layer for schema version status.
    Tracks which version is "ACTIVE" and which are "SOFT_DELETED".
    """
    __tablename__ = "schema_version_states"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False, index=True)
    version = Column(Integer, nullable=False)
    cluster = Column(String, nullable=False, default="default")
    
    is_active = Column(Boolean, default=False, nullable=False)
    is_soft_deleted = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Ensure uniqueness per subject, version, and cluster
    __table_args__ = (
        UniqueConstraint('subject', 'version', 'cluster', name='_subject_version_cluster_uc'),
    )
