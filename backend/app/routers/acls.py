import logging
from typing import List
 
logger = logging.getLogger(__name__)
from fastapi import APIRouter, HTTPException, Query
 
from app.services.kafka_admin import kafka_admin_service
from app.core.exceptions import AclError, KafkaConnectionError,AclPermissionDeniedError,AclNotFoundError
from app.schemas.acls import AclResponse, ResourceType, AclOperation, AclPermissionType,PatternType
from app.core.config import settings
from app.core.dependencies import verify_credentials, is_admin
from fastapi import Depends
from typing import Dict, Any, Optional
from app.core.audit_logger import log_audit_event

from app.models.acl_request import AclRequest, RequestStatus
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import status

router = APIRouter()

async def check_permission(
    username: str, 
    operation: str, 
    resource_type: str, 
    resource_name: str, 
    db: AsyncSession,
    kafka_operation: str = None,
    permission_type: str = None,
    pattern_type: str = "LITERAL",
    principal: str = None,
    host: str = "*",
    cluster: str = "default"
):
    if is_admin(username):
        return
    
    # Check for APPROVED permission with granular details
    # Allow ANY or ALL to satisfy specific requests
    query = select(AclRequest).where(
        AclRequest.username == username,
        AclRequest.resource_type == resource_type,
        AclRequest.resource_name == resource_name,
        AclRequest.pattern_type == pattern_type,
        AclRequest.cluster == cluster,
        AclRequest.status == RequestStatus.APPROVED
    )
    
    # Optimization: Fetch all approved requests for this resource and check in code
    # This handles complex OR logic better than multiple DB queries
    result = await db.execute(query)
    approved_requests = result.scalars().all()
    
    for req in approved_requests:
        # Check operation (API level)
        if req.operation != operation:
            continue
            
        # Check Kafka operation
        if kafka_operation:
            if req.kafka_operation == "ANY" or req.kafka_operation == "ALL" or req.kafka_operation == kafka_operation:
                pass
            else:
                continue
        
        # Check permission type
        if permission_type:
             if req.permission_type == permission_type:
                 pass
             else:
                 continue
                 
        # If we get here, we found a matching permission
        return None

    # Check for any existing request (PENDING or REJECTED) to avoid duplicates
    request_query = select(AclRequest).where(
        AclRequest.username == username,
        AclRequest.operation == operation,
        AclRequest.resource_type == resource_type,
        AclRequest.resource_name == resource_name,
        AclRequest.pattern_type == pattern_type,
        AclRequest.cluster == cluster,
        AclRequest.status.in_([RequestStatus.PENDING, RequestStatus.REJECTED])
    )

    if kafka_operation:
        request_query = request_query.where(AclRequest.kafka_operation == kafka_operation)
    if permission_type:
        request_query = request_query.where(AclRequest.permission_type == permission_type)

    result = await db.execute(request_query)
    existing_request = result.scalars().first()

    if existing_request:
        if existing_request.status == RequestStatus.PENDING:
             detail_msg = f"A request is already PENDING for {operation} on {resource_type} '{resource_name}'"
             if kafka_operation:
                 detail_msg += f" (Kafka Op: {kafka_operation})"
             detail_msg += f". It is already in the database waiting for approval. (Request ID: {existing_request.id})"
             
             raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=detail_msg
            )
        elif existing_request.status == RequestStatus.REJECTED:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Your request was REJECTED by admin."
            )
    
    # No request exists, create one automatically
    new_request = AclRequest(
        username=username,
        operation=operation,
        kafka_operation=kafka_operation,
        permission_type=permission_type,
        pattern_type=pattern_type,
        resource_type=resource_type,
        resource_name=resource_name,
        principal=principal,
        host=host,
        cluster=cluster,
        status=RequestStatus.PENDING
    )
    db.add(new_request)
    await db.commit()
    await db.refresh(new_request)

    detail_msg = f"Permission requested. An approval request has been automatically submitted for {operation} on {resource_type} {resource_name}"
    if kafka_operation:
        detail_msg += f" (Kafka Op: {kafka_operation})"
    detail_msg += ". Please wait for admin approval."

    await log_audit_event(
        db=db,
        level="INFO",
        username=username,
        action="REQUEST_CREATE_ACL",
        resource_type="ACL",
        resource_name=resource_name,
        message=f"User {username} requested {operation} on {resource_type} '{resource_name}'"
    )

    return {"detail": detail_msg, "request_id": new_request.id}

 
 
