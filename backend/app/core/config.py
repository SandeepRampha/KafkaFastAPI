"""
Configuration Layer - Multi-Cluster Support & Authentication

Supports:
- Multiple Kafka clusters with named configurations
- Authentication protocols: PLAINTEXT, SASL_PLAIN, SASL_SSL, OAUTHBEARER, LDAP
- Schema Registry configuration
"""

import json
from typing import Optional
from urllib.parse import quote_plus
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class KafkaClusterConfig:
    """Configuration for a single Kafka cluster."""
    
    def __init__(
        self,
        name: str,
        bootstrap_servers: str,
        security_protocol: str = "PLAINTEXT",
        sasl_mechanism: Optional[str] = None,
        sasl_username: Optional[str] = None,
        sasl_password: Optional[str] = None,
        # SSL Support
        ssl_ca_location: Optional[str] = None,
        ssl_certificate_location: Optional[str] = None,
        ssl_key_location: Optional[str] = None,
        ssl_password: Optional[str] = None,
        ssl_verify: bool = True,
        # Per-cluster Schema Registry support
        schema_registry_url: Optional[str] = None,
        schema_registry_username: Optional[str] = None,
        schema_registry_password: Optional[str] = None,
    ):
        self.name = name
        self.bootstrap_servers = bootstrap_servers
        self.security_protocol = security_protocol
        self.sasl_mechanism = sasl_mechanism
        self.sasl_username = sasl_username
        self.sasl_password = sasl_password
        
        # SSL
        self.ssl_ca_location = ssl_ca_location
        self.ssl_certificate_location = ssl_certificate_location
        self.ssl_key_location = ssl_key_location
        self.ssl_password = ssl_password
        self.ssl_verify = ssl_verify

        # Schema Registry
        self.schema_registry_url = schema_registry_url
        self.schema_registry_username = schema_registry_username
        self.schema_registry_password = schema_registry_password
    
    def to_kafka_config(self) -> dict:
        """Convert to confluent-kafka compatible config dict."""
        config = {
            "bootstrap.servers": self.bootstrap_servers,
            "security.protocol": self.security_protocol,
        }
        
        if self.sasl_mechanism:
            config["sasl.mechanism"] = self.sasl_mechanism
        
        if self.sasl_username and self.sasl_password:
            config["sasl.username"] = self.sasl_username
            config["sasl.password"] = self.sasl_password

        if self.ssl_ca_location:
            config["ssl.ca.location"] = self.ssl_ca_location
        if self.ssl_certificate_location:
            config["ssl.certificate.location"] = self.ssl_certificate_location
        if self.ssl_key_location:
            config["ssl.key.location"] = self.ssl_key_location
        if self.ssl_password:
            config["ssl.key.password"] = self.ssl_password
        
        if not self.ssl_verify:
            config["enable.ssl.certificate.verification"] = "false"
            config["ssl.endpoint.identification.algorithm"] = "none"
        
        return config

# this is exactly what confluent-kafka expects 
# {
#   "bootstrap.servers": "...",
#   "security.protocol": "...",
#   "sasl.mechanism": "...",
#   "sasl.username": "...",
#   "sasl.password": "..."
# }




