from fastapi import APIRouter, Depends, HTTPException, Query, status
import aiomysql
from typing import List, Optional, Dict, Any
import json

from ..db.session import get_cursor
from ..schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceRead
from ..services import workspace_service # Import the service

router = APIRouter()

@router.post("/", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace: WorkspaceCreate,
    cursor = Depends(get_cursor)
):
    """
    Create a new workspace.
    """
    try:
        # Convert facilities list to JSON string
        facilities_json = json.dumps(workspace.facilities)
        
        # Insert into database
        sql = """
            INSERT INTO workspaces (name, type, floor, capacity, facilities, is_available, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        await cursor.execute(sql, (
            workspace.name, 
            workspace.type, 
            workspace.floor,
            workspace.capacity,
            facilities_json,
            workspace.is_available,
            workspace.description
        ))
        
        # Get the last inserted ID
        new_id = cursor.lastrowid
        
        # Fetch the created workspace
        await cursor.execute("SELECT * FROM workspaces WHERE id = %s", (new_id,))
        workspace_data = await cursor.fetchone()
        
        # Convert JSON to list
        if workspace_data["facilities"]:
            workspace_data["facilities"] = json.loads(workspace_data["facilities"])
        else:
            workspace_data["facilities"] = []
            
        return WorkspaceRead(**workspace_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create workspace: {str(e)}"
        )

@router.get("/", response_model=List[WorkspaceRead])
async def get_workspaces(
    is_available: Optional[bool] = Query(None, description="Filter by availability"),
    floor: Optional[int] = Query(None, description="Filter by floor"),
    type: Optional[str] = Query(None, description="Filter by workspace type"),
    min_capacity: Optional[int] = Query(None, ge=1, description="Minimum capacity"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of workspaces to return"),
    offset: int = Query(0, ge=0, description="Number of workspaces to skip"),
    cursor = Depends(get_cursor)
):
    """
    Get all workspaces with optional filtering.
    """
    # Count total before applying limit/offset for pagination
    count_query = "SELECT COUNT(*) as total FROM workspaces WHERE 1=1"
    count_params = []
    
    # Build the filter conditions
    conditions = []
    if is_available is not None:
        conditions.append("is_available = %s")
        count_params.append(is_available)
    
    if floor is not None:
        conditions.append("floor = %s")
        count_params.append(floor)
    
    if type is not None:
        conditions.append("type LIKE %s")
        count_params.append(f"%{type}%")
    
    if min_capacity is not None:
        conditions.append("capacity >= %s")
        count_params.append(min_capacity)
    
    # Add conditions to count query
    if conditions:
        count_query += " AND " + " AND ".join(conditions)
    
    # Get the total count
    await cursor.execute(count_query, tuple(count_params) if count_params else None)
    total = await cursor.fetchone()
    total_count = total["total"] if total else 0
    
    # Build the main query with LIMIT and OFFSET
    query = "SELECT id, name, type, floor, capacity, facilities, is_available, description FROM workspaces"
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY id LIMIT %s OFFSET %s"
    
    # Copy params for the main query
    params = list(count_params) if count_params else []
    params.extend([limit, offset])
    
    # Execute the main query with EXPLAIN hint for indexing
    await cursor.execute(f"EXPLAIN {query}", tuple(params))
    explain = await cursor.fetchall()  # For debugging if needed
    
    await cursor.execute(query, tuple(params))
    workspaces = await cursor.fetchall()
    
    # Process the result
    result = []
    for workspace in workspaces:
        if workspace["facilities"]:
            workspace["facilities"] = json.loads(workspace["facilities"])
        else:
            workspace["facilities"] = []
        result.append(WorkspaceRead(**workspace))
    
    return result

@router.get("/{workspace_id}", response_model=WorkspaceRead)
async def get_workspace(
    workspace_id: int,
    cursor = Depends(get_cursor)
):
    """
    Get a specific workspace by ID.
    """
    await cursor.execute("SELECT * FROM workspaces WHERE id = %s", (workspace_id,))
    workspace = await cursor.fetchone()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace with ID {workspace_id} not found"
        )
    
    # Process facilities
    if workspace["facilities"]:
        workspace["facilities"] = json.loads(workspace["facilities"])
    else:
        workspace["facilities"] = []
    
    return WorkspaceRead(**workspace)

@router.get("/{workspace_id}/status", response_model=Dict[str, Any])
async def get_workspace_status(
    workspace_id: int,
    cursor = Depends(get_cursor)
):
    """Check the current status (Available/Occupied/Unavailable) of a workspace based on schedule."""
    try:
        status_info = await workspace_service.get_workspace_status_by_schedule(
            cursor=cursor, workspace_id=workspace_id
        )
        if status_info["status"] == "Not Found":
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace with ID {workspace_id} not found"
            )
        return status_info
    except Exception as e:
        # Log the exception e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking workspace status: {str(e)}"
        )

@router.patch("/{workspace_id}", response_model=WorkspaceRead)
async def update_workspace(
    workspace_id: int,
    workspace: WorkspaceUpdate,
    cursor = Depends(get_cursor)
):
    """
    Update a workspace.
    """
    # Check if workspace exists
    await cursor.execute("SELECT * FROM workspaces WHERE id = %s", (workspace_id,))
    existing_workspace = await cursor.fetchone()
    
    if not existing_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace with ID {workspace_id} not found"
        )
    
    # Get the fields to update (exclude unset/None values)
    update_data = workspace.dict(exclude_unset=True)
    if not update_data:
        # If no fields to update, return the existing workspace
        if existing_workspace["facilities"]:
            existing_workspace["facilities"] = json.loads(existing_workspace["facilities"])
        else:
            existing_workspace["facilities"] = []
        return WorkspaceRead(**existing_workspace)
    
    # Prepare the SET statements and parameters
    set_statements = []
    params = []
    
    for field, value in update_data.items():
        if field == "facilities" and value is not None:
            set_statements.append(f"{field} = %s")
            params.append(json.dumps(value))
        else:
            set_statements.append(f"{field} = %s")
            params.append(value)
    
    # Add the workspace_id to params
    params.append(workspace_id)
    
    # Execute the update
    query = f"UPDATE workspaces SET {', '.join(set_statements)} WHERE id = %s"
    await cursor.execute(query, tuple(params))
    
    # Fetch the updated workspace
    await cursor.execute("SELECT * FROM workspaces WHERE id = %s", (workspace_id,))
    updated_workspace = await cursor.fetchone()
    
    # Process facilities
    if updated_workspace["facilities"]:
        updated_workspace["facilities"] = json.loads(updated_workspace["facilities"])
    else:
        updated_workspace["facilities"] = []
    
    return WorkspaceRead(**updated_workspace)

@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: int,
    cursor = Depends(get_cursor)
):
    """
    Delete a workspace.
    """
    # Check if workspace exists
    await cursor.execute("SELECT * FROM workspaces WHERE id = %s", (workspace_id,))
    existing_workspace = await cursor.fetchone()
    
    if not existing_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace with ID {workspace_id} not found"
        )
    
    # Check if there are active allocations for this workspace
    await cursor.execute(
        "SELECT COUNT(*) as count FROM allocations WHERE workspace_id = %s AND status = 'Active'", 
        (workspace_id,)
    )
    allocations = await cursor.fetchone()
    
    if allocations and allocations["count"] > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete workspace with ID {workspace_id} as it has active allocations"
        )
    
    # Delete the workspace
    await cursor.execute("DELETE FROM workspaces WHERE id = %s", (workspace_id,))
    
    return None 