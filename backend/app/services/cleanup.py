import logging
import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from app.db.session import SessionLocal
from app.models.acl_request import AclRequest, RequestStatus
from app.models.topic_request import TopicRequest

logger = logging.getLogger(__name__)

from sqlalchemy import or_

async def cleanup_old_requests(days_threshold: float = 7.0):
    """
    Deletes ACL and Topic requests based on a 7-day retention policy:
    - Pending requests: 7 days from creation.
    - Handled (Approved/Rejected) requests: 7 days from when they were handled.
    """
    async with SessionLocal() as db:
        try:
            threshold_date = datetime.utcnow() - timedelta(days=days_threshold)
            
            topic_stmt = delete(TopicRequest).where(
                or_(
                    (TopicRequest.status == RequestStatus.PENDING) & (TopicRequest.created_at < threshold_date),
                    (TopicRequest.status != RequestStatus.PENDING) & (TopicRequest.updated_at < threshold_date)
                )
            )
            result = await db.execute(topic_stmt)
            topic_deleted = result.rowcount
            
            acl_stmt = delete(AclRequest).where(
                or_(
                    (AclRequest.status == RequestStatus.PENDING) & (AclRequest.created_at < threshold_date),
                    (AclRequest.status != RequestStatus.PENDING) & (AclRequest.updated_at < threshold_date)
                )
            )
            result = await db.execute(acl_stmt)
            acl_deleted = result.rowcount
            
            await db.commit()
            
            if topic_deleted > 0 or acl_deleted > 0:
                logger.info(f"Cleanup completed: Deleted {topic_deleted} Topic requests and {acl_deleted} ACL requests (Retention: {days_threshold} days).")
            else:
                logger.info(f"Cleanup run: No records exceeding {days_threshold}-day threshold found.")
                
        except Exception as e:
            await db.rollback()
            logger.error(f"Error during database cleanup: {str(e)}")

async def run_periodic_cleanup(interval_hours: float = 12.0, days_threshold: float = 7.0):
    """
    Background loop that runs the cleanup task periodically.
    """
    logger.info(f"Starting periodic cleanup background task (Interval: {interval_hours}h, Threshold: {days_threshold}d)")
    while True:
        await cleanup_old_requests(days_threshold=days_threshold)
        # Wait for the next interval
        await asyncio.sleep(int(interval_hours * 3600))
