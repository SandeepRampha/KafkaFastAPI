from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional

class RequestStats(BaseModel):
    approved: int
    rejected: int
    pending: int

class RequestBreakdown(BaseModel):
    approved: int
    rejected: int
    pending: int
    topics: RequestStats
    acls: RequestStats

class ClusterOverview(BaseModel):
    cluster_name: str | None
    cluster_id: str | None
    confluent_version: str | None = None
    mode: str | None
    state: str
    connection_latency_ms: float
    last_metadata_refresh: str

class BrokerStatus(BaseModel):
    total_brokers: int
    online_brokers: int
    offline_brokers: int
    total_partitions: int
    total_replicas: int
    under_replicated_partitions: int
    offline_partitions: int
    controller_id: int | None
    broker_hosts: list[str]

class ControllerHealth(BaseModel):
    active_controller_id: int | str | None
    is_active: bool

class HealthResponse(BaseModel):
    topics_count: int
    acls_count: int
    cluster_state: str
    requests: RequestBreakdown
    cluster_overview: ClusterOverview
    broker_status: BrokerStatus
    controller_health: ControllerHealth
    schema_registry: dict | None