class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    app_name: str = "Kafka Admin Service"
    app_debug: bool = False
    
    kafka_bootstrap_servers: Optional[str] = None
    kafka_security_protocol: str = "PLAINTEXT"
    kafka_sasl_mechanism: Optional[str] = None
    kafka_sasl_username: Optional[str] = None
    kafka_sasl_password: Optional[str] = None
    kafka_ssl_ca_location: Optional[str] = None
    kafka_ssl_verify: bool = True
    
    # Multi-Cluster Configuration (JSON string)
    kafka_clusters: Optional[str] = None
    
    # Kafka Tuning
    kafka_executor_workers: int = 50
    
    # Schema Registry
    schema_registry_url: str = "http://localhost:8081"
    schema_registry_username: Optional[str] = None
    schema_registry_password: Optional[str] = None
    schema_registry_verify_ssl: bool = True

    # Keycloak SSO Configuration
    #
    # keycloak_server_url      – Legacy fallback. Kept for backward compatibility.
    # keycloak_issuer_url      – Public/external URL that Keycloak stamps into the
    #                            JWT "iss" claim. Used ONLY for issuer validation.
    #                            Must match what Keycloak actually puts in tokens.
    # keycloak_internal_url    – In-cluster K8s service URL. Used ONLY for fetching
    #                            JWKS public keys. Bypasses the ingress to avoid 503s.
    keycloak_server_url: str = "http://kafkaui.infra.alephys.com:8080"
    keycloak_issuer_url: Optional[str] = None   # e.g. http://10.1.0.201/keycloak
    keycloak_internal_url: Optional[str] = None  # e.g. http://keycloak-external:8080/keycloak
    keycloak_realm: str = "multi-tenant-app"
    keycloak_client_id: str = "kafka-ui-frontend"

    # ============================================
    # LEGACY LDAP CONFIGURATION (TEMPORARILY DISABLED)
    # These fields are now Optional. LDAP will be integrated
    # via Keycloak User Federation in the future.
    # Do NOT remove. Will be re-enabled later.
    # ============================================
    ldap_provider_url: Optional[str] = None
    ldap_bind_dn: Optional[str] = None
    ldap_bind_password: Optional[str] = None
    ldap_user_search_base: Optional[str] = None
    ldap_group_search_base: Optional[str] = None
    ldap_user_name_attribute: str = "uid"
    ldap_group_object_class: str = "posixgroup"
    ldap_group_name_attribute: str = "cn"
    ldap_timeout: int = 3
    
    
    # Database Configuration (PostgreSQL)
    postgres_server: str = "localhost"
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "kafka_admin"
    postgres_port: int = 5432
    
    # Security
    secret_key: str = "super-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60



    # Admin Users
    admin_users: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def get_admin_users(self) -> list[str]:
        """Get list of admin users."""
        if not self.admin_users:
            return ["admin"]
        return [u.strip() for u in self.admin_users.split(",")]

    @property
    def sqlalchemy_database_uri(self) -> str:
        """Construct SQLAlchemy database URI for PostgreSQL."""
        return (
            f"postgresql+asyncpg://{quote_plus(self.postgres_user.strip())}:{quote_plus(self.postgres_password.strip())}"
            f"@{self.postgres_server.strip()}:{self.postgres_port}/{self.postgres_db.strip()}"
        )
    
    def get_default_cluster(self) -> KafkaClusterConfig:
        """Get the default Kafka cluster configuration."""
        return KafkaClusterConfig(
            name="default",
            bootstrap_servers=self.kafka_bootstrap_servers,
            security_protocol=self.kafka_security_protocol,
            sasl_mechanism=self.kafka_sasl_mechanism,
            sasl_username=self.kafka_sasl_username,
            sasl_password=self.kafka_sasl_password,
            ssl_ca_location=self.kafka_ssl_ca_location,
            ssl_verify=self.kafka_ssl_verify,
            # Defaults for Schema Registry
            schema_registry_url=self.schema_registry_url,
            schema_registry_username=self.schema_registry_username,
            schema_registry_password=self.schema_registry_password,
        )
    
    def get_cluster(self, name: str = "default") -> KafkaClusterConfig:
        """Get a named cluster configuration."""
        if name == "default" or not self.kafka_clusters:
            return self.get_default_cluster()
        
        try:
            clusters = json.loads(self.kafka_clusters)
            if name in clusters:
                c = clusters[name]
                return KafkaClusterConfig(
                    name=name,
                    bootstrap_servers=c.get("bootstrap_servers", ""),
                    security_protocol=c.get("security_protocol", "PLAINTEXT"),
                    sasl_mechanism=c.get("sasl_mechanism"),
                    sasl_username=c.get("sasl_username"),
                    sasl_password=c.get("sasl_password"),
                    # SSL support
                    ssl_ca_location=c.get("ssl_ca_location"),
                    ssl_certificate_location=c.get("ssl_certificate_location"),
                    ssl_key_location=c.get("ssl_key_location"),
                    ssl_password=c.get("ssl_password"),
                    ssl_verify=c.get("ssl_verify", True),
                    # Schema Registry support
                    schema_registry_url=c.get("schema_registry_url"),
                    schema_registry_username=c.get("schema_registry_username"),
                    schema_registry_password=c.get("schema_registry_password"),
                )
        except json.JSONDecodeError:
            pass
        
        return self.get_default_cluster()
    
    def list_clusters(self) -> list[str]:
        """List all available cluster names."""
        clusters = ["default"]
        
        if self.kafka_clusters:
            try:
                parsed = json.loads(self.kafka_clusters)
                clusters.extend(parsed.keys())
            except json.JSONDecodeError:
                pass
        
        return clusters
    
    def get_schema_registry_config(self, cluster: str = "default") -> dict:
        """Get Schema Registry configuration for a specific cluster."""
        cluster_config = self.get_cluster(cluster)
        
        # Use cluster-specific SR config if available, else fall back to top-level default
        url = cluster_config.schema_registry_url or self.schema_registry_url
        username = cluster_config.schema_registry_username or self.schema_registry_username
        password = cluster_config.schema_registry_password or self.schema_registry_password
        
        config = {"url": url}
        
        if username and password:
            config["basic.auth.user.info"] = f"{username}:{password}"
        
        return config


# Global settings instance
settings = Settings()
