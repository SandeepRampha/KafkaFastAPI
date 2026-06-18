"""
Security Utilities

# ============================================
# LEGACY LOCAL AUTH (TEMPORARILY DISABLED)
# This module previously handled local JWT creation and password hashing
# for the LDAP-based authentication flow. Now Keycloak handles all
# token issuance and password verification.
# Do NOT remove. Will be re-enabled later if needed.
# ============================================
"""

# from datetime import datetime, timedelta, timezone
# from typing import Optional, Union, Any
# from jose import jwt
# from passlib.context import CryptContext
# from app.core.config import settings
#
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
#
# ALGORITHM = settings.algorithm
#
# import uuid
#
# def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
#     if expires_delta:
#         expire = datetime.now(timezone.utc) + expires_delta
#     else:
#         expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
#     
#     # Add a unique ID to ensure token uniqueness even if created in the same second
#     to_encode = {
#         "exp": expire, 
#         "sub": str(subject),
#         "jti": str(uuid.uuid4())
#     }
#     encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
#     return encoded_jwt
#
# def verify_password(plain_password: str, hashed_password: str) -> bool:
#     return pwd_context.verify(plain_password, hashed_password)
#
# def get_password_hash(password: str) -> str:
#     return pwd_context.hash(password)
