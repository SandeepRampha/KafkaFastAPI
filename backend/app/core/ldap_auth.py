"""
LDAP Authentication Module

# ============================================
# LEGACY LDAP AUTH (TEMPORARILY DISABLED)
# This block is preserved for future use when LDAP via Keycloak 
# User Federation is fully stable.
# Do NOT remove. Will be re-enabled later.
# ============================================
"""

# from typing import Dict, Any, List
# from ldap3 import Server, Connection, ALL, SUBTREE
# from ldap3.core.exceptions import LDAPException, LDAPBindError, LDAPSocketOpenError
# 
# from app.core.config import settings
# import logging
# 
# logger = logging.getLogger(__name__)
# 
# 
# class LDAPAuthenticator:
#     """Handles LDAP authentication operations"""
#     
#     def __init__(self):
#         self.server = Server(
#             settings.ldap_provider_url,
#             get_info=ALL,
#             connect_timeout=settings.ldap_timeout
#         )
#     
#     def authenticate(self, username: str, password: str) -> Dict[str, Any]:
#         """
#         Authenticate user against LDAP server
#         
#         Args:
#             username: User's username (uid)
#             password: User's password
#             
#         Returns:
#             Dictionary containing user information
#             
#         Raises:
#             Exception: If authentication fails
#         """
#         try:
#             # First bind with service account to search for user
#             service_conn = Connection(
#                 self.server,
#                 user=settings.ldap_bind_dn,
#                 password=settings.ldap_bind_password,
#                 auto_bind=True
#             )
#             
#             # Search for user
#             search_filter = f"({settings.ldap_user_name_attribute}={username})"
#             service_conn.search(
#                 search_base=settings.ldap_user_search_base,
#                 search_filter=search_filter,
#                 search_scope=SUBTREE,
#                 attributes=['*']
#             )
#             
#             if not service_conn.entries:
#                 service_conn.unbind()
#                 raise Exception("User not found")
#             
#             # Get user DN and attributes
#             user_entry = service_conn.entries[0]
#             user_dn = user_entry.entry_dn
#             user_attrs = dict(user_entry.entry_attributes_as_dict)
# 
#             # Strict case-sensitive check
#             ldap_username = None
#             if settings.ldap_user_name_attribute in user_attrs:
#                 val = user_attrs[settings.ldap_user_name_attribute]
#                 # Handle list or single value
#                 if isinstance(val, list) and val:
#                     ldap_username = str(val[0])
#                 elif val:
#                      ldap_username = str(val)
#             
#             if ldap_username and ldap_username != username:
#                 service_conn.unbind()
#                 raise Exception(f"Authentication failed: Username case mismatch. Expected '{ldap_username}', got '{username}'")
#             
#             # Close service connection
#             service_conn.unbind()
#             
#             # Try to bind as the user to verify password
#             user_conn = Connection(
#                 self.server,
#                 user=user_dn,
#                 password=password,
#                 auto_bind=True
#             )
#             user_conn.unbind()
#             
#             # Get user's groups
#             groups = self._get_user_groups(username)
#             
#             # Return user information
#             return {
#                 "username": username,
#                 "dn": user_dn,
#                 "attributes": {k: v for k, v in user_attrs.items()},
#                 "groups": groups,
#                 "authenticated": True
#             }
#             
#         except LDAPBindError:
#             raise Exception("Invalid username or password")
#         except LDAPSocketOpenError:
#             raise Exception("LDAP server is not reachable")
#         except LDAPException as e:
#             raise Exception(f"LDAP error: {str(e)}")
#         except Exception as e:
#             if "User not found" in str(e):
#                 raise
#             raise Exception(f"Authentication failed: {str(e)}")
#     
#     def _get_user_groups(self, username: str) -> List[str]:
#         """Get groups that the user belongs to"""
#         try:
#             conn = Connection(
#                 self.server,
#                 user=settings.ldap_bind_dn,
#                 password=settings.ldap_bind_password,
#                 auto_bind=True
#             )
#             
#             search_filter = f"(&(objectClass={settings.ldap_group_object_class})(memberUid={username}))"
#             conn.search(
#                 search_base=settings.ldap_group_search_base,
#                 search_filter=search_filter,
#                 search_scope=SUBTREE,
#                 attributes=[settings.ldap_group_name_attribute]
#             )
#             
#             groups = []
#             for entry in conn.entries:
#                 group_name = entry[settings.ldap_group_name_attribute].value
#                 if isinstance(group_name, list):
#                     groups.extend(group_name)
#                 else:
#                     groups.append(group_name)
#             
#             conn.unbind()
#             return groups
#             
#         except Exception as e:
#             logger.error(f"Error getting groups for user {username}: {e}")
#             return []
# 
# 
# # Global authenticator instance
# ldap_authenticator = LDAPAuthenticator()
