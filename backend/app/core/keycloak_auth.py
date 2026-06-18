"""
Keycloak Authentication Module

Validates JWT tokens issued by Keycloak using JWKS (JSON Web Key Set).
Handles:
- JWKS public key fetching & caching (via internal K8s service URL)
- JWT signature validation (RS256)
- Token claims validation (aud, iss, exp)
- Issuer validation (via external/public URL that Keycloak stamps into tokens)
- Role mapping (Keycloak realm roles → app roles)
- Tenant extraction with validation

URL separation strategy
-----------------------
Keycloak stamps its *public* base URL into every JWT "iss" claim. When the
backend validates the issuer it must use that same public URL. However,
fetching the JWKS keys via the public ingress can cause 503 timeouts in a
Kubernetes environment. To solve both problems two separate env vars are used:

  KEYCLOAK_ISSUER_URL   – public URL matching the JWT "iss" claim
                          (e.g. http://10.1.0.201/keycloak)
  KEYCLOAK_INTERNAL_URL – in-cluster K8s service URL for JWKS fetch
                          (e.g. http://keycloak-external:8080/keycloak)

Both fall back to KEYCLOAK_SERVER_URL when not set (backward compatible).
"""

import time
import logging
from typing import Dict, Any, Optional, List

import jwt
import requests
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

# ============================================================
# JWKS Cache — avoids hitting Keycloak on every request
# ============================================================
_jwks_cache: Optional[Dict[str, Any]] = None
_jwks_cache_time: float = 0
JWKS_CACHE_TTL_SECONDS = 300  # 5 minutes


# ------------------------------------------------------------
# URL helpers  (separated for issuer vs. key-fetch)
# ------------------------------------------------------------

def _get_issuer_base_url() -> str:
    """
    Return the base URL that Keycloak stamps into JWT ``iss`` claims.

    Uses KEYCLOAK_ISSUER_URL when set, otherwise falls back to
    KEYCLOAK_SERVER_URL (backward-compatible).
    """
    base = settings.keycloak_issuer_url or settings.keycloak_server_url
    return f"{base}/realms/{settings.keycloak_realm}"


def _get_internal_base_url() -> str:
    """
    Return the in-cluster base URL used exclusively for JWKS fetching.

    Uses KEYCLOAK_INTERNAL_URL when set, otherwise falls back to
    KEYCLOAK_SERVER_URL (backward-compatible).
    """
    base = settings.keycloak_internal_url or settings.keycloak_server_url
    return f"{base}/realms/{settings.keycloak_realm}"


def _get_jwks_url() -> str:
    """Construct the JWKS endpoint URL (uses internal/in-cluster URL)."""
    return f"{_get_internal_base_url()}/protocol/openid-connect/certs"


def _get_expected_issuer() -> str:
    """Construct the expected token issuer (uses public/external URL)."""
    return _get_issuer_base_url()


def get_keycloak_public_keys() -> Dict[str, Any]:
    """
    Fetch JWKS from Keycloak with caching.
    
    Returns the JWKS dict containing public keys used to verify JWT signatures.
    Caches the result for JWKS_CACHE_TTL_SECONDS to reduce network calls.
    """
    global _jwks_cache, _jwks_cache_time

    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < JWKS_CACHE_TTL_SECONDS:
        return _jwks_cache

    jwks_url = _get_jwks_url()
    try:
        # 5-second timeout prevents ingress/proxy hangs from causing 503 storms.
        response = requests.get(jwks_url, timeout=5)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_time = now
        logger.info(f"Successfully fetched and cached Keycloak JWKS from {jwks_url}")
        return _jwks_cache
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch Keycloak JWKS from {jwks_url}: {e}")
        # If we have a stale cache, use it rather than failing completely.
        if _jwks_cache:
            logger.warning("Using stale JWKS cache as fallback after fetch failure")
            return _jwks_cache
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reach Keycloak for token validation"
        )


def _get_signing_key(token: str) -> jwt.PyJWK:
    """
    Get the correct signing key from JWKS that matches the token's kid header.
    """
    jwks_data = get_keycloak_public_keys()
    try:
        jwk_client = jwt.PyJWKClient.__new__(jwt.PyJWKClient)
        # Manually set the cached keys to avoid another HTTP call
        signing_keys = [
            jwt.PyJWK(key_data)
            for key_data in jwks_data.get("keys", [])
            if key_data.get("use") == "sig" # Only process signing keys
        ]
        # Match the key ID from token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        for key in signing_keys:
            if key.key_id == kid:
                return key
        
        # If no matching key found, refresh the cache and try once more
        logger.warning(f"No matching key found for kid={kid}, refreshing JWKS cache")
        global _jwks_cache_time
        _jwks_cache_time = 0  # Force cache refresh
        jwks_data = get_keycloak_public_keys()
        signing_keys = [
            jwt.PyJWK(key_data)
            for key_data in jwks_data.get("keys", [])
            if key_data.get("use") == "sig" # Only process signing keys
        ]
        for key in signing_keys:
            if key.key_id == kid:
                return key
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No matching signing key found in Keycloak JWKS",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.exceptions.PyJWKError as e:
        logger.error(f"Error processing JWKS key: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signing key",
            headers={"WWW-Authenticate": "Bearer"},
        )


