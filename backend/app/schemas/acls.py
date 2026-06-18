from enum import Enum
from typing import Optional, Generic, TypeVar, List
from pydantic import BaseModel, Field, ConfigDict

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""
    items: List[T] = Field(..., description="List of items for the current page")
    total_count: int = Field(..., description="Total number of items available")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    pages: int = Field(..., description="Total number of pages")

class ResourceType(str, Enum):
    TOPIC = "TOPIC"
    GROUP = "GROUP"
    CLUSTER = "CLUSTER"
    TRANSACTIONAL_ID = "TRANSACTIONAL_ID"
    DELEGATION_TOKEN = "DELEGATION_TOKEN"
    USER = "USER"
    ANY = "ANY"
    UNKNOWN = "UNKNOWN"


class PatternType(str, Enum):
    LITERAL = "LITERAL"
    PREFIXED = "PREFIXED"
    ANY = "ANY"
    MATCH = "MATCH"


class AclOperation(str, Enum):
    ALL = "ALL"
    READ = "READ"
    WRITE = "WRITE"
    CREATE = "CREATE"
    DELETE = "DELETE"
    ALTER = "ALTER"
    DESCRIBE = "DESCRIBE"
    CLUSTER_ACTION = "CLUSTER_ACTION"
    DESCRIBE_CONFIGS = "DESCRIBE_CONFIGS"
    ALTER_CONFIGS = "ALTER_CONFIGS"
    IDEMPOTENT_WRITE = "IDEMPOTENT_WRITE"
    ANY = "ANY"
    UNKNOWN = "UNKNOWN"



class AclPermissionType(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"



class AclResponse(BaseModel):
    resource_type: ResourceType = Field(..., description="Type of resource")
    resource_name: str = Field(..., description="Name of the resource")
    pattern_type: PatternType = Field(..., description="Pattern type for matching")
    principal: str = Field(..., description="Principal (e.g., 'User:alice')")
    host: str = Field(..., description="Host pattern (use '*' for all hosts)")
    operation: AclOperation = Field(..., description="ACL operation")
    permission_type: AclPermissionType = Field(..., description="Permission type (ALLOW/DENY)")



class AclMetadataPaginatedResponse(PaginatedResponse[AclResponse]):
    """Paginated response for ACLs."""
    pass


class AclCreateRequest(BaseModel):
   
    resource_type: ResourceType = Field(..., description="Type of resource")
    resource_name: str = Field(..., description="Name of the resource")
    pattern_type: PatternType = Field(default=PatternType.LITERAL, description="Pattern type for matching")
    principal: str = Field(..., description="Principal (username only, e.g., 'User:admin' or 'admin', NOT 'admin:password')")
    host: str = Field(default="*", description="Host pattern (use '*' for all hosts)")
    operation: AclOperation = Field(..., description="ACL operation")
    permission_type: AclPermissionType = Field(default=AclPermissionType.ALLOW, description="Permission type")
    cluster: Optional[str] = Field(default="default", description="Kafka cluster name")
 
    model_config = ConfigDict(
        json_schema_extra={
              "example": {
                "resource_type": "Cluster,Topic,Group",
                "resource_name": "give the resource name",
                "pattern_type": "LITERAL,PREFIXED,ANY,MATCH",
                "principal": "you username or principalname",
                "host": "*",
                "operation": "READ,WRITE,ALL,delete,alter,",
                "permission_type": "ALLOW,DENY",
                "cluster": "default"
            }
        }
    )
 
 
class AclDeleteRequest(BaseModel):
   
    resource_type: ResourceType = Field(..., description="Type of resource")
    resource_name: str = Field(..., description="Name of the resource")
    pattern_type: PatternType = Field(default=PatternType.LITERAL, description="Pattern type for matching")
    principal: str = Field(..., description="Principal (username only, e.g., 'User:admin' or 'admin', NOT 'admin:password')")
    host: str = Field(default="*", description="Host pattern (use '*' for all hosts)")
    operation: AclOperation = Field(..., description="ACL operation")
    permission_type: AclPermissionType = Field(default=AclPermissionType.ALLOW, description="Permission type")
    cluster: Optional[str] = Field(default="default", description="Kafka cluster name")
 
    model_config = ConfigDict(
        json_schema_extra={
              "example": {
                "resource_type": "Cluster,Topic,Group",
                "resource_name": "give the resource name",
                "pattern_type": "LITERAL,PREFIXED,ANY,MATCH",
                "principal": "you username or principalname",
                "host": "*",
                "operation": "READ,WRITE,ALL,delete,alter,",
                "permission_type": "ALLOW,DENY",
                "cluster": "default"
            }
        }
    )