import aiomysql
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from ..schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceRead
from ..db.session import get_cursor

async def create_workspace(cursor: aiomysql.Cursor, workspace: WorkspaceCreate) -> WorkspaceRead:
    """Creates a new workspace record in the MySQL database."""
    sql = """
        INSERT INTO workspaces (name, type, floor, capacity, facilities, is_available, description, x_coord, y_coord)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    # Convert facilities list to JSON string for MySQL
    facilities_json = json.dumps(workspace.facilities)
    
    await cursor.execute(sql, (
        workspace.name,
        workspace.type,
        workspace.floor,
        workspace.capacity,
        facilities_json, # Store as JSON string
        workspace.is_available,
        workspace.description,
        workspace.x_coord,
        workspace.y_coord,
    ))
    
    # Get the ID of the inserted row
    new_id = cursor.lastrowid 
    if not new_id:
         raise Exception("Failed to get ID of created workspace")
    
    # Fetch the newly created row to return it
    return await get_workspace_by_id(cursor, new_id)

async def get_workspace_by_id(cursor: aiomysql.Cursor, workspace_id: int) -> Optional[WorkspaceRead]:
    """Retrieves a single workspace by its ID from MySQL."""
    sql = """
        SELECT id, name, type, floor, capacity, facilities, is_available, description, x_coord, y_coord 
        FROM workspaces 
        WHERE id = %s
    """
    await cursor.execute(sql, (workspace_id,))
    row = await cursor.fetchone()
    
    if row and row.get('facilities'):
        # Decode JSON string back to list
        row['facilities'] = json.loads(row['facilities'])
    
    return WorkspaceRead(**row) if row else None

async def get_workspaces(
    cursor: aiomysql.Cursor,
    skip: int = 0, 
    limit: int = 100,
    floor: Optional[int] = None,
    type: Optional[str] = None,
    min_capacity: Optional[int] = None,
    facilities_required: Optional[List[str]] = None,
    is_available: Optional[bool] = None
) -> List[WorkspaceRead]:
    """Retrieves a list of workspaces from MySQL with optional filtering and pagination."""
    query = "SELECT id, name, type, floor, capacity, facilities, is_available, description, x_coord, y_coord FROM workspaces WHERE 1=1"
    params = []

    if floor is not None:
        params.append(floor)
        query += f" AND floor = %s"
    if type:
        # Add wildcard for LIKE search
        params.append(f"%{type}%") 
        query += f" AND type LIKE %s" # Use LIKE for case-insensitive search in MySQL by default (depends on collation)
    if min_capacity is not None:
        params.append(min_capacity)
        query += f" AND capacity >= %s"
    if is_available is not None:
        params.append(is_available)
        query += f" AND is_available = %s"
    if facilities_required:
        # Check if JSON array contains all required elements
        # This requires iterating through the list in Python or complex JSON functions in SQL
        # Simple approach (less efficient for large datasets): fetch all matching other criteria and filter in Python
        # More complex SQL approach (MySQL 8.0+): Use JSON_CONTAINS or JSON_OVERLAPS
        # Let's add a placeholder comment for now and potentially filter post-query
        # query += " AND JSON_CONTAINS(facilities, %s)" # Requires formatting facilities_required correctly
        pass # Add post-query filtering if needed based on facilities_required

    # Add LIMIT and OFFSET
    query += " ORDER BY id LIMIT %s OFFSET %s" 
    params.extend([limit, skip])

    await cursor.execute(query, tuple(params))
    rows = await cursor.fetchall()
    
    workspaces = []
    for row in rows:
        if row.get('facilities'):
            row['facilities'] = json.loads(row['facilities'])
        else:
             row['facilities'] = [] # Ensure it's a list if NULL
        
        # Post-query filtering for facilities if needed
        if facilities_required:
            if not all(req_fac in row['facilities'] for req_fac in facilities_required):
                continue # Skip this row if not all required facilities are present
                
        workspaces.append(WorkspaceRead(**row))
        
    return workspaces

async def update_workspace(cursor: aiomysql.Cursor, workspace_id: int, workspace: WorkspaceUpdate) -> Optional[WorkspaceRead]:
    """Updates an existing workspace record in MySQL."""
    update_data = workspace.model_dump(exclude_unset=True)
    if not update_data:
        return await get_workspace_by_id(cursor, workspace_id)
        
    set_clauses = []
    params = []
    for key, value in update_data.items():
        if key == 'facilities' and value is not None:
             set_clauses.append(f"{key} = %s")
             params.append(json.dumps(value)) # Store as JSON string
        else:
             set_clauses.append(f"{key} = %s")
             params.append(value)
        
    params.append(workspace_id) # For the WHERE clause
    
    set_query = ", ".join(set_clauses)
    
    sql = f"UPDATE workspaces SET {set_query} WHERE id = %s"
    
    rows_affected = await cursor.execute(sql, tuple(params))
    
    if rows_affected > 0:
        # Fetch the updated row
        return await get_workspace_by_id(cursor, workspace_id)
    else:
        # Workspace ID not found or no rows updated
        return None

async def delete_workspace(cursor: aiomysql.Cursor, workspace_id: int) -> bool:
    """Deletes a workspace record from MySQL. Returns True if deleted, False otherwise."""
    sql = "DELETE FROM workspaces WHERE id = %s"
    try:
        rows_affected = await cursor.execute(sql, (workspace_id,))
        return rows_affected > 0
    except aiomysql.IntegrityError as e:
        # Check if it's a foreign key constraint violation (e.g., code 1451 in MySQL)
        if e.args[0] == 1451: 
            print(f"Cannot delete workspace {workspace_id} due to existing allocations (FK constraint).")
        else:
            print(f"Integrity error deleting workspace {workspace_id}: {e}")
        return False
    except Exception as e:
        print(f"Error deleting workspace {workspace_id}: {e}")
        return False 

async def get_workspace_status_by_schedule(cursor: aiomysql.Cursor, workspace_id: int) -> Dict[str, Any]:
    """Checks if a workspace is occupied based on current active allocations."""
    now_utc = datetime.now(timezone.utc)
    
    sql = """
        SELECT id, end_time
        FROM allocations
        WHERE workspace_id = %s
        AND status = 'Active'
        AND start_time <= %s
        AND end_time > %s
        ORDER BY end_time DESC
        LIMIT 1
    """
    
    await cursor.execute(sql, (workspace_id, now_utc, now_utc))
    active_booking = await cursor.fetchone()
    
    if active_booking:
        return {
            "workspace_id": workspace_id,
            "status": "Occupied",
            "occupied_until": active_booking['end_time'].isoformat() # Return ISO string
        }
    else:
        # Double check if the workspace itself is marked as available
        ws = await get_workspace_by_id(cursor, workspace_id)
        if ws and not ws.is_available:
             return {
                "workspace_id": workspace_id,
                "status": "Unavailable", # Different from Occupied
                "occupied_until": None 
            }
        elif ws:
             return {
                "workspace_id": workspace_id,
                "status": "Available",
                "occupied_until": None
            }
        else:
            # Handle case where workspace ID doesn't exist
            return {
                "workspace_id": workspace_id,
                "status": "Not Found",
                "occupied_until": None
            } 