from app.schemas.acls import AclResponse, ResourceType, AclOperation, AclPermissionType, PatternType, AclMetadataPaginatedResponse

@router.get("/", response_model=AclMetadataPaginatedResponse)
async def list_acls(
    cluster: str = Query("default", description="Cluster identifier"),
    resource_type: ResourceType | None = Query(None, description="Filter by resource type"),
    resource_name: str | None = Query(None, description="Filter by resource name"),
    principal: str | None = Query(None, description="Filter by principal"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for resource name or principal"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    username = user_info.get("username")
    is_admin_user = user_info.get("is_admin", False)
    is_admin_user = user_info.get("is_admin", False)
    
    # Sanitize principal parameter - remove all spaces (e.g., "User: sai" -> "User:sai")
    sanitized_principal_param = principal.replace(" ", "") if principal else principal
    
    # Permission check
    # For listing, if user is not admin:
    # 1. If checking their own principal, allow.
    # 2. If checking a resource, enforce resource permission.
    if not is_admin_user:
        # Check if user is listing their own ACLs
        is_own_principal = False
        if sanitized_principal_param and (sanitized_principal_param == f"User:{username}" or sanitized_principal_param == username):
            is_own_principal = True
            
        if is_own_principal:
            # Allow listing own ACLs without resource constraints
            pass
        elif not resource_type or not resource_name:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Non-admin users must specify resource_type and resource_name, or filter by their own principal, to view ACLs"
            )
        else:
            # Check if user has ANY approved permission for this resource (READ, WRITE, etc.)
            # If they have access to touch it, they should be able to see it.
            stmt = select(AclRequest).where(
                AclRequest.username == username,
                AclRequest.resource_type == resource_type.value,
                AclRequest.resource_name == resource_name,
                AclRequest.status == RequestStatus.APPROVED
            )
            result = await db.execute(stmt)
            any_permission = result.scalars().first()

            if not any_permission:
                # Fallback 1: Check if user has ANY actual ACLs on this resource in Kafka
                # This covers cases where ACLs were created manually or via POST without a corresponding DB record
                try:
                    user_principal = f"User:{username}"
                    existing_user_acls = await kafka_admin_service.list_acls(
                        cluster=cluster,
                        resource_type=resource_type,
                        resource_name=resource_name,
                        principal=user_principal
                    )
                    if existing_user_acls:
                        # User has permissions on this resource, allow them to view it
                        pass
                    else:
                        # Fallback 2: Strict check (triggers auto-request for GET/DESCRIBE)
                        result = await check_permission(username, "GET", resource_type.value, resource_name, db, kafka_operation="DESCRIBE", permission_type="ALLOW", cluster=cluster)
                        if result:
                            from fastapi.responses import JSONResponse
                            return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content=result)
                except HTTPException:
                    raise
                except Exception:
                    # If Kafka check fails, fall back to strict check
                    result = await check_permission(username, "GET", resource_type.value, resource_name, db, kafka_operation="DESCRIBE", permission_type="ALLOW", cluster=cluster)
                    if result:
                        from fastapi.responses import JSONResponse
                        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content=result)

 
    try:
        print("cluster", cluster)
        print("resource_type", resource_type)
        print("resource_name", resource_name)
        print("principal", principal)
 
       
        return await kafka_admin_service.list_acls(
            cluster=cluster,
            resource_type=resource_type,
            resource_name=resource_name,
            principal=sanitized_principal_param,
            page=page,
            page_size=page_size,
            search=search,
        )
 
    except KafkaConnectionError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=f"Connection Error: {e.message}",
        )
 
    except AclError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=f"ACL Error: {e.message}",
        )
 
    except Exception as e:
        print(f"CRITICAL ERROR: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}",
        )
 
 