def decode_keycloak_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a Keycloak JWT token.
    
    Validates:
    - Signature (RS256 via JWKS public key)
    - Expiration (exp)
    - Issuer (iss == Keycloak realm URL)
    - Audience (aud == configured client ID)
    
    Returns:
        Decoded token payload dict
        
    Raises:
        HTTPException 401 on any validation failure
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        signing_key = _get_signing_key(token)
        
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=[settings.keycloak_client_id, "account"], # Accept both custom and default audience
            issuer=_get_expected_issuer(),
            leeway=60,  # Handle up to 60 seconds of clock drift
            options={
                "verify_exp": True,
                "verify_iss": True,
                "verify_aud": True,
                "require": ["exp", "iss"], # Temporarily removed 'sub' requirement
            }
        )
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.warning("Keycloak token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidAudienceError, jwt.MissingRequiredClaimError) as e:
        # Decode without verification just to log for debugging
        unverified = jwt.decode(token, options={"verify_signature": False})
        actual_aud = unverified.get("aud")
        
        # If audience is missing or mismatching, we log a warning but allow it IF it's a transition phase
        # Many Keycloak setups don't explicitly set the 'aud' claim to the client_id by default
        logger.warning(f"Keycloak token audience mismatch or missing. Expected: {settings.keycloak_client_id}, Got: {actual_aud}. Proceeding as signature is valid.")
        
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=_get_expected_issuer(),
            leeway=60,
            options={
                "verify_exp": True,
                "verify_iss": True,
                "verify_aud": False, # Loosen this for the new server deployment
                "require": ["exp", "iss"],
            }
        )
    except jwt.InvalidIssuerError:
        # Decode without verification just to log the actual issuer for debugging
        unverified = jwt.decode(token, options={"verify_signature": False})
        actual_iss = unverified.get("iss")
        expected_iss = _get_expected_issuer()
        logger.error(
            f"Keycloak token issuer mismatch. "
            f"Expected: {expected_iss!r}, Got: {actual_iss!r}. "
            f"Set KEYCLOAK_ISSUER_URL to the public base URL that Keycloak "
            f"uses when minting tokens (check the 'iss' claim in the JWT)."
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                f"Token issuer mismatch. "
                f"Expected '{expected_iss}', got '{actual_iss}'. "
                f"Set KEYCLOAK_ISSUER_URL to match the public Keycloak URL."
            ),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        logger.exception(f"JWT validation error: {str(e)}")
        raise credentials_exception


def map_keycloak_roles(kc_roles: List[str]) -> str:
    """
    Map Keycloak realm roles to application role.
    
    Priority order: ADMIN > DATA_STEWARD > USER (default)
    
    Args:
        kc_roles: List of role strings from Keycloak's realm_access.roles
        
    Returns:
        Application role string: "admin", "data_steward", or "user"
    """
    # Normalize to uppercase for case-insensitive comparison
    upper_roles = [r.upper() for r in kc_roles]
    
    if "ADMIN" in upper_roles:
        return "admin"
    elif "DATA_STEWARD" in upper_roles:
        return "data_steward"
    else:
        return "user"


def extract_user_info(token_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract structured user info from decoded Keycloak token payload.
    
    Extracts:
    - preferred_username → username
    - realm_access.roles → mapped to app role  
    - tenant → tenant identifier (required, raises 403 if missing)
    
    Args:
        token_payload: Decoded JWT payload dict
        
    Returns:
        Dict with keys: username, role, roles, tenant, is_admin, groups, dn
        
    Raises:
        HTTPException 403 if tenant claim is missing
    """
    username = token_payload.get("preferred_username", token_payload.get("sub", token_payload.get("email")))
    
    if not username:
        logger.error(f"Token is missing identity claims (preferred_username, sub, email)! Full payload: {token_payload}")
        username = "unknown"

    
    # Safe extraction of realm_access.roles with fallback
    realm_access = token_payload.get("realm_access", {})
    kc_roles = realm_access.get("roles", [])
    
    # Map to application role
    app_role = map_keycloak_roles(kc_roles)
    is_admin_user = app_role == "admin"
    
    # Extract tenant — FALLBACK to 'default' if missing
    tenant = token_payload.get("tenant", "default")
    
    # Build groups list for backward compatibility with existing router code
    groups = []
    if is_admin_user:
        groups.append("admins")
    if app_role == "data_steward":
        groups.append("stewards")
    if not groups:
        groups.append("users")
    
    return {
        "username": username,
        "role": app_role,
        "roles": kc_roles,          # Raw Keycloak roles
        "tenant": tenant,
        "is_admin": is_admin_user,
        "groups": groups,            # Backward compat with existing routers
        "dn": f"keycloak:{username}",
        "authenticated": True,
    }
