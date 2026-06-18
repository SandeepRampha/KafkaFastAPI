import asyncio
import logging
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.topic_request import TopicRequest
from app.models.acl_request import AclRequest
from app.models.governance_request import GovernanceRequest, GovernanceStatus, GovernanceResourceType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration")

async def migrate_data():
    async with SessionLocal() as db:
        logger.info("Starting Governance Data Migration...")
        
        # 1. Migrate Topic Requests
        topic_stmt = select(TopicRequest)
        result = await db.execute(topic_stmt)
        topic_requests = result.scalars().all()
        
        logger.info(f"Found {len(topic_requests)} legacy topic requests")
        
        for tr in topic_requests:
            # Check if already migrated (optional, but good for idempotency)
            # We'll just create new ones for now as it's a UUID primary key
            
            payload = {
                "operation": tr.operation,
                "name": tr.topic_name,
                "partitions": tr.num_partitions,
                "replication": tr.replication_factor,
                "config": tr.config
            }
            
            status_map = {
                "PENDING": GovernanceStatus.REQUESTED,
                "APPROVED": GovernanceStatus.APPROVED,
                "REJECTED": GovernanceStatus.REJECTED
            }
            
            gr = GovernanceRequest(
                resource_type=GovernanceResourceType.TOPIC,
                resource_name=tr.topic_name,
                payload=payload,
                status=status_map.get(tr.status.name, GovernanceStatus.REQUESTED),
                created_by=tr.username,
                approved_by=tr.approved_by,
                admin_comment=tr.admin_comment,
                created_at=tr.created_at,
                updated_at=tr.updated_at,
                cluster_id=tr.cluster
            )
            db.add(gr)
            
        # 2. Migrate ACL Requests
        acl_stmt = select(AclRequest)
        result = await db.execute(acl_stmt)
        acl_requests = result.scalars().all()
        
        logger.info(f"Found {len(acl_requests)} legacy ACL requests")
        
        for ar in acl_requests:
            payload = {
                "operation": ar.operation,
                "kafka_operation": ar.kafka_operation,
                "permission_type": ar.permission_type,
                "pattern_type": ar.pattern_type,
                "principal": ar.principal,
                "host": ar.host,
                "resource_type": ar.resource_type,
                "resource_name": ar.resource_name
            }
            
            gr = GovernanceRequest(
                resource_type=GovernanceResourceType.ACL,
                resource_name=ar.resource_name,
                payload=payload,
                status=status_map.get(ar.status.name, GovernanceStatus.REQUESTED),
                created_by=ar.username,
                approved_by=ar.approved_by,
                admin_comment=ar.admin_comment,
                created_at=ar.created_at,
                updated_at=ar.updated_at,
                cluster_id=ar.cluster
            )
            db.add(gr)
            
        await db.commit()
        logger.info("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(migrate_data())
