"""
Topic Schemas - Pydantic models for Kafka topic operations
"""

from typing import Optional, Dict
from pydantic import BaseModel, Field, ConfigDict
from typing import Generic, TypeVar, List

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""
    items: List[T] = Field(..., description="List of items for the current page")
    total_count: int = Field(..., description="Total number of items available")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    pages: int = Field(..., description="Total number of pages")

class TopicResponse(BaseModel):
    """Response model for topic operations."""
    name: str = Field(..., description="Topic name")
    num_partitions: int = Field(..., description="Number of partitions")
    replication_factor: int = Field(..., description="Replication factor")
    message: Optional[str] = Field(None, description="Operation result message")


class TopicDetailResponse(BaseModel):
    """Detailed topic information including partitions and configuration."""
    name: str = Field(..., description="Topic name")
    topic_id: Optional[str] = Field(None, description="Topic ID")
    is_internal: bool = Field(False, description="Is internal topic")
    num_partitions: int = Field(..., description="Number of partitions")
    replication_factor: int = Field(..., description="Replication factor")
    cleanup_policy: str = Field("delete", description="Cleanup policy")
    partitions: list[dict] = Field(default_factory=list, description="Partition details")
    config: dict[str, Optional[str]] = Field(default_factory=dict, description="Full topic configuration")


class TopicMetadataPaginatedResponse(PaginatedResponse[TopicDetailResponse]):
    """Paginated response for topic metadata."""
    pass


class TopicCreateRequest(BaseModel):
    """Request schema for creating a topic"""
    name: str = Field(..., description="Topic name")
    num_partitions: int = Field(1, description="Number of partitions", gt=0)
    replication_factor: int = Field(1, description="Replication factor", gt=0)
    retention_ms: Optional[int] = Field(None, description="Retention in milliseconds", gt=0)
    cleanup_policy: Optional[str] = Field(None, description="Cleanup policy (delete/compact)")
    min_insync_replicas: Optional[int] = Field(None, description="Minimum in-sync replicas", gt=0)
    extra_configs: Optional[Dict[str, str]] = Field(
        None,
        description=(
            "Any additional Kafka topic configs as key-value pairs. "
            "These are merged with the named fields above. "
            'Example: {"max.message.bytes": "1000000", "compression.type": "gzip"}'
        ),
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "customer-events",
                "num_partitions": 3,
                "replication_factor": 2,
                "retention_ms": 604800000,
                "cleanup_policy": "delete",
                "min_insync_replicas": 2,
                "extra_configs": {
                    "confluent.value.schema.validation": "false",
                    "leader.replication.throttled.replicas": "",
                    "confluent.stray.log.max.deletions.per.run": "72",
                    "message.downconversion.enable": "true",
                    "confluent.stray.log.delete.delay.ms": "604800000",
                    "confluent.tier.cleaner.enable": "false",
                    "local.retention.ms": "-2",
                    "confluent.compacted.topic.prefer.tier.fetch.ms": "-1",
                    "confluent.log.cleaner.timestamp.validation.enable": "true",
                    "compression.lz4.level": "9",
                    "confluent.value.subject.name.strategy": "io.confluent.kafka.serializers.subject.TopicNameStrategy",
                    "segment.bytes": "1073741824",
                    "confluent.tier.enable": "false",
                    "confluent.tier.segment.hotset.roll.min.bytes": "104857600",
                    "message.format.version": "3.0-IV1",
                    "confluent.min.segment.ms": "1",
                    "max.compaction.lag.ms": "9223372036854775807",
                    "file.delete.delay.ms": "60000",
                    "confluent.tier.cleaner.dual.compaction": "false",
                    "message.timestamp.type": "CreateTime",
                    "local.retention.bytes": "-2",
                    "preallocate": "false",
                    "confluent.placement.constraints": "",
                    "min.cleanable.dirty.ratio": "0.5",
                    "index.interval.bytes": "4096",
                    "delete.retention.ms": "86400000",
                    "message.timestamp.after.max.ms": "9223372036854775807",
                    "confluent.tier.cleaner.min.cleanable.ratio": "0.75",
                    "confluent.prefer.tier.fetch.ms": "-1",
                    "message.timestamp.before.max.ms": "9223372036854775807",
                    "confluent.max.segment.ms": "9223372036854775807",
                    "segment.index.bytes": "10485760",
                    "compression.type": "gzip",
                    "confluent.tier.cleaner.compact.min.efficiency": "0.5",
                    "remote.storage.enable": "false",
                    "confluent.key.subject.name.strategy": "io.confluent.kafka.serializers.subject.TopicNameStrategy",
                    "segment.jitter.ms": "0",
                    "flush.ms": "9223372036854775807",
                    "confluent.tier.local.hotset.ms": "86400000",
                    "follower.replication.throttled.replicas": "",
                    "confluent.tier.local.hotset.bytes": "-1",
                    "compression.gzip.level": "-1",
                    "flush.messages": "9223372036854775807",
                    "compression.zstd.level": "3",
                    "confluent.segment.speculative.prefetch.enable": "false",
                    "confluent.tier.cleaner.compact.segment.min.bytes": "20971520",
                    "confluent.cluster.link.allow.legacy.message.format": "false",
                    "max.message.bytes": "1000000",
                    "min.compaction.lag.ms": "0",
                    "unclean.leader.election.enable": "false",
                    "retention.bytes": "-1",
                    "confluent.key.schema.validation": "false",
                    "segment.ms": "3600000",
                    "confluent.system.time.roll.enable": "false",
                    "message.timestamp.difference.max.ms": "9223372036854775807"
                }
            }
        }
    )


