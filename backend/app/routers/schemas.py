"""
Schema Registry Router - Schema Management Endpoints

Provides REST API endpoints for managing schemas in Confluent Schema Registry.
- Read-only operations: available to all authenticated users
- Write operations: admins execute immediately; non-admins get a pending request
"""

import json
import logging
from enum import Enum
from typing import List, Dict, Any, Optional, Annotated, Union

from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.services.schema_registry import schema_registry_service
from app.core.dependencies import verify_credentials, is_admin
from app.core.audit_logger import log_audit_event
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
    SubjectMetadataPaginatedResponse,
)
from app.models.schema_request import SchemaRequest
from app.models.schema_version_state import SchemaVersionState
from app.models.acl_request import RequestStatus

logger = logging.getLogger(__name__)

router = APIRouter()


# ──────────────────────────────────────────────────────────────────
# REQUEST BODIES
# ──────────────────────────────────────────────────────────────────


class CompatibilityLevel(str, Enum):
    """Valid Schema Registry compatibility levels."""
    BACKWARD            = "BACKWARD"
    BACKWARD_TRANSITIVE = "BACKWARD_TRANSITIVE"
    FORWARD             = "FORWARD"
    FORWARD_TRANSITIVE  = "FORWARD_TRANSITIVE"
    FULL                = "FULL"
    FULL_TRANSITIVE     = "FULL_TRANSITIVE"
    NONE                = "NONE"


class RegisterSchemaRequest(BaseModel):
    """
    Request body for registering a new schema.
    - AVRO / JSON: pass `schema` as a JSON object
    - PROTOBUF: pass `schema` as a plain .proto string
    """
    schema_definition: Union[Dict[str, Any], str] = Field(..., alias="schema")
    schema_type: SchemaType = SchemaType.AVRO
    # Optional fields for UI tracking
    topic: Optional[str] = None
    description: Optional[str] = None
    # Leave references empty unless you need schema references (rare)
    references: Optional[List[Dict[str, Any]]] = Field(default=None, exclude=True)


class CompatibilityCheckRequest(BaseModel):
    """Request body for checking schema compatibility."""
    schema_definition: Union[Dict[str, Any], str] = Field(..., alias="schema")
    schema_type: SchemaType = SchemaType.AVRO


class SetCompatibilityRequest(BaseModel):
    """Request body for setting subject compatibility level."""
    compatibility: CompatibilityLevel


# ──────────────────────────────────────────────────────────────────
# READ-ONLY ENDPOINTS  (all authenticated users)
# ──────────────────────────────────────────────────────────────────

@router.get("/subjects", response_model=List[str])
async def list_subjects(
    prefix: Optional[str] = Query(None, description="Filter subjects by prefix"),
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
):
    """List all subjects in the Schema Registry."""
    try:
        return await schema_registry_service.list_subjects(prefix=prefix, cluster=cluster)
    except SchemaRegistryError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list subjects: {str(e)}")


