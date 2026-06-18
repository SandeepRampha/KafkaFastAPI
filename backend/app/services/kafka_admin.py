"""
Kafka Admin Service - Protocol-Agnostic Cluster Management

Handles all Kafka Admin Client operations:
- Topic management (create, alter, delete, describe)
- ACL management (create, delete, list)
- Cluster metadata retrieval

Supports multiple clusters and authentication protocols.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
import logging
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
from confluent_kafka.admin import (
    AdminClient,
    NewTopic,
    NewPartitions,
    ConfigResource,
    ResourceType as KafkaResourceType,
    AclBinding,
    AclBindingFilter,
    ResourcePatternType,
    AclOperation as KafkaAclOperation,
    AclPermissionType as KafkaAclPermissionType,
)

from app.core.config import settings, KafkaClusterConfig
from app.core.exceptions import (
    TopicNotFoundError,
    TopicAlreadyExistsError,
    KafkaAdminError,
    AclError,
)
from app.schemas.topics import TopicResponse, TopicDetailResponse
from app.schemas.acls import (
    AclResponse,
    ResourceType,
    PatternType,
    AclOperation,
    AclPermissionType,
)


# Thread pool for blocking Kafka operations
_executor = ThreadPoolExecutor(max_workers=settings.kafka_executor_workers)


class KafkaAdminService:
    """Service for managing Kafka clusters via Admin Client."""
    
    def __init__(self):
        self._clients: dict[str, AdminClient] = {}
        self._stats_cache: dict[str, dict] = {}
        self._cache_ttl = 30  # seconds
    
    def _prune_config(self, config: dict) -> dict:
        """
        Prune read-only or unsupported Confluent-specific configurations.
        These often cause INVALID_CONFIG errors on standard Kafka or during 
        state-based updates (metadata settings).
        """
        if not config:
            return {}
            
        # List of known read-only or internal Confluent config names that cause issues
        blacklisted_prefixes = [
            "confluent.",
            "message.format.version",
            "index.interval.bytes",
            "segment.index.bytes",
        ]
        
        pruned = {}
        for k, v in config.items():
            # Keep standard Kafka configs that are definitely writable
            # or skip any that match the blacklist prefixes
            if any(k.startswith(prefix) for prefix in blacklisted_prefixes):
                logger.debug(f"Pruning config parameter: {k}")
                continue
            pruned[k] = v
            
        return pruned
    
    def _get_client(self, cluster: str = "default") -> AdminClient:
        """Get or create an AdminClient for the specified cluster."""
        if cluster not in self._clients:
            cluster_config = settings.get_cluster(cluster)
            self._clients[cluster] = AdminClient(cluster_config.to_kafka_config())
        return self._clients[cluster]
    
    async def _run_in_executor(self, func, *args, **kwargs):
        """Run a blocking function in a thread pool."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_executor, lambda: func(*args, **kwargs))
    
    # ==================== TOPIC OPERATIONS ====================
    
    async def list_topics(
        self,
        cluster: str = "default",
        include_internal: bool = False,
    ) -> list[str]:
        """List all topics in the cluster."""
        client = self._get_client(cluster)
        
        def _list():
            metadata = client.list_topics(timeout=10)
            topics = list(metadata.topics.keys())
            if not include_internal:
                topics = [t for t in topics if not t.startswith("_")]
            return sorted(topics)
        
        return await self._run_in_executor(_list)
    
    async def get_topic(
        self,
        name: str,
        cluster: str = "default",
    ) -> TopicDetailResponse:
        """Get detailed information about a topic."""
        client = self._get_client(cluster)
        
        def _get():
            metadata = client.list_topics(topic=name, timeout=10)
            
            if name not in metadata.topics:
                raise TopicNotFoundError(f"Topic '{name}' not found")
            
            topic_metadata = metadata.topics[name]
            partitions = [
                {
                    "id": p.id,
                    "leader": p.leader,
                    "replicas": list(p.replicas),
                    "isrs": list(p.isrs),
                }
                for p in topic_metadata.partitions.values()
            ]
            
            # Get topic configuration
            resource = ConfigResource(KafkaResourceType.TOPIC, name)
            futures = client.describe_configs([resource])
            config = {}
            for res, future in futures.items():
                try:
                    conf = future.result()
                    config = {k: v.value for k, v in conf.items()}
                except Exception:
                    pass
            
            return TopicDetailResponse(
                name=name,
                num_partitions=len(partitions),
                replication_factor=len(partitions[0]["replicas"]) if partitions else 1,
                cleanup_policy=config.get("cleanup.policy", "delete"),
                partitions=partitions,
                config=config,
            )
        
        return await self._run_in_executor(_get)

    async def describe_topics_metadata(
        self,
        cluster: str = "default",
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
    ) -> dict:
        """Get detailed metadata for topics with pagination."""
        client = self._get_client(cluster)
        
        def _describe():
            # Get metadata for all topics
            metadata = client.list_topics(timeout=10)
            all_topics_meta = metadata.topics
            
            # 1. Filter out internal topics
            topic_names = [
                n for n in all_topics_meta.keys() 
                if not n.startswith("_")
            ]
            
            # 2. Search filter
            if search:
                topic_names = [
                    n for n in topic_names 
                    if search.lower() in n.lower()
                ]
            
            # Sort topic names
            topic_names.sort()
            
            # 3. Calculate pagination
            total_count = len(topic_names)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            
            # Slice current page topics
            page_topics = topic_names[start_idx:end_idx]
            
            # Prepare config resources ONLY for topics on the current page
            resources = [
                ConfigResource(KafkaResourceType.TOPIC, n) 
                for n in page_topics
            ]
            
            # Fetch configs in batch
            topic_configs = {}
            if resources:
                futures = client.describe_configs(resources)
                for res, future in futures.items():
                    try:
                        conf = future.result()
                        topic_configs[res.name] = {k: v.value for k, v in conf.items()}
                    except Exception:
                        topic_configs[res.name] = {}
            
            results = []
            for n in page_topics:
                topic_meta = all_topics_meta[n]
                partitions = [
                    {
                        "id": p.id,
                        "leader": p.leader,
                        "replicas": list(p.replicas),
                        "isrs": list(p.isrs),
                    }
                    for p in topic_meta.partitions.values()
                ]
                
                results.append({
                    "name": n,
                    "num_partitions": len(partitions),
                    "replication_factor": len(partitions[0]["replicas"]) if partitions else 1,
                    "cleanup_policy": topic_configs.get(n, {}).get("cleanup.policy", "delete"),
                    "partitions": partitions,
                    "config": topic_configs.get(n, {}),
                })
            
            total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 0

            return {
                "items": results,
                "total_count": total_count,
                "page": page,
                "page_size": page_size,
                "pages": total_pages
            }
        
        return await self._run_in_executor(_describe)
    
    async def create_topic(
        self,
        name: str,
        num_partitions: int = 1,
        replication_factor: int = 1,
        config: Optional[dict] = None,
        cluster: str = "default",
        validate_only: bool = False,
    ) -> TopicResponse:
        """Create a new topic."""
        client = self._get_client(cluster)
        
        def _create():
            new_topic = NewTopic(
                name,
                num_partitions=num_partitions,
                replication_factor=replication_factor,
                config=self._prune_config(config or {}),
            )
            
            futures = client.create_topics([new_topic], validate_only=validate_only)
            
            for topic, future in futures.items():
                try:
                    future.result()
                except Exception as e:
                    if "already exists" in str(e).lower():
                        raise TopicAlreadyExistsError(f"Topic '{name}' already exists")
                    # Include more details from the exception and potential config issues
                    error_detail = str(e)
                    if "Invalid config" in error_detail or "Unknown config" in error_detail:
                         raise KafkaAdminError(f"Kafka configuration error for topic '{name}': {error_detail}")
                    raise KafkaAdminError(f"Failed to create topic '{name}': {error_detail}")
            
            return TopicResponse(
                name=name,
                num_partitions=num_partitions,
                replication_factor=replication_factor,
                message=f"Topic '{name}' created successfully",
            )
        
        return await self._run_in_executor(_create)
    
    async def alter_topic(
        self,
        name: str,
        num_partitions: Optional[int] = None,
        config: Optional[dict] = None,
        cluster: str = "default",
        validate_only: bool = False,
    ) -> TopicResponse:
        """Alter topic configuration, partitions, or replication factor."""
        client = self._get_client(cluster)
        
        def _alter():
            # Check topic exists
            metadata = client.list_topics(topic=name, timeout=10)
            if name not in metadata.topics:
                raise TopicNotFoundError(f"Topic '{name}' not found")
            
            topic_metadata = metadata.topics[name]
            current_partitions_count = len(topic_metadata.partitions)
            
            # 1. Handle Partition Change
            if num_partitions is not None:
                if num_partitions < current_partitions_count:
                    raise KafkaAdminError(
                        f"Cannot decrease partition count for topic '{name}'. "
                        f"Current partitions: {current_partitions_count}, "
                        f"Requested: {num_partitions}. "
                        f"Kafka does not support decreasing the number of partitions."
                    )
                elif num_partitions == current_partitions_count:
                    pass  # No change needed, skip partition update
            if num_partitions and num_partitions > current_partitions_count:
                new_parts = NewPartitions(name, num_partitions)
                futures = client.create_partitions([new_parts])
                for topic, future in futures.items():
                    try:
                        future.result()
                    except Exception as e:
                        raise KafkaAdminError(f"Failed to alter partitions for topic '{name}': {e}")

            # 2. Update Configuration (e.g., cleanup.policy, retention.ms)
            if config:
                pruned_config = self._prune_config(config)
                if pruned_config:
                    resource = ConfigResource(KafkaResourceType.TOPIC, name, pruned_config)
                    futures = client.alter_configs([resource], validate_only=validate_only)
                    for res, future in futures.items():
                        try:
                            future.result()
                        except Exception as e:
                            error_detail = str(e)
                            if "Invalid config" in error_detail or "Unknown config" in error_detail:
                                raise KafkaAdminError(f"Invalid configuration for topic '{name}': {error_detail}")
                            raise KafkaAdminError(f"Failed to alter config for topic '{name}': {error_detail}")
            
            return TopicResponse(
                name=name,
                num_partitions=num_partitions or current_partitions_count,
                replication_factor=len(topic_metadata.partitions[0].replicas),
                message=f"Topic '{name}' altered successfully",
            )
        
        return await self._run_in_executor(_alter)
    
    async def delete_topic(
        self,
        name: str,
        cluster: str = "default",
    ) -> None:
        """Delete a topic."""
        client = self._get_client(cluster)
        
        def _delete():
            futures = client.delete_topics([name])
            
            for topic, future in futures.items():
                try:
                    future.result()
                except Exception as e:
                    if "does not exist" in str(e).lower():
                        raise TopicNotFoundError(f"Topic '{name}' not found")
                    raise KafkaAdminError(f"Failed to delete topic: {e}")
        
        await self._run_in_executor(_delete)
    
    # ==================== ACL OPERATIONS ====================
    
    def _map_resource_type(self, resource_type: ResourceType) -> KafkaResourceType:
        """Map API resource type to Kafka resource type."""
        mapping = {
            ResourceType.TOPIC: KafkaResourceType.TOPIC,
            ResourceType.GROUP: KafkaResourceType.GROUP,
            ResourceType.CLUSTER: KafkaResourceType.BROKER,
        }
        return mapping.get(resource_type, KafkaResourceType.TOPIC)
    
    def _map_pattern_type(self, pattern_type: PatternType) -> ResourcePatternType:
        """Map API pattern type to Kafka pattern type."""
        mapping = {
            PatternType.LITERAL: ResourcePatternType.LITERAL,
            PatternType.PREFIXED: ResourcePatternType.PREFIXED,
            PatternType.ANY: ResourcePatternType.ANY,
            PatternType.MATCH: ResourcePatternType.MATCH,
        }
        return mapping.get(pattern_type, ResourcePatternType.LITERAL)
    
    def _map_operation(self, operation: AclOperation) -> KafkaAclOperation:
        """Map API operation to Kafka ACL operation."""
        mapping = {
            AclOperation.ALL: KafkaAclOperation.ALL,
            AclOperation.READ: KafkaAclOperation.READ,
            AclOperation.WRITE: KafkaAclOperation.WRITE,
            AclOperation.CREATE: KafkaAclOperation.CREATE,
            AclOperation.DELETE: KafkaAclOperation.DELETE,
            AclOperation.ALTER: KafkaAclOperation.ALTER,
            AclOperation.DESCRIBE: KafkaAclOperation.DESCRIBE,
            AclOperation.CLUSTER_ACTION: KafkaAclOperation.CLUSTER_ACTION,
            AclOperation.DESCRIBE_CONFIGS: KafkaAclOperation.DESCRIBE_CONFIGS,
            AclOperation.ALTER_CONFIGS: KafkaAclOperation.ALTER_CONFIGS,
            AclOperation.IDEMPOTENT_WRITE: KafkaAclOperation.IDEMPOTENT_WRITE,
        }
        return mapping.get(operation, KafkaAclOperation.ALL)
    
    def _map_permission_type(self, permission_type: AclPermissionType) -> KafkaAclPermissionType:
        """Map API permission type to Kafka permission type."""
        mapping = {
            AclPermissionType.ALLOW: KafkaAclPermissionType.ALLOW,
            AclPermissionType.DENY: KafkaAclPermissionType.DENY,
        }
        return mapping.get(permission_type, KafkaAclPermissionType.ALLOW)
    


    async def list_acls(
        self,
        cluster: str = "default",
        resource_type: Optional[ResourceType] = None,
        resource_name: Optional[str] = None,
        principal: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
    ) -> dict:
        """List ACLs with optional filters and pagination."""
        client = self._get_client(cluster)
        
        def _list():
            # Create filter for initial fetch
            filter_binding = AclBindingFilter(
                restype=self._map_resource_type(resource_type) if resource_type else KafkaResourceType.ANY,
                name=resource_name,
                resource_pattern_type=ResourcePatternType.ANY,
                principal=principal,
                host=None,
                operation=KafkaAclOperation.ANY,
                permission_type=KafkaAclPermissionType.ANY,
            )
            
            futures = client.describe_acls(filter_binding)
            
            try:
                acl_bindings = futures.result()
                
                # Convert to response objects
                all_acls = [
                    AclResponse(
                        resource_type=ResourceType.CLUSTER if acl.restype.name == "BROKER" else ResourceType(acl.restype.name),
                        resource_name=acl.name,
                        pattern_type=PatternType(acl.resource_pattern_type.name),
                        principal=acl.principal,
                        host=acl.host,
                        operation=AclOperation(acl.operation.name),
                        permission_type=AclPermissionType(acl.permission_type.name),
                    )
                    for acl in acl_bindings
                ]
                
                # 1. Search filter
                if search:
                    search_lower = search.lower()
                    all_acls = [
                        acl for acl in all_acls
                        if search_lower in acl.resource_name.lower() or 
                           search_lower in acl.principal.lower()
                    ]
                
                # 2. Calculate pagination
                total_count = len(all_acls)
                start_idx = (page - 1) * page_size
                end_idx = start_idx + page_size
                
                # Slice current page
                page_items = all_acls[start_idx:end_idx]
                total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 0

                return {
                    "items": page_items,
                    "total_count": total_count,
                    "page": page,
                    "page_size": page_size,
                    "pages": total_pages
                }
            except Exception as e:
                raise AclError(f"Failed to list ACLs: {e}")
        
        return await self._run_in_executor(_list)
    
    async def create_acl(
        self,
        resource_type: ResourceType,
        resource_name: str,
        pattern_type: PatternType,
        principal: str,
        host: str,
        operation: AclOperation,
        permission_type: AclPermissionType,
        cluster: str = "default",
    ) -> AclResponse:
        """Create an ACL binding."""
        client = self._get_client(cluster)
        
        def _create():
            acl_binding = AclBinding(
                restype=self._map_resource_type(resource_type),
                name=resource_name,
                resource_pattern_type=self._map_pattern_type(pattern_type),
                principal=principal,
                host=host,
                operation=self._map_operation(operation),
                permission_type=self._map_permission_type(permission_type),
            )
            
            futures = client.create_acls([acl_binding])
            
            for acl, future in futures.items():
                try:
                    future.result()
                except Exception as e:
                    raise AclError(f"Failed to create ACL: {e}")
            
            return AclResponse(
                resource_type=resource_type,
                resource_name=resource_name,
                pattern_type=pattern_type,
                principal=principal,
                host=host,
                operation=operation,
                permission_type=permission_type,
            )
        
        return await self._run_in_executor(_create)
    
    async def delete_acl(
        self,
        resource_type: ResourceType,
        resource_name: str,
        pattern_type: PatternType,
        principal: str,
        host: str,
        operation: AclOperation,
        permission_type: AclPermissionType,
        cluster: str = "default",
    ) -> None:
        """Delete an ACL binding."""
        client = self._get_client(cluster)
        
        def _delete():
            acl_filter = AclBindingFilter(
                restype=self._map_resource_type(resource_type),
                name=resource_name,
                resource_pattern_type=self._map_pattern_type(pattern_type),
                principal=principal,
                host=host,
                operation=self._map_operation(operation),
                permission_type=self._map_permission_type(permission_type),
            )
            
            futures = client.delete_acls([acl_filter])
            
            for acl, future in futures.items():
                try:
                    future.result()
                except Exception as e:
                    raise AclError(f"Failed to delete ACL: {e}")
        
        await self._run_in_executor(_delete)



    async def get_dashboard_stats(self, cluster: str = "default") -> dict:
        """Get aggregated dashboard statistics with TTL caching."""
        now = time.time()
        
        # Check cache
        if cluster in self._stats_cache:
            cache_data, timestamp = self._stats_cache[cluster]
            if now - timestamp < self._cache_ttl:
                logger.debug(f"Returning cached dashboard stats for cluster: {cluster}")
                return cache_data

        client = self._get_client(cluster)

        def _get_stats():
            try:
                # 1. Measure Connection Latency and Fetch Cluster Metadata
                start_time = time.time()
                metadata = client.list_topics(timeout=10)
                connection_latency_ms = (time.time() - start_time) * 1000

                cluster_id = metadata.cluster_id
                controller_id = int(metadata.controller_id) if metadata.controller_id != -1 else None
                active_brokers = metadata.brokers
                
                # 2. Derive Version/Mode from Controller Configs
                confluent_version = None
                mode = None
                if controller_id is not None:
                    try:
                        res = ConfigResource(KafkaResourceType.BROKER, str(controller_id))
                        futures = client.describe_configs([res])
                        configs = futures[res].result()
                        
                        if "inter.broker.protocol.version" in configs:
                            version_val = configs["inter.broker.protocol.version"].value
                            if version_val:
                                cp_mapping = {
                                    "3.9": "7.9",
                                    "3.8": "7.8",
                                    "3.7": "7.6/7.7",
                                    "3.6": "7.5",
                                    "3.5": "7.4",
                                    "3.4": "7.3",
                                    "3.3": "7.2",
                                    "3.2": "7.1",
                                    "3.1": "7.0",
                                    "3.0": "7.0",
                                    "2.8": "6.2",
                                }
                                cp_ver = "Unknown CP"
                                for k_ver, c_ver in cp_mapping.items():
                                    if version_val.startswith(k_ver):
                                        cp_ver = c_ver
                                        break
                                        
                                # If mapping failed, try to find confluent.version directly
                                if cp_ver == "Unknown CP" and "confluent.version" in configs:
                                    cp_ver = configs["confluent.version"].value or cp_ver

                                confluent_version = f"Confluent {cp_ver} (Kafka {version_val})"
                        
                        if "process.roles" in configs and configs["process.roles"].value:
                            mode = "KRaft"
                        elif "zookeeper.connect" in configs and configs["zookeeper.connect"].value:
                            mode = "ZooKeeper"
                    except Exception:
                        pass

                # 3. Calculate Partition and Broker Stats
                topics = [t for t in metadata.topics.keys() if not t.startswith("_")]
                topics_count = len(topics)
                
                total_broker_ids = set(active_brokers.keys())
                online_brokers_count = len(active_brokers)
                broker_hosts = [f"{b.host}:{b.port}" for b in active_brokers.values()]
                
                total_partitions = 0
                total_replicas = 0
                under_replicated = 0
                offline_partitions = 0
                
                for topic_name, topic_meta in metadata.topics.items():
                    for p in topic_meta.partitions.values():
                        total_partitions += 1
                        total_replicas += len(p.replicas)
                        # Track all broker IDs mentioned in replicas to find "total" brokers
                        for r_id in p.replicas:
                            total_broker_ids.add(r_id)
                            
                        if p.leader == -1:
                            offline_partitions += 1
                        if len(p.isrs) < len(p.replicas):
                            under_replicated += 1

                total_brokers_count = len(total_broker_ids)
                offline_brokers_count = total_brokers_count - online_brokers_count

                # 4. Fetch ACLs Count
                try:
                    acl_binding = AclBindingFilter(
                        restype=KafkaResourceType.ANY,
                        name=None,
                        resource_pattern_type=ResourcePatternType.ANY,
                        principal=None,
                        host=None,
                        operation=KafkaAclOperation.ANY,
                        permission_type=KafkaAclPermissionType.ANY,
                    )
                    acls_future = client.describe_acls(acl_binding)
                    acls_count = len(acls_future.result())
                except Exception:
                    acls_count = 0

                # 5. Fetch Schema Registry Stats (Synchronously here, but calling the async service)
                # Since we are in an executor (thread), we can use a new loop or just call it if it was sync.
                # But our schema_registry_service is async. We'll use a trick or fetch it outside.
                # Actually, the easiest is to fetch SR stats in the main health_check route.
                # However, for consistency, let's keep this dict structure.
                sr_stats = None # Will be filled in main.py

                # 6. Determine Cluster State
                state = "Healthy"
                if offline_partitions > 0 or offline_brokers_count > 0 or controller_id is None:
                    state = "Unhealthy"
                elif under_replicated > 0:
                    state = "Degraded"

                stats_result = {
                    "cluster_state": state,
                    "topics_count": topics_count,
                    "acls_count": acls_count,
                    "cluster_overview": {
                        "cluster_name": "Default Cluster" if cluster == "default" else cluster,
                        "cluster_id": cluster_id,
                        "confluent_version": confluent_version or "Unknown Confluent Version",
                        "mode": mode or "Unknown",
                        "state": state,
                        "connection_latency_ms": round(connection_latency_ms, 2),
                        "last_metadata_refresh": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                    },
                    "broker_status": {
                        "total_brokers": total_brokers_count,
                        "online_brokers": online_brokers_count,
                        "offline_brokers": offline_brokers_count,
                        "total_partitions": total_partitions,
                        "total_replicas": total_replicas,
                        "under_replicated_partitions": under_replicated,
                        "offline_partitions": offline_partitions,
                        "controller_id": controller_id,
                        "broker_hosts": broker_hosts,
                    },
                    "controller_health": {
                        "active_controller_id": controller_id,
                        "is_active": controller_id is not None,
                    },
                    "schema_registry": sr_stats
                }
                return stats_result
            except Exception as e:
                raise e

        # Run in executor and update cache
        try:
            result = await self._run_in_executor(_get_stats)
            self._stats_cache[cluster] = (result, now)
            return result
        except Exception as e:
            # If we have stale cache, return it instead of failing completely during a metadata flood
            if cluster in self._stats_cache:
                cache_data, timestamp = self._stats_cache[cluster]
                logger.warning(
                    f"Failed to refresh dashboard stats for {cluster} (Error: {e}). "
                    f"Returning stale cache from {datetime.fromtimestamp(timestamp, timezone.utc)}."
                )
                return cache_data
            raise e



# Singleton instance
kafka_admin_service = KafkaAdminService()
