import logging
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.admin_action import AuditLog

logger = logging.getLogger(__name__)

async def log_audit_event(
    db: AsyncSession,
    level: str,
    username: str,
    action: str,
    resource_type: Optional[str] = None,
    resource_name: Optional[str] = None,
    message: Optional[str] = None
):
    """
    Standardizes the logging of administrative actions to the audit_logs table.
    """
    try:
        # If message is a dict or list, it will be stored as JSON. 
        # If it's a string, we wrap it in a dict for consistency or store as is if JSON supports it.
        audit_entry = AuditLog(
            level=level,
            username=username,
            action=action,
            resource_type=resource_type,
            resource_name=resource_name,
            message=message
        )
        db.add(audit_entry)
        await db.commit()
        await db.refresh(audit_entry)
        
        logger.info(f"Audit Log: [{level}] {username} performed {action} on {resource_type}:{resource_name}")
        return audit_entry
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to write audit log: {str(e)}")
        # We don't raise here to avoid breaking the main operation if logging fails, 
        # but in strict environments, you might want to.
        return None