class TopicAlterRequest(BaseModel):
    """Request schema for altering a topic"""
    num_partitions: Optional[int] = Field(None, description="New number of partitions (can only increase)", gt=0)
    retention_ms: Optional[int] = Field(None, description="Retention in milliseconds", gt=0)
    cleanup_policy: Optional[str] = Field(None, description="Cleanup policy (delete/compact)")
    min_insync_replicas: Optional[int] = Field(None, description="Minimum in-sync replicas", gt=0)
    extra_configs: Optional[Dict[str, str]] = Field(
        None,
        description=(
            "Any additional Kafka topic configs as key-value pairs. "
            "These are merged with the named fields above. "
            'Example: {"max.message.bytes": "1000000", "compression.type": "gzip"}'
        ),
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "num_partitions": 3,
                "retention_ms": 604800000,
                "cleanup_policy": "delete",
                "min_insync_replicas": 2,
                "extra_configs": {
                    "confluent.value.schema.validation": "false",
                    "leader.replication.throttled.replicas": "",
                    "confluent.stray.log.max.deletions.per.run": "72",
                    "message.downconversion.enable": "true",
                    "confluent.stray.log.delete.delay.ms": "604800000",
                    "confluent.tier.cleaner.enable": "false",
                    "local.retention.ms": "-2",
                    "confluent.compacted.topic.prefer.tier.fetch.ms": "-1",
                    "confluent.log.cleaner.timestamp.validation.enable": "true",
                    "compression.lz4.level": "9",
                    "confluent.value.subject.name.strategy": "io.confluent.kafka.serializers.subject.TopicNameStrategy",
                    "segment.bytes": "1073741824",
                    "confluent.tier.enable": "false",
                    "confluent.tier.segment.hotset.roll.min.bytes": "104857600",
                    "message.format.version": "3.0-IV1",
                    "confluent.min.segment.ms": "1",
                    "max.compaction.lag.ms": "9223372036854775807",
                    "file.delete.delay.ms": "60000",
                    "confluent.tier.cleaner.dual.compaction": "false",
                    "message.timestamp.type": "CreateTime",
                    "local.retention.bytes": "-2",
                    "preallocate": "false",
                    "confluent.placement.constraints": "",
                    "min.cleanable.dirty.ratio": "0.5",
                    "index.interval.bytes": "4096",
                    "delete.retention.ms": "86400000",
                    "message.timestamp.after.max.ms": "9223372036854775807",
                    "confluent.tier.cleaner.min.cleanable.ratio": "0.75",
                    "confluent.prefer.tier.fetch.ms": "-1",
                    "message.timestamp.before.max.ms": "9223372036854775807",
                    "confluent.max.segment.ms": "9223372036854775807",
                    "segment.index.bytes": "10485760",
                    "compression.type": "gzip",
                    "confluent.tier.cleaner.compact.min.efficiency": "0.5",
                    "remote.storage.enable": "false",
                    "confluent.key.subject.name.strategy": "io.confluent.kafka.serializers.subject.TopicNameStrategy",
                    "segment.jitter.ms": "0",
                    "flush.ms": "9223372036854775807",
                    "confluent.tier.local.hotset.ms": "86400000",
                    "follower.replication.throttled.replicas": "",
                    "confluent.tier.local.hotset.bytes": "-1",
                    "compression.gzip.level": "-1",
                    "flush.messages": "9223372036854775807",
                    "compression.zstd.level": "3",
                    "confluent.segment.speculative.prefetch.enable": "false",
                    "confluent.tier.cleaner.compact.segment.min.bytes": "20971520",
                    "confluent.cluster.link.allow.legacy.message.format": "false",
                    "max.message.bytes": "1000000",
                    "min.compaction.lag.ms": "0",
                    "unclean.leader.election.enable": "false",
                    "retention.bytes": "-1",
                    "confluent.key.schema.validation": "false",
                    "segment.ms": "3600000",
                    "confluent.system.time.roll.enable": "false",
                    "message.timestamp.difference.max.ms": "9223372036854775807"
                }
            }
        }
    )