@router.post("/", response_model=AclResponse)
async def create_acl(
    resource_type: ResourceType,
    resource_name: str,
    principal: str,
    operation: AclOperation,
    permission_type: AclPermissionType,
    pattern_type: PatternType = Query(PatternType.LITERAL, description="Pattern type for matching"),
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    username = user_info.get("username")
    is_admin_user = user_info.get("is_admin", False)
    
    # Sanitize principal - remove all spaces (e.g., "User: sai" -> "User:sai")
    sanitized_principal = principal.replace(" ", "") if principal else principal
    
    result = await check_permission(
        username, 
        "POST", 
        resource_type.value, 
        resource_name, 
        db, 
        kafka_operation=operation.value, 
        permission_type=permission_type.value,
        pattern_type=pattern_type.value,
        principal=sanitized_principal,
        host="*",
        cluster=cluster
    )
    if result:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content=result)

    try:
        logger.debug(f"Creating ACL - resource_type: {resource_type}, resource_name: {resource_name}, principal: {sanitized_principal}, operation: {operation}")
 
        from app.models.admin_action import AdminAcl
        
        result = await kafka_admin_service.create_acl(
            resource_type=resource_type,
            resource_name=resource_name,
            pattern_type=pattern_type,
            principal=sanitized_principal,
            host="*",
            operation=operation,
            permission_type=permission_type,
            cluster=cluster
        )

        # If admin, log the action to database
        if is_admin_user:
            await log_audit_event(
                db=db,
                level="INFO",
                username=username,
                action="CREATE_ACL",
                resource_type="ACL",
                resource_name=resource_name,
                message=f"Admin {username} created ACL: {sanitized_principal} {operation.value} on {resource_type.value} '{resource_name}'"
            )

        return result
 
    except KafkaConnectionError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={
                "error_code": e.error_code,
                "message": e.message,
                "details": e.details
            },
        )
    except AclPermissionDeniedError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=f"{e.error_code}: {e.message}"
        )
    except TypeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid input type: {str(e)}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid input value: {str(e)}"
        )
    except AclError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=f"{e.error_code}: {e.message}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
 
 
 
 
@router.delete("/")
async def delete_acl(
    resource_type: ResourceType,
    resource_name:str,
    principal: str,
    operation: AclOperation,
    permission_type:AclPermissionType,
    pattern_type: PatternType = Query(PatternType.LITERAL, description="Pattern type for matching"),
    cluster: str = Query("default", description="Cluster identifier"),
    user_info: Dict[str, Any] = Depends(verify_credentials),
    db: AsyncSession = Depends(get_db),
):
    username = user_info.get("username")
    is_admin_user = user_info.get("is_admin", False)
    
    # Sanitize principal - remove all spaces (e.g., "User: sai" -> "User:sai")
    sanitized_principal = principal.replace(" ", "") if principal else principal
    
    result = await check_permission(
        username, 
        "DELETE", 
        resource_type.value, 
        resource_name, 
        db, 
        kafka_operation=operation.value, 
        permission_type=permission_type.value,
        pattern_type=pattern_type.value,
        principal=sanitized_principal,
        host="*",
        cluster=cluster
    )
    if result:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content=result)

    try:
        logger.debug(f"Deleting ACL - resource_type: {resource_type}, resource_name: {resource_name}, principal: {sanitized_principal}, operation: {operation}")
 
        await kafka_admin_service.delete_acl(
            resource_type=resource_type,
            resource_name=resource_name,
            pattern_type=pattern_type,
            principal=sanitized_principal,
            host="*",
            operation=operation,
            permission_type=permission_type,
            cluster=cluster
        )

        # Log to audit table
        if is_admin_user:
            await log_audit_event(
                db=db,
                level="INFO",
                username=username,
                action="DELETE_ACL",
                resource_type="ACL",
                resource_name=resource_name,
                message=f"Admin {username} deleted ACL: {sanitized_principal} {operation.value} on {resource_type.value} '{resource_name}'"
            )

        return {"message": "ACL deleted successfully"}
 
   
    except KafkaConnectionError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={
                "error_code": e.error_code,
                "message": e.message,
                "details": e.details
            },
        )
 
 
    except AclPermissionDeniedError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=f"{e.error_code}: {e.message}"
        )
 
    except AclNotFoundError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=f"{e.error_code}: {e.message}"
        )
 
   
    except AclError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=f"{e.error_code}: {e.message}"
        )
 
   
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid value: {str(e)}"
        )
    except TypeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid input type: {str(e)}"
        )
 
   
    except TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Kafka request timed out while deleting ACL"
        )
 
   
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
