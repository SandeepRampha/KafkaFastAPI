"""
Custom Exceptions - Standardized Error Classes

Provides a hierarchy of exceptions for Kafka Admin and Schema Registry operations
with automatic HTTP status code mapping.
"""

from typing import Optional


class KafkaAdminBaseException(Exception):
    """Base exception for all Kafka Admin errors."""
    
    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"
    
    def __init__(self, message: str, details: Optional[dict] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


# ==================== TOPIC EXCEPTIONS ====================

class TopicError(KafkaAdminBaseException):
    """Base exception for topic operations."""
    
    status_code = 400
    error_code = "TOPIC_ERROR"


class TopicNotFoundError(TopicError):
    """Topic does not exist."""
    
    status_code = 404
    error_code = "TOPIC_NOT_FOUND"


class TopicAlreadyExistsError(TopicError):
    """Topic already exists."""
    
    status_code = 409
    error_code = "TOPIC_ALREADY_EXISTS"


class TopicValidationError(TopicError):
    """Invalid topic configuration."""
    
    status_code = 400
    error_code = "TOPIC_VALIDATION_ERROR"


# ==================== ACL EXCEPTIONS ====================

class AclError(KafkaAdminBaseException):
    """Base exception for ACL operations."""
    
    status_code = 400
    error_code = "ACL_ERROR"


class AclNotFoundError(AclError):
    """ACL binding does not exist."""
    
    status_code = 404
    error_code = "ACL_NOT_FOUND"


class AclPermissionDeniedError(AclError):
    """Permission denied for ACL operation."""
    
    status_code = 403
    error_code = "ACL_PERMISSION_DENIED"


# ==================== SCHEMA EXCEPTIONS ====================

class SchemaRegistryError(KafkaAdminBaseException):
    """Base exception for Schema Registry operations."""
    
    status_code = 400
    error_code = "SCHEMA_REGISTRY_ERROR"


class SchemaNotFoundError(SchemaRegistryError):
    """Schema or subject does not exist."""
    
    status_code = 404
    error_code = "SCHEMA_NOT_FOUND"


class SchemaConflictError(SchemaRegistryError):
    """Schema is incompatible with existing version."""
    
    status_code = 409
    error_code = "SCHEMA_INCOMPATIBLE"


class SchemaValidationError(SchemaRegistryError):
    """Invalid schema definition."""
    
    status_code = 400
    error_code = "SCHEMA_VALIDATION_ERROR"


# ==================== KAFKA ADMIN EXCEPTIONS ====================

class KafkaAdminError(KafkaAdminBaseException):
    """General Kafka Admin Client error."""
    
    status_code = 500
    error_code = "KAFKA_ADMIN_ERROR"


class KafkaConnectionError(KafkaAdminError):
    """Cannot connect to Kafka cluster."""
    
    status_code = 503
    error_code = "KAFKA_CONNECTION_ERROR"


class ClusterNotFoundError(KafkaAdminError):
    """Specified cluster configuration not found."""
    
    status_code = 404
    error_code = "CLUSTER_NOT_FOUND"
