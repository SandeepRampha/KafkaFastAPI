import logging
import json
from typing import Any, Dict, Optional, Union
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.governance_request import GovernanceRequest, GovernanceStatus, GovernanceResourceType, GovernanceOperation
from app.models.system_setting import SystemSetting
from app.services.kafka_admin import kafka_admin_service
from app.core.exceptions import KafkaAdminError
from app.schemas.topics import TopicCreateRequest, TopicAlterRequest

logger = logging.getLogger(__name__)

class GovernanceService:
    """
    Business logic for the Governance Workflow (Request -> Approve -> Implement).
    Ensures Topics and ACLs follow an enterprise-grade lifecycle.
    """

    async def get_setting(self, db: AsyncSession, key: str, default: Any = None) -> Any:
        """Fetch a system setting from the database."""
        stmt = select(SystemSetting).where(SystemSetting.key == key)
        result = await db.execute(stmt)
        setting = result.scalars().first()
        if not setting:
            return default
        
        if setting.is_boolean:
            return setting.value.lower() == "true"
        return setting.value

    async def set_setting(self, db: AsyncSession, key: str, value: Any, username: str, is_boolean: bool = False):
        """Update or create a system setting."""
        val_str = str(value).lower() if is_boolean else str(value)
        
        stmt = select(SystemSetting).where(SystemSetting.key == key)
        result = await db.execute(stmt)
        setting = result.scalars().first()
        
        if setting:
            setting.value = val_str
            setting.updated_by = username
            setting.is_boolean = is_boolean
        else:
            setting = SystemSetting(
                key=key,
                value=val_str,
                is_boolean=is_boolean,
                updated_by=username
            )
            db.add(setting)
        
        await db.commit()
        await db.refresh(setting)
        return setting

    async def validate_request_payload(self, resource_type: GovernanceResourceType, operation: GovernanceOperation, payload: Dict[str, Any]):
        """
        Validate the JSON payload against resource-specific schemas.
        Ensures data integrity before the request is even saved.
        """
        try:
            if resource_type == GovernanceResourceType.TOPIC:
                if operation == GovernanceOperation.CREATE:
                    TopicCreateRequest(**payload)
                elif operation == GovernanceOperation.ALTER:
                    TopicAlterRequest(**payload)
                elif operation == GovernanceOperation.DELETE:
                    # DELETE payload can be minimal
                    pass
            
            elif resource_type == GovernanceResourceType.ACL:
                # Basic ACL validation
                required = ["resource_type", "resource_name", "principal", "operation", "permission_type"]
                for field in required:
                    if field not in payload:
                        raise ValueError(f"Missing required field for ACL: {field}")
            
            return True
        except Exception as e:
            logger.error(f"Payload validation failed: {e}")
            raise ValueError(f"Invalid payload for {resource_type}: {str(e)}")

    async def implement_request(self, db: AsyncSession, request: GovernanceRequest, executed_by: str) -> bool:
        """
        The critical phase: Executing the governance request on the Kafka Cluster.
        Supports Topics and ACLs.
        """
        try:
            payload = request.payload
            cluster = request.cluster_id or "default"
            
            if request.resource_type == GovernanceResourceType.TOPIC:
                # Use resource_name as the source of truth for the topic name
                topic_name = request.resource_name
                
                if request.operation == GovernanceOperation.CREATE:
                    # Build config dict from payload
                    config = payload.get("extra_configs", {})
                    if payload.get("retention_ms"): config["retention.ms"] = str(payload["retention_ms"])
                    if payload.get("cleanup_policy"): config["cleanup.policy"] = payload["cleanup_policy"]
                    if payload.get("min_insync_replicas"): config["min.insync.replicas"] = str(payload["min_insync_replicas"])
                    
                    await kafka_admin_service.create_topic(
                        name=topic_name,
                        num_partitions=payload.get("num_partitions", 1),
                        replication_factor=payload.get("replication_factor", 1),
                        config=config,
                        cluster=cluster
                    )
                
                elif request.operation == GovernanceOperation.ALTER:
                    # Build config dict from payload for Alter
                    config = payload.get("extra_configs", {})
                    if payload.get("retention_ms"): config["retention.ms"] = str(payload["retention_ms"])
                    if payload.get("cleanup_policy"): config["cleanup.policy"] = payload["cleanup_policy"]
                    if payload.get("min_insync_replicas"): config["min.insync.replicas"] = str(payload["min_insync_replicas"])
                    
                    await kafka_admin_service.alter_topic(
                        name=topic_name,
                        num_partitions=payload.get("num_partitions"),
                        config=config,
                        cluster=cluster
                    )
                
                elif request.operation == GovernanceOperation.DELETE:
                    await kafka_admin_service.delete_topic(
                        name=topic_name,
                        cluster=cluster
                    )

            elif request.resource_type == GovernanceResourceType.ACL:
                # Sanitize principal - remove all spaces (e.g., "User: sai" -> "User:sai")
                principal = payload["principal"].replace(" ", "") if payload.get("principal") else payload.get("principal")
                
                if request.operation == GovernanceOperation.CREATE:
                    await kafka_admin_service.create_acl(
                        resource_type=payload["resource_type"],
                        resource_name=payload["resource_name"],
                        principal=principal,
                        host=payload.get("host", "*"),
                        operation=payload["operation"], # This is the Kafka action (READ/WRITE)
                        permission_type=payload["permission_type"],
                        pattern_type=payload.get("pattern_type", "LITERAL"),
                        cluster=cluster
                    )
                elif request.operation == GovernanceOperation.DELETE:
                    await kafka_admin_service.delete_acl(
                        resource_type=payload["resource_type"],
                        resource_name=payload["resource_name"],
                        principal=principal,
                        host=payload.get("host", "*"),
                        operation=payload["operation"],
                        permission_type=payload["permission_type"],
                        pattern_type=payload.get("pattern_type", "LITERAL"),
                        cluster=cluster
                    )

            # Update request status on success
            request.status = GovernanceStatus.IMPLEMENTED
            request.implemented_by = executed_by
            request.error_message = None
            await db.commit()
            return True

        except Exception as e:
            logger.exception(f"Implementation failed for request {request.id}")
            request.status = GovernanceStatus.IMPLEMENTATION_FAILED
            request.error_message = str(e)
            await db.commit()
            return False

governance_service = GovernanceService()
