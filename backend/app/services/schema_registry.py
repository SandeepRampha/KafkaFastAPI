"""
Schema Registry Service - Schema Management

Handles all Schema Registry operations:
- List subjects
- Get schema versions
- Register schemas (Avro, JSON, Protobuf)
- Delete subjects and versions
- Check schema compatibility

Uses HTTP client for Schema Registry REST API.
"""

import asyncio
import httpx
import logging
from typing import Optional, List, Dict, Any, Union
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    SchemaRegistryError,
    SchemaNotFoundError,
    SchemaConflictError,
)
from app.schemas.schemas import (
    SchemaResponse,
    SchemaVersionResponse,
    CompatibilityCheckResponse,
    SchemaType,
)


class SchemaRegistryService:
    """Service for managing schemas in Confluent Schema Registry."""
    
    def __init__(self):
        # We no longer store a single config in __init__
        pass
    
    def _get_client(self, cluster: str = "default") -> httpx.AsyncClient:
        """Create an HTTP client for Schema Registry for a specific cluster."""
        cluster_config = settings.get_cluster(cluster)
        sr_config = settings.get_schema_registry_config(cluster)
        base_url = sr_config["url"].rstrip("/")
        auth = None
        
        if "basic.auth.user.info" in sr_config:
            user_info = sr_config["basic.auth.user.info"]
            username, password = user_info.split(":", 1)
            auth = (username, password)

        # Determine SSL verification: 
        # Bypass if global SCHEMA_REGISTRY_VERIFY_SSL is False OR cluster-specific ssl_verify is False
        if not settings.schema_registry_verify_ssl or not cluster_config.ssl_verify:
            verify_param = False
        elif cluster_config.ssl_ca_location:
            verify_param = cluster_config.ssl_ca_location
        else:
            verify_param = True

        return httpx.AsyncClient(
            base_url=base_url,
            auth=auth,
            headers={"Content-Type": "application/vnd.schemaregistry.v1+json"},
            timeout=30.0,
            verify=verify_param,
        )

    
    async def list_subjects(self, prefix: Optional[str] = None, cluster: Optional[str] = None) -> list[str]:
        """List all subjects in the Schema Registry."""
        async with self._get_client(cluster or "default") as client:
            try:
                response = await client.get("/subjects")
                response.raise_for_status()
                subjects = response.json()
                
                if prefix:
                    subjects = [s for s in subjects if s.startswith(prefix)]
                
                return sorted(subjects)
            except httpx.HTTPError as e:
                raise SchemaRegistryError(f"Failed to list subjects: {e}")
    
    async def get_schema_versions(self, subject: str, cluster: Optional[str] = None) -> SchemaVersionResponse:
        """Get all versions of a schema for a subject."""
        async with self._get_client(cluster or "default") as client:
            try:
                response = await client.get(f"/subjects/{subject}/versions")
                
                if response.status_code == 404:
                    raise SchemaNotFoundError(f"Subject '{subject}' not found")
                
                response.raise_for_status()
                versions = response.json()
                
                # Get latest schema details
                latest_response = await client.get(f"/subjects/{subject}/versions/latest")
                latest = latest_response.json() if latest_response.status_code == 200 else {}
                
                return SchemaVersionResponse(
                    subject=subject,
                    versions=versions,
                    latest_version=max(versions) if versions else None,
                    schema_type=latest.get("schemaType", "AVRO"),
                )
            except SchemaNotFoundError:
                raise
            except httpx.HTTPError as e:
                raise SchemaRegistryError(f"Failed to get schema versions: {e}")
    
    async def _resolve_version(self, subject: str, version: Union[int, str], cluster: str = "default") -> int:
        """Resolve 'latest' or string version to integer."""
        if isinstance(version, int):
            return version
        if str(version).lower() == "latest":
            async with self._get_client(cluster) as client:
                response = await client.get(f"/subjects/{subject}/versions/latest")
                response.raise_for_status()
                return int(response.json()["version"])
        try:
            return int(version)
        except ValueError:
            raise SchemaRegistryError(f"Invalid version format: {version}")

    async def get_schema(self, subject: str, version: Union[int, str], cluster: Optional[str] = None):
        """Get a specific schema version."""
        async with self._get_client(cluster or "default") as client:
            try:
                response = await client.get(f"/subjects/{subject}/versions/{version}")
                
                if response.status_code == 404:
                    raise SchemaNotFoundError(
                        f"Schema version '{version}' not found for subject '{subject}'"
                    )
                
                response.raise_for_status()
                return response.json()
            except SchemaNotFoundError:
                raise
            except httpx.HTTPError as e:
                raise SchemaRegistryError(f"Failed to get schema: {e}")
    
    async def register_schema(
        self,
        subject: str,
        schema_str: str,
        schema_type: SchemaType = SchemaType.AVRO,
        references: Optional[list] = None,
        cluster: Optional[str] = None,
    ) -> SchemaResponse:
        """Register a new schema under a subject."""
        async with self._get_client(cluster or "default") as client:
            try:
                # AVRO is the SR default – omit schemaType to maximise compatibility.
                # For JSON / PROTOBUF it is required.
                payload: dict = {"schema": schema_str}
                if schema_type != SchemaType.AVRO:
                    payload["schemaType"] = schema_type.value

                if references:
                    # Filter out empty/null reference objects that Swagger may auto-fill
                    valid_refs = [
                        r for r in references
                        if r and any(v is not None for v in r.values())
                    ]
                    if valid_refs:
                        payload["references"] = valid_refs

                response = await client.post(
                    f"/subjects/{subject}/versions",
                    json=payload,
                )

                if response.status_code == 409:
                    raise SchemaConflictError(
                        "Schema is incompatible with existing version"
                    )

                if not response.is_success:
                    # Surface the actual Schema Registry error message
                    try:
                        sr_detail = response.json()
                    except Exception:
                        sr_detail = response.text
                    raise SchemaRegistryError(
                        f"Schema Registry returned {response.status_code}: {sr_detail}"
                    )

                result = response.json()

                return SchemaResponse(
                    subject=subject,
                    schema_id=result["id"],
                    version=None,
                    schema_type=schema_type,
                )
            except (SchemaConflictError, SchemaNotFoundError, SchemaRegistryError):
                raise
            except httpx.HTTPError as e:
                raise SchemaRegistryError(f"Failed to register schema: {e}")
    
    async def delete_subject(
        self,
        subject: str,
        permanent: bool = False,
        cluster: Optional[str] = None,
    ) -> None:
        """Delete a subject and all its versions."""
        async with self._get_client(cluster or "default") as client:
            try:
                # Soft delete first
                response = await client.delete(f"/subjects/{subject}")
                
                if response.status_code == 404:
                    raise SchemaNotFoundError(f"Subject '{subject}' not found")
                
                response.raise_for_status()
                
                # Hard delete if permanent
                if permanent:
                    response = await client.delete(
                        f"/subjects/{subject}?permanent=true"
                    )
                    response.raise_for_status()
            except SchemaNotFoundError:
                raise
            except httpx.HTTPError as e:
                raise SchemaRegistryError(f"Failed to delete subject: {e}")
    
    async def delete_schema_version(
        self,
        subject: str,
        version: Union[int, str],
        permanent: bool = False,
        cluster: Optional[str] = None,
    ) -> None:
        """Delete a specific schema version."""
        async with self._get_client(cluster or "default") as client:
            try:
                # Soft delete first
                response = await client.delete(f"/subjects/{subject}/versions/{version}")
                
                if response.status_code == 404:
                    raise SchemaNotFoundError(
                        f"Schema version {version} not found for subject '{subject}'"
                    )
                
                response.raise_for_status()
                
                # Hard delete if permanent
                if permanent:
                    response = await client.delete(
                        f"/subjects/{subject}/versions/{version}?permanent=true"
                    )
                    response.raise_for_status()
            except SchemaNotFoundError:
                raise
            except httpx.HTTPError as e:
                raise SchemaRegistryError(f"Failed to delete schema version: {e}")
    
    async def check_compatibility(
        self,
        subject: str,
        version: str,
        schema_str: str,
        schema_type: SchemaType = SchemaType.AVRO,
        cluster: Optional[str] = None,
    ) -> CompatibilityCheckResponse:
        """Check if a schema is compatible with an existing version."""
        async with self._get_client(cluster or "default") as client:
            try:
                payload = {
                    "schema": schema_str,
                    "schemaType": schema_type.value,
                }
                
                response = await client.post(
                    f"/compatibility/subjects/{subject}/versions/{version}",
                    json=payload,
                )
                
                if response.status_code == 404:
                    raise SchemaNotFoundError(
                        f"Schema version '{version}' not found for subject '{subject}'"
                    )
                
                response.raise_for_status()
                result = response.json()
                
                return CompatibilityCheckResponse(
                    is_compatible=result.get("is_compatible", False),
                    messages=result.get("messages", []),
                )
            except SchemaNotFoundError:
                raise
            except httpx.HTTPError as e:
                raise SchemaRegistryError(f"Failed to check compatibility: {e}")

    async def get_global_compatibility(self, cluster: Optional[str] = None) -> dict:
        """Get the global compatibility setting."""
        async with self._get_client(cluster or "default") as client:
            try:
                response = await client.get("/config")
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                raise SchemaRegistryError(f"Failed to get global compatibility: {e}")

    async def get_subject_compatibility(self, subject: str, cluster: Optional[str] = None) -> dict:
        """Get the compatibility setting for a subject. Falls back to global if not found."""
        async with self._get_client(cluster or "default") as client:
            try:
                response = await client.get(f"/config/{subject}")

                if response.status_code == 404:
                    # Fallback to global config if subject-specific config is not set
                    return await self.get_global_compatibility(cluster=cluster)

                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                raise SchemaRegistryError(f"Failed to get compatibility for subject '{subject}': {e}")

    async def set_subject_compatibility(self, subject: str, compatibility: str, cluster: Optional[str] = None) -> dict:
        """Set the compatibility level for a subject."""
        async with self._get_client(cluster or "default") as client:
            try:
                response = await client.put(
                    f"/config/{subject}",
                    json={"compatibility": compatibility},
                )

                if response.status_code == 404:
                    raise SchemaNotFoundError(f"Subject '{subject}' not found")

                response.raise_for_status()
                return response.json()
            except SchemaNotFoundError:
                raise
            except httpx.HTTPError as e:
                raise SchemaRegistryError(f"Failed to set compatibility: {e}")

    async def get_subjects_metadata(
        self,
        cluster: str = "default",
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None
    ) -> dict:
        """
        Get paginated metadata for all subjects.
        Returns subject, type, latest version, and compatibility.
        """
        # 1. Get all subjects
        all_subjects = await self.list_subjects(cluster=cluster)
        
        # 2. Filter by search
        if search:
            all_subjects = [s for s in all_subjects if search.lower() in s.lower()]
            
        total_count = len(all_subjects)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_subjects = all_subjects[start_idx:end_idx]
        
        # 3. Fetch metadata for subjects on this page in parallel
        async def fetch_item_metadata(subject: str):
            try:
                # Get version info (versions, latest version, type)
                version_info = await self.get_schema_versions(subject=subject, cluster=cluster)
                
                # Get compatibility
                comp_info = {}
                try:
                    comp_info = await self.get_subject_compatibility(subject=subject, cluster=cluster)
                except Exception:
                    # Default if fetch fails
                    pass
                
                return {
                    "subject": subject,
                    "schema_type": version_info.schema_type,
                    "latest_version": version_info.latest_version,
                    "compatibility": comp_info.get("compatibility") or comp_info.get("compatibilityLevel", "Subject Default")
                }
            except Exception as e:
                # Log error but return partial data so page still loads
                import logging
                logging.getLogger(__name__).error(f"Failed to fetch metadata for subject '{subject}': {e}")
                return {
                    "subject": subject,
                    "schema_type": "AVRO",
                    "latest_version": None,
                    "compatibility": "Unknown"
                }

        tasks = [fetch_item_metadata(s) for s in page_subjects]
        items = await asyncio.gather(*tasks)
        
        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 0
        
        return {
            "items": items,
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "pages": total_pages
        }


    async def promote_version(
        self, subject: str, version: Union[int, str], db: AsyncSession, cluster: str = "default"
    ) -> bool:
        """Promote a version to ACTIVE status. Only one version can be active."""
        from app.models.schema_version_state import SchemaVersionState
        from sqlalchemy import update

        # Resolve version to integer for DB operations
        version_int = await self._resolve_version(subject, version, cluster)

        # 1. Reset all versions for this subject to NOT active
        await db.execute(
            update(SchemaVersionState)
            .where(
                SchemaVersionState.subject == subject,
                SchemaVersionState.cluster == cluster
            )
            .values(is_active=False)
        )

        # 2. Set the target version to active
        # Try to find existing record first
        stmt = select(SchemaVersionState).where(
            SchemaVersionState.subject == subject,
            SchemaVersionState.version == version_int,
            SchemaVersionState.cluster == cluster
        )
        result = await db.execute(stmt)
        state = result.scalars().first()

        if state:
            state.is_active = True
        else:
            state = SchemaVersionState(
                subject=subject,
                version=version_int,
                cluster=cluster,
                is_active=True
            )
            db.add(state)

        await db.commit()
        return True

    async def set_version_soft_delete(
        self, subject: str, version: Union[int, str], soft_deleted: bool, db: AsyncSession, cluster: str = "default"
    ) -> bool:
        """Soft delete or restore a schema version."""
        from app.models.schema_version_state import SchemaVersionState
        
        # Resolve version to integer for DB operations
        version_int = await self._resolve_version(subject, version, cluster)

        stmt = select(SchemaVersionState).where(
            SchemaVersionState.subject == subject,
            SchemaVersionState.version == version_int,
            SchemaVersionState.cluster == cluster
        )
        result = await db.execute(stmt)
        state = result.scalars().first()

        if state:
            state.is_soft_deleted = soft_deleted
        else:
            state = SchemaVersionState(
                subject=subject,
                version=version_int,
                cluster=cluster,
                is_soft_deleted=soft_deleted
            )
            db.add(state)

        await db.commit()
        return True

    async def get_schema_diff(
        self, subject: str, version1: Union[int, str], version2: Union[int, str], cluster: str = "default"
    ) -> dict:
        """Compare two schema versions and return structural changes."""
        s1 = await self.get_schema(subject, version1, cluster)
        s2 = await self.get_schema(subject, version2, cluster)

        def get_fields(schema_str, schema_type):
            try:
                if schema_type == "AVRO" or schema_type == "JSON":
                    import json
                    data = json.loads(schema_str)
                    if isinstance(data, dict) and "fields" in data:
                        return {f["name"]: f for f in data["fields"]}
                    return {} # Basic support for record-based schemas
                return {}
            except Exception:
                return {}

        type1 = s1.get("schemaType", "AVRO")
        type2 = s2.get("schemaType", "AVRO")
        
        fields1 = get_fields(s1["schema"], type1)
        fields2 = get_fields(s2["schema"], type2)

        added = [name for name in fields2 if name not in fields1]
        removed = [name for name in fields1 if name not in fields2]
        modified = [
            name for name in fields1 
            if name in fields2 and fields1[name] != fields2[name]
        ]

        return {
            "subject": subject,
            "v1": version1,
            "v2": version2,
            "changes": {
                "added": added,
                "removed": removed,
                "modified": modified
            }
        }


# Singleton instance
schema_registry_service = SchemaRegistryService()

