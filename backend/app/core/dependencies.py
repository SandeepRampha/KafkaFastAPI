"""
Dependencies - FastAPI Dependency Injection

Provides dependency injection for services and cluster selection.
Now uses Keycloak JWKS-based JWT validation instead of local JWT + DB sessions.
"""

import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional

from app.services.kafka_admin import kafka_admin_service, KafkaAdminService
from app.services.schema_registry import schema_registry_service, SchemaRegistryService
from app.core.config import settings
from app.core.keycloak_auth import decode_keycloak_token, extract_user_info

logger = logging.getLogger(__name__)

# OAuth2 scheme — kept for backward compatibility and Swagger metadata
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

# Bearer scheme — allows pasting token directly into Swagger 'Authorize' dialog
bearer_scheme = HTTPBearer(auto_error=False)


def get_kafka_admin_service() -> KafkaAdminService:
    """Get the Kafka Admin Service instance."""
    return kafka_admin_service


def get_schema_registry_service() -> SchemaRegistryService:
    """Get the Schema Registry Service instance."""
    return schema_registry_service


async def verify_credentials(
    token: Optional[str] = Depends(oauth2_scheme),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Dict[str, Any]:
    """
    Dependency to verify Keycloak JWT Bearer Token.
    
    Supports both standard OAuth2PasswordBearer and HTTPBearer for Swagger UI.
    """
    # Prefer the token from the Bearer scheme (Swagger UI) 
    # but fallback to standard oauth2_scheme if needed
    final_token = None
    if auth:
        final_token = auth.credentials
    elif token:
        final_token = token
        
    if not final_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Decode and validate token via Keycloak JWKS
    payload = decode_keycloak_token(final_token)
    
    # Extract structured user info from token claims
    user_info = extract_user_info(payload)
    
    return user_info


def is_admin(username: str) -> bool:
    """
    Check if a user is an admin.
    
    NOTE: With Keycloak SSO, this is now a secondary check.
    The primary authorization is via the 'is_admin' flag in verify_credentials.
    This function is kept for backward compatibility with existing router code
    that passes username directly.
    """
    return username in settings.get_admin_users


def require_role(*allowed_roles: str):
    """
    Dependency factory for role-based access control.
    
    Usage:
        @router.get("/admin-only", dependencies=[Depends(require_role("admin"))])
        
    Or in endpoint:
        user_info = Depends(require_role("admin", "data_steward"))
    """
    async def _check_role(user_info: Dict[str, Any] = Depends(verify_credentials)):
        if user_info.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
            )
        return user_info
    return _check_role


def require_tenant(tenant: str):
    """
    Dependency factory for tenant-based access control.
    
    Ensures the authenticated user belongs to the specified tenant.
    """
    async def _check_tenant(user_info: Dict[str, Any] = Depends(verify_credentials)):
        if user_info.get("tenant") != tenant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Tenant mismatch."
            )
        return user_info
    return _check_tenant


# Convenience dependencies for Governance
require_admin = require_role("admin")
require_steward = require_role("admin", "data_steward") # Stewards can approve, Admins can too
require_any_admin = require_role("admin") # Explicit admin only