@router.get("/subjects/metadata", response_model=SubjectMetadataPaginatedResponse)
async def list_subjects_metadata(
    cluster: str = Query("default", description="Cluster identifier"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search subjects by name"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed, paginated metadata for all subjects.
    Returns: subject name, topic, schema type, latest version, and compatibility level.
    Optimized for the frontend schema table.
    """
    try:
        metadata = await schema_registry_service.get_subjects_metadata(
            cluster=cluster,
            page=page,
            page_size=page_size,
            search=search
        )
        
        # Enrich with DB data (topic bindings) and format version
        if metadata.get("items"):
            subject_names = [item["subject"] for item in metadata["items"]]
            
            # Fetch the latest topic mapping for these subjects
            stmt = select(SchemaRequest.subject, SchemaRequest.topic).where(
                SchemaRequest.subject.in_(subject_names),
                SchemaRequest.topic.isnot(None),
                SchemaRequest.topic != ""
            ).order_by(SchemaRequest.subject, SchemaRequest.created_at.desc())
            
            result = await db.execute(stmt)
            topic_map = {}
            for row in result.all():
                if row.subject not in topic_map:
                    topic_map[row.subject] = row.topic
                    
            for item in metadata["items"]:
                item["topic"] = topic_map.get(item["subject"])
                # Add version display format (e.g., "v3")
                if item.get("latest_version") is not None:
                    item["version_display"] = f"v{item['latest_version']}"
                
        return metadata
    except SchemaRegistryError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subjects metadata: {str(e)}")



@router.get("/subjects/{subject}/versions", response_model=SchemaVersionResponse)
async def get_schema_versions(
    subject: str,
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
):
    """Get all versions of a schema for a subject."""
    try:
        return await schema_registry_service.get_schema_versions(subject=subject, cluster=cluster)
    except SchemaNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SchemaRegistryError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get schema versions: {str(e)}")


from app.schemas.schemas import SchemaVersionHistoryItem

@router.get("/subjects/{subject}/history", response_model=List[SchemaVersionHistoryItem])
async def get_schema_history(
    subject: str,
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the version history for a schema subject.
    Combines live data from Schema Registry with audit data from the DB.
    """
    try:
        # Get live versions
        versions_info = await schema_registry_service.get_schema_versions(subject=subject, cluster=cluster)
        
        history_items = []
        for v in versions_info.versions:
            schema_data = await schema_registry_service.get_schema(subject=subject, version=str(v), cluster=cluster)
            
            # Fetch corresponding audit record from DB
            stmt = select(SchemaRequest).where(
                SchemaRequest.subject == subject,
                SchemaRequest.operation == "REGISTER_SCHEMA",
                SchemaRequest.status == RequestStatus.APPROVED,
            ).order_by(SchemaRequest.created_at.desc())
            
            result = await db.execute(stmt)
            db_records = result.scalars().all()
            
            # Try to match DB record to this version loosely based on ordering or exact matching if possible
            # But normally there is 1:1 if we look at the timeline.
            # To be safe and since SR doesn't store our DB ID, we'll try to find any matching schema string or just show the latest valid audit note for the subject timeline
            
            matched_record = None
            for rec in db_records:
                # Basic matching heuristic: if it's the exact same schema string or just the most recent approved action
                matched_record = rec
                break 

            # Fetch governance state from DB
            state_stmt = select(SchemaVersionState).where(
                SchemaVersionState.subject == subject,
                SchemaVersionState.version == v,
                SchemaVersionState.cluster == cluster
            )
            state_result = await db.execute(state_stmt)
            governance_state = state_result.scalars().first()

            item = SchemaVersionHistoryItem(
                version=v,
                schema_id=schema_data.get("id", 0),
                schema_type=versions_info.schema_type,
                schema_def=schema_data.get("schema"),
                is_active=governance_state.is_active if governance_state else False,
                is_soft_deleted=governance_state.is_soft_deleted if governance_state else False,
            )
            
            if matched_record:
                item.created_at = matched_record.updated_at or matched_record.created_at
                item.username = matched_record.username
                item.approved_by = matched_record.approved_by
                item.status = matched_record.status.name if matched_record.status else "APPROVED"
                item.description = matched_record.description

            # Default fallbacks if no DB record found
            if not item.username:
                item.username = "admin (CLI/External)"
            if not item.status:
                item.status = "APPROVED"
                
            history_items.append(item)
            
        # Return descending order (latest version first)
        history_items.sort(key=lambda x: x.version, reverse=True)
        return history_items

    except SchemaNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # Only fail hard if SR fails.
        logger.error(f"Error fetching schema history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get schema history: {str(e)}")


@router.get("/subjects/{subject}/versions/{version}")
async def get_schema(
    subject: str,
    version: str,
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
):
    """Get a specific schema version. Version can be a number or 'latest'."""
    try:
        return await schema_registry_service.get_schema(subject=subject, version=version, cluster=cluster)
    except SchemaNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SchemaRegistryError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get schema: {str(e)}")


@router.get("/config/{subject}")
async def get_subject_compatibility(
    subject: str,
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
):
    """Get the compatibility setting for a subject."""
    try:
        return await schema_registry_service.get_subject_compatibility(subject=subject, cluster=cluster)
    except SchemaNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SchemaRegistryError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get compatibility: {str(e)}")


@router.post("/compatibility/subjects/{subject}/versions/{version}", response_model=CompatibilityCheckResponse)
async def check_compatibility(
    subject: str,
    version: str,
    compatibility_request: CompatibilityCheckRequest,
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
):
    """Check if a schema is compatible with an existing version."""
    # Protobuf is plain text; AVRO/JSON are JSON objects
    schema_str = (
        compatibility_request.schema_definition
        if isinstance(compatibility_request.schema_definition, str)
        else json.dumps(compatibility_request.schema_definition)
    )
    try:
        return await schema_registry_service.check_compatibility(
            subject=subject,
            version=version,
            schema_str=schema_str,
            schema_type=compatibility_request.schema_type,
            cluster=cluster
        )
    except SchemaNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SchemaRegistryError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check compatibility: {str(e)}")


# ──────────────────────────────────────────────────────────────────
# WRITE ENDPOINTS  (admin = immediate, non-admin = pending request)
# ──────────────────────────────────────────────────────────────────

@router.post("/subjects/{subject}/versions", response_model=SchemaResponse)
async def register_schema(
    subject: str,
    schema_request: Annotated[
        RegisterSchemaRequest,
        Body(
            openapi_examples={
                "avro": {
                    "summary": "AVRO schema",
                    "description": "A standard Avro Record schema with two fields.",
                    "value": {
                        "schema": {
                            "type": "record",
                            "name": "User",
                            "namespace": "com.example",
                            "fields": [
                                {"name": "id",   "type": "int"},
                                {"name": "name", "type": "string"},
                                {"name": "email", "type": ["null", "string"], "default": None}
                            ]
                        },
                        "schema_type": "AVRO"
                    }
                },
                "json_schema": {
                    "summary": "JSON Schema",
                    "description": "A JSON Schema (Draft 7) definition.",
                    "value": {
                        "schema": {
                            "$schema": "http://json-schema.org/draft-07/schema#",
                            "title": "Order",
                            "type": "object",
                            "properties": {
                                "order_id": {"type": "integer"},
                                "product":  {"type": "string"},
                                "quantity":  {"type": "integer"}
                            },
                            "required": ["order_id", "product"]
                        },
                        "schema_type": "JSON"
                    }
                },
                "protobuf": {
                    "summary": "Protobuf schema",
                    "description": "A Protocol Buffers v3 message. Pass the .proto text as a plain string.",
                    "value": {
                        "schema": 'syntax = "proto3"; message Payment { string id = 1; double amount = 2; string currency = 3; }',
                        "schema_type": "PROTOBUF"
                    }
                }
            }
        )
    ],
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new schema under a subject.
    - Admins: Schema is registered immediately.
    - Normal users: A pending request is created for admin approval (HTTP 202).

    **schema_type options:** `AVRO` (default) | `JSON` | `PROTOBUF`
    """
    username = user_info.get("username")

    # Protobuf schemas come as plain text strings; AVRO/JSON come as dicts
    schema_str = (
        schema_request.schema_definition
        if isinstance(schema_request.schema_definition, str)
        else json.dumps(schema_request.schema_definition)
    )
    if not is_admin(username):
        # Prevent duplicate pending requests
        stmt = select(SchemaRequest).where(
            SchemaRequest.username == username,
            SchemaRequest.operation == "REGISTER_SCHEMA",
            SchemaRequest.subject == subject,
            SchemaRequest.status == RequestStatus.PENDING,
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A pending registration request (ID: {existing.id}) already exists for subject '{subject}'. It is already in the database waiting for approval.",
            )

        schema_req = SchemaRequest(
            username=username,
            operation="REGISTER_SCHEMA",
            subject=subject,
            schema_str=schema_str,
            schema_type=schema_request.schema_type.value,
            topic=schema_request.topic,
            description=schema_request.description,
            references=schema_request.references,
            cluster=cluster,
            status=RequestStatus.PENDING,
        )
        db.add(schema_req)
        await db.commit()
        await db.refresh(schema_req)

        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="REQUEST_REGISTER_SCHEMA",
            resource_type="SCHEMA",
            resource_name=subject,
            message=f"User {username} requested registration of schema for subject '{subject}'"
        )

        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail=f"Schema registration request submitted (ID: {schema_req.id}). Waiting for admin approval.",
        )

    # Admin – execute immediately
    try:
        result = await schema_registry_service.register_schema(
            subject=subject,
            schema_str=schema_str,
            schema_type=schema_request.schema_type,
            references=schema_request.references,
            cluster=cluster
        )

        # Log to audit table
        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="REGISTER_SCHEMA",
            resource_type="SCHEMA",
            resource_name=subject,
            message=f"Admin {username} registered {schema_request.schema_type.value} schema for subject '{subject}'"
        )
        return result
    except SchemaConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except SchemaRegistryError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register schema: {str(e)}")


@router.delete("/subjects/{subject}")
async def delete_subject(
    subject: str,
    permanent: bool = Query(False, description="Permanently delete (hard delete)"),
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a subject and all its versions.
    - Admins: Deleted immediately.
    - Normal users: A pending request is created for admin approval (HTTP 202).
    """
    username = user_info.get("username")

    if not is_admin(username):
        # Prevent duplicate pending requests
        stmt = select(SchemaRequest).where(
            SchemaRequest.username == username,
            SchemaRequest.operation == "DELETE_SUBJECT",
            SchemaRequest.subject == subject,
            SchemaRequest.status == RequestStatus.PENDING,
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A pending deletion request (ID: {existing.id}) already exists for subject '{subject}'. It is already in the database waiting for approval.",
            )

        schema_req = SchemaRequest(
            username=username,
            operation="DELETE_SUBJECT",
            subject=subject,
            permanent=permanent,
            cluster=cluster,
            status=RequestStatus.PENDING,
        )
        db.add(schema_req)
        await db.commit()
        await db.refresh(schema_req)

        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="REQUEST_DELETE_SUBJECT",
            resource_type="SCHEMA",
            resource_name=subject,
            message=f"User {username} requested deletion of subject '{subject}'"
        )

        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail=f"Subject deletion request submitted (ID: {schema_req.id}). Waiting for admin approval.",
        )

    # Admin – execute immediately
    try:
        await schema_registry_service.delete_subject(subject=subject, permanent=permanent, cluster=cluster)
        
        # Log to audit table
        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="DELETE_SUBJECT",
            resource_type="SCHEMA",
            resource_name=subject,
            message=f"Admin {username} deleted subject '{subject}' (Permanent: {permanent})"
        )
        
        delete_type = "permanently deleted" if permanent else "deleted (soft)"
        return {"message": f"Subject '{subject}' {delete_type} successfully"}
    except SchemaNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SchemaRegistryError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete subject: {str(e)}")


