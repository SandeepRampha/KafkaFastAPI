from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class SystemSetting(Base):
    """
    Dynamic system settings for the Kafka Manager application.
    Supports toggling Auto-Implementation and other runtime configurations.
    """
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False) # Store values as strings, convert in code
    is_boolean = Column(Boolean, default=False)
    
    description = Column(String, nullable=True)
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    updated_by = Column(String, nullable=True)