@router.delete("/subjects/{subject}/versions/{version}")
async def delete_schema_version(
    subject: str,
    version: Union[int, str],
    permanent: bool = Query(False, description="Permanently delete (hard delete)"),
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a specific schema version.
    - Admins: Deleted immediately.
    - Normal users: A pending request is created for admin approval (HTTP 202).
    """
    username = user_info.get("username")

    if not is_admin(username):
        # Prevent duplicate pending requests
        stmt = select(SchemaRequest).where(
            SchemaRequest.username == username,
            SchemaRequest.operation == "DELETE_SCHEMA_VERSION",
            SchemaRequest.subject == subject,
            SchemaRequest.version == version,
            SchemaRequest.status == RequestStatus.PENDING,
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A pending version deletion request (ID: {existing.id}) already exists for '{subject}' v{version}. It is already in the database waiting for approval.",
            )

        schema_req = SchemaRequest(
            username=username,
            operation="DELETE_SCHEMA_VERSION",
            subject=subject,
            version=version,
            permanent=permanent,
            cluster=cluster,
            status=RequestStatus.PENDING,
        )
        db.add(schema_req)
        await db.commit()
        await db.refresh(schema_req)

        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="REQUEST_DELETE_SCHEMA_VERSION",
            resource_type="SCHEMA",
            resource_name=f"{subject}:v{version}",
            message=f"User {username} requested deletion of version {version} for subject '{subject}'"
        )

        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail=f"Schema version deletion request submitted (ID: {schema_req.id}). Waiting for admin approval.",
        )

    # Admin – execute immediately
    try:
        await schema_registry_service.delete_schema_version(
            subject=subject, version=version, permanent=permanent, cluster=cluster
        )

        # Log to audit table
        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="DELETE_SCHEMA_VERSION",
            resource_type="SCHEMA",
            resource_name=f"{subject}:v{version}",
            message=f"Admin {username} deleted version {version} for subject '{subject}' (Permanent: {permanent})"
        )

        delete_type = "permanently deleted" if permanent else "deleted (soft)"
        return {"message": f"Schema version {version} for subject '{subject}' {delete_type} successfully"}
    except SchemaNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SchemaRegistryError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete schema version: {str(e)}")


@router.put("/config/{subject}")
async def set_subject_compatibility(
    subject: str,
    request: SetCompatibilityRequest,
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    """
    Set the compatibility level for a subject.
    - Admins: Updated immediately.
    - Normal users: A pending request is created for admin approval (HTTP 202).
    """
    username = user_info.get("username")

    if not is_admin(username):
        # Prevent duplicate pending requests
        stmt = select(SchemaRequest).where(
            SchemaRequest.username == username,
            SchemaRequest.operation == "SET_COMPATIBILITY",
            SchemaRequest.subject == subject,
            SchemaRequest.status == RequestStatus.PENDING,
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A pending compatibility request (ID: {existing.id}) already exists for subject '{subject}'. It is already in the database waiting for approval.",
            )

        schema_req = SchemaRequest(
            username=username,
            operation="SET_COMPATIBILITY",
            subject=subject,
            compatibility=request.compatibility.value,
            cluster=cluster,
            status=RequestStatus.PENDING,
        )
        db.add(schema_req)
        await db.commit()
        await db.refresh(schema_req)

        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="REQUEST_SET_COMPATIBILITY",
            resource_type="SCHEMA",
            resource_name=subject,
            message=f"User {username} requested compatibility update for subject '{subject}' to {request.compatibility.value}"
        )

        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail=f"Compatibility update request submitted (ID: {schema_req.id}). Waiting for admin approval.",
        )

    # Admin – execute immediately
    try:
        result = await schema_registry_service.set_subject_compatibility(
            subject=subject,
            compatibility=request.compatibility.value,
            cluster=cluster
        )

        # Log to audit table
        await log_audit_event(
            db=db,
            level="INFO",
            username=username,
            action="SET_COMPATIBILITY",
            resource_type="SCHEMA",
            resource_name=subject,
            message=f"Admin {username} updated compatibility for subject '{subject}' to {request.compatibility.value}"
        )
        return result
    except SchemaNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SchemaRegistryError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set compatibility: {str(e)}")

@router.put("/subjects/{subject}/versions/{version}/promote")
async def promote_schema_version(
    subject: str,
    version: Union[int, str],
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    """
    Promote a specific schema version to ACTIVE status.
    - Admins: Promoted immediately.
    - Normal users: A pending request is created for admin approval (HTTP 202).
    """
    username = user_info.get("username")

    if not is_admin(username):
        stmt = select(SchemaRequest).where(
            SchemaRequest.username == username,
            SchemaRequest.operation == "PROMOTE_SCHEMA_VERSION",
            SchemaRequest.subject == subject,
            SchemaRequest.version == str(version),
            SchemaRequest.status == RequestStatus.PENDING,
        )
        result = await db.execute(stmt)
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A pending promotion request already exists for '{subject}' v{version}.",
            )

        schema_req = SchemaRequest(
            username=username,
            operation="PROMOTE_SCHEMA_VERSION",
            subject=subject,
            version=str(version),
            cluster=cluster,
            status=RequestStatus.PENDING,
        )
        db.add(schema_req)
        await db.commit()
        await log_audit_event(
            db=db, level="INFO", username=username, action="REQUEST_PROMOTE_SCHEMA_VERSION",
            resource_type="SCHEMA", resource_name=f"{subject}:v{version}",
            message=f"User {username} requested promotion of version {version} for subject '{subject}'"
        )
        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail="Promotion request submitted. Waiting for admin approval.",
        )

    # Admin
    success = await schema_registry_service.promote_version(subject, version, db, cluster)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to promote version")
    await log_audit_event(
        db=db, level="INFO", username=username, action="PROMOTE_SCHEMA_VERSION",
        resource_type="SCHEMA", resource_name=f"{subject}:v{version}",
        message=f"Admin promoted version {version} of subject {subject} to ACTIVE"
    )
    return {"message": f"Version {version} of {subject} promoted to ACTIVE successfully"}


@router.put("/subjects/{subject}/versions/{version}/soft-delete")
async def soft_delete_schema_version(
    subject: str,
    version: Union[int, str],
    cluster: str = Query("default"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    """
    Hide a schema version from standard views (Governance soft-delete).
    """
    username = user_info.get("username")

    if not is_admin(username):
        stmt = select(SchemaRequest).where(
            SchemaRequest.username == username,
            SchemaRequest.operation == "SOFT_DELETE_SCHEMA_VERSION",
            SchemaRequest.subject == subject,
            SchemaRequest.version == str(version),
            SchemaRequest.status == RequestStatus.PENDING,
        )
        result = await db.execute(stmt)
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A pending soft-delete request already exists for '{subject}' v{version}.",
            )

        schema_req = SchemaRequest(
            username=username,
            operation="SOFT_DELETE_SCHEMA_VERSION",
            subject=subject,
            version=str(version),
            cluster=cluster,
            status=RequestStatus.PENDING,
        )
        db.add(schema_req)
        await db.commit()
        await log_audit_event(
            db=db, level="INFO", username=username, action="REQUEST_SOFT_DELETE_SCHEMA_VERSION",
            resource_type="SCHEMA", resource_name=f"{subject}:v{version}",
            message=f"User {username} requested soft-delete of version {version} for subject '{subject}'"
        )
        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail="Soft-delete request submitted. Waiting for admin approval.",
        )

    # Admin
    success = await schema_registry_service.set_version_soft_delete(subject, version, True, db, cluster)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to soft delete version")
    await log_audit_event(
        db=db, level="INFO", username=username, action="SOFT_DELETE_SCHEMA_VERSION",
        resource_type="SCHEMA", resource_name=f"{subject}:v{version}",
        message=f"Admin soft-deleted version {version} of subject {subject}"
    )
    return {"message": f"Version {version} of {subject} soft-deleted successfully"}


@router.put("/subjects/{subject}/versions/{version}/restore")
async def restore_schema_version(
    subject: str,
    version: Union[int, str],
    cluster: str = Query("default"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    """
    Restore a soft-deleted schema version.
    """
    username = user_info.get("username")

    if not is_admin(username):
        stmt = select(SchemaRequest).where(
            SchemaRequest.username == username,
            SchemaRequest.operation == "RESTORE_SCHEMA_VERSION",
            SchemaRequest.subject == subject,
            SchemaRequest.version == str(version),
            SchemaRequest.status == RequestStatus.PENDING,
        )
        result = await db.execute(stmt)
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A pending restore request already exists for '{subject}' v{version}.",
            )

        schema_req = SchemaRequest(
            username=username,
            operation="RESTORE_SCHEMA_VERSION",
            subject=subject,
            version=str(version),
            cluster=cluster,
            status=RequestStatus.PENDING,
        )
        db.add(schema_req)
        await db.commit()
        await log_audit_event(
            db=db, level="INFO", username=username, action="REQUEST_RESTORE_SCHEMA_VERSION",
            resource_type="SCHEMA", resource_name=f"{subject}:v{version}",
            message=f"User {username} requested restore of version {version} for subject '{subject}'"
        )
        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail="Restore request submitted. Waiting for admin approval.",
        )

    # Admin
    success = await schema_registry_service.set_version_soft_delete(subject, version, False, db, cluster)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to restore version")
    await log_audit_event(
        db=db, level="INFO", username=username, action="RESTORE_SCHEMA_VERSION",
        resource_type="SCHEMA", resource_name=f"{subject}:v{version}",
        message=f"Admin restored version {version} of subject {subject}"
    )
    return {"message": f"Version {version} of {subject} restored successfully"}


@router.get("/subjects/{subject}/diff")
async def get_schema_diff(
    subject: str,
    v1: Union[int, str] = Query(...),
    v2: Union[int, str] = Query(...),
    cluster: str = Query("default"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
):
    """Compare two schema versions."""
    return await schema_registry_service.get_schema_diff(subject, v1, v2, cluster)