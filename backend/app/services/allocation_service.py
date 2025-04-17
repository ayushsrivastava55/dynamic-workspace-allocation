import aiomysql # Use aiomysql
import json # For handling JSON data
from datetime import datetime
from typing import List, Optional, Dict, Any
import asyncio # Needed for running ML model concurrently
from enum import Enum # Import Enum

from ..schemas.allocation import (AllocationCreate, AllocationUpdate, 
                                    AllocationRead, AllocationConfirm, NeedLevel)
from ..schemas.workspace import WorkspaceRead
from ..schemas.user import UserRead # Needed for user data
from ..services import workspace_service, user_service # Import user_service
from ..ml.workspace_allocator import WorkspaceAllocator # Import the new allocator
from ..db.session import get_cursor # Import get_cursor

# Create a single instance of the allocator when the module is loaded
# This might take a few seconds on startup depending on model size
allocator = WorkspaceAllocator()

# Removed the placeholder get_ml_workspace_suggestions function

async def suggest_workspaces_for_request(
    cursor: aiomysql.Cursor, # Use cursor
    request: AllocationCreate
) -> List[AllocationRead]: 
    """Finds available workspaces and uses ML to suggest the best ones (MySQL version)."""
    print(f"Suggesting workspaces for request: {request}") # Debugging line

    # 1. Fetch requesting user's details
    user = await user_service.get_user_by_id(cursor, request.user_id)
    if not user:
        raise ValueError(f"User with ID {request.user_id} not found.")
    user_data = user.model_dump()
    
    # 2. Find potentially suitable workspaces using named placeholders
    # Define the base query parts
    base_query = """
    SELECT id, name, type, floor, capacity, facilities, is_available, description, x_coord, y_coord 
    FROM workspaces w 
    WHERE w.capacity >= %(team_size)s AND w.is_available = true
    """
    
    overlap_condition = """
    AND NOT EXISTS (
        SELECT 1 FROM allocations a
        WHERE a.workspace_id = w.id
        AND a.status = 'Active'
        AND (
            (a.start_time < CAST(%(end_time)s AS DATETIME) AND a.end_time > CAST(%(start_time)s AS DATETIME)) OR
            (a.start_time >= CAST(%(start_time)s AS DATETIME) AND a.start_time < CAST(%(end_time)s AS DATETIME)) OR
            (a.end_time > CAST(%(start_time)s AS DATETIME) AND a.end_time <= CAST(%(end_time)s AS DATETIME))
        )
    )
    """
    
    # Prepare parameters dictionary
    params_dict = {
        'start_time': request.start_time, 
        'end_time': request.end_time, 
        'team_size': request.team_size
    }
    
    # Build the final query
    query = base_query + overlap_condition
    
    # Add filters for floor and type if provided
    if request.preferred_floor is not None and request.preferred_floor != 0:
        params_dict['preferred_floor'] = request.preferred_floor
        query += f" AND w.floor = %(preferred_floor)s"
    if request.preferred_type and request.preferred_type.strip():
        params_dict['preferred_type'] = f"%{request.preferred_type}%"
        query += f" AND w.type LIKE %(preferred_type)s"
        
    query += " ORDER BY w.capacity DESC, w.id LIMIT 100"

    print(f"Executing query: {query}") # Debugging
    print(f"With params dict: {params_dict}") # Debugging
    await cursor.execute(query, params_dict)
    available_rows = await cursor.fetchall()
    
    print(f"Found {len(available_rows)} potentially available workspaces.") # Debugging
    
    available_workspaces = []
    for row in available_rows:
         if row.get('facilities'):
            row['facilities'] = json.loads(row['facilities'])
         else:
            row['facilities'] = []
         available_workspaces.append(WorkspaceRead(**row))

    if not available_workspaces:
        print("No workspaces found after initial filtering.") # Debugging
        return []

    # 3. Prepare context data for ML model (Re-enabled)
    print("Preparing data for ML model...")
    context_data = {
        'team_size': request.team_size,
        'privacy_need': request.privacy_need,
        'collaboration_need': request.collaboration_need,
        'required_facilities': request.required_facilities,
        'time_of_day': request.start_time.strftime('%H:%M'),
        'duration_hours': (request.end_time - request.start_time).total_seconds() / 3600,
        'day_type': 'weekend' if request.start_time.weekday() >= 5 else 'weekday',
        # Pass preferences to ML context if they exist
        'preferred_floor': request.preferred_floor,
        'preferred_type': request.preferred_type,
    }

    # 4. Run ML predictions concurrently for all candidates (Re-enabled)
    print(f"Running ML predictions for {len(available_workspaces)} candidates...")
    tasks = []
    for ws in available_workspaces:
        task = allocator.get_workspace_suitability(
            user_data=user_data,
            workspace_data=ws.model_dump(),
            context_data=context_data
        )
        tasks.append(task)
        
    results = await asyncio.gather(*tasks)
    print(f"ML results received: {len(results)}")

    # 5. Format results into AllocationRead suggestions (Re-enabled)
    suggestions = []
    for result in results:
        # Find the corresponding full workspace object
        workspace_obj = next((ws for ws in available_workspaces if ws.id == result['workspace_id']), None)
        
        # We might want to add a minimum score filter back later,
        # but let's keep it open for now to ensure suggestions appear.
        # Example filter: if result['score'] < 30: continue 
        if workspace_obj:
            suggestions.append(
                AllocationRead(
                    id=-1, # Suggestion ID
                    user_id=request.user_id,
                    workspace_id=result['workspace_id'],
                    start_time=request.start_time,
                    end_time=request.end_time,
                    team_size=request.team_size,
                    privacy_need=request.privacy_need,
                    collaboration_need=request.collaboration_need,
                    required_facilities=request.required_facilities,
                    notes=request.notes,
                    status="Pending",
                    suitability_score=result['score'],
                    confidence_score=result['confidence'],
                    reasoning=result['reasoning'],
                    workspace=workspace_obj # Populate the workspace details
                )
            )
            
    print(f"Generated {len(suggestions)} suggestions after ML scoring.") # Debugging
    
    # 6. Sort suggestions by ML score (descending) (Re-enabled)
    suggestions.sort(key=lambda x: x.suitability_score or 0.0, reverse=True)
    
    return suggestions

async def create_allocation(cursor: aiomysql.Cursor, allocation: AllocationConfirm) -> AllocationRead:
    """Creates a new allocation record in MySQL."""
    sql = """
        INSERT INTO allocations (user_id, workspace_id, start_time, end_time, team_size, 
                               privacy_need, collaboration_need, required_facilities, notes, status,
                               suitability_score, confidence_score)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    facilities_json = json.dumps(allocation.required_facilities)
    
    await cursor.execute(sql, (
        allocation.user_id,
        allocation.workspace_id,
        allocation.start_time,
        allocation.end_time,
        allocation.team_size,
        allocation.privacy_need.value,
        allocation.collaboration_need.value,
        facilities_json,
        allocation.notes,
        "Active", # Set status to Active upon creation
        allocation.suitability_score,
        allocation.confidence_score
    ))
    new_id = cursor.lastrowid
    if not new_id:
        raise Exception("Failed to create allocation or get new ID")
    return await get_allocation_by_id(cursor, new_id)

async def get_allocation_by_id(cursor: aiomysql.Cursor, allocation_id: int) -> Optional[AllocationRead]:
    """Retrieves a single allocation by its ID from MySQL."""
    sql = "SELECT * FROM allocations WHERE id = %s"
    await cursor.execute(sql, (allocation_id,))
    row = await cursor.fetchone()
    if row and row.get('required_facilities'):
        row['required_facilities'] = json.loads(row['required_facilities'])
    return AllocationRead(**row) if row else None

async def get_allocations(
    cursor: aiomysql.Cursor,
    skip: int = 0, 
    limit: int = 20,  # Default to smaller limit
    user_id: Optional[int] = None,
    workspace_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[str] = None
) -> List[AllocationRead]:
    """Retrieves a list of allocations from MySQL with optional filtering."""
    # Select allocation fields and necessary workspace details by joining tables
    query = """
    SELECT 
        a.id, a.user_id, a.workspace_id, a.start_time, a.end_time, 
        a.team_size, a.status, a.required_facilities,
        w.name as workspace_name, w.type as workspace_type, 
        w.floor as workspace_floor, w.capacity as workspace_capacity, 
        w.facilities as workspace_facilities, w.is_available as workspace_is_available,
        a.notes as allocation_notes, a.suitability_score, a.confidence_score
    FROM allocations a
    JOIN workspaces w ON a.workspace_id = w.id
    WHERE 1=1
    """
    
    params = []
    conditions = [] # Store conditions to apply to WHERE clause

    if user_id is not None:
        params.append(user_id)
        conditions.append(f"a.user_id = %s")
    if workspace_id is not None:
        params.append(workspace_id)
        conditions.append(f"a.workspace_id = %s")
    if start_date:
        params.append(start_date)
        conditions.append(f"a.start_time >= %s")
    if end_date:
        params.append(end_date)
        conditions.append(f"a.end_time <= %s")
    if status:
        params.append(status)
        conditions.append(f"a.status = %s")

    # Append conditions if any exist
    if conditions:
        query += " AND " + " AND ".join(conditions)

    query += f" ORDER BY a.start_time DESC LIMIT %s OFFSET %s"
    params.extend([limit, skip])
    
    # Execute the actual query
    await cursor.execute(query, tuple(params))
    rows = await cursor.fetchall()
    
    allocations = []
    for row in rows:
        row_dict = dict(row) # Convert row object to dictionary
        
        # Parse JSON fields
        alloc_facilities = json.loads(row_dict.get('required_facilities') or '[]')
        ws_facilities = json.loads(row_dict.get('workspace_facilities') or '[]')
        
        # Create WorkspaceRead object using fetched data
        workspace_data = {
            "id": row_dict['workspace_id'],
            "name": row_dict.get('workspace_name', 'N/A'),
            "type": row_dict.get('workspace_type', 'Unknown'), 
            "floor": row_dict.get('workspace_floor', -1), 
            "capacity": row_dict.get('workspace_capacity', 1), # Ensure capacity > 0
            "facilities": ws_facilities,
            "is_available": row_dict.get('workspace_is_available', False)
            # Add other optional fields like description, coords if needed/selected
        }
        
        # Create AllocationRead object
        allocation_data = {
            "id": row_dict['id'],
            "user_id": row_dict['user_id'],
            "workspace_id": row_dict['workspace_id'],
            "start_time": row_dict['start_time'],
            "end_time": row_dict['end_time'],
            "team_size": row_dict['team_size'],
            "privacy_need": row_dict.get('privacy_need', NeedLevel.LOW), # Need to select this field too if it exists in allocations
            "collaboration_need": row_dict.get('collaboration_need', NeedLevel.LOW), # Need to select this field too
            "required_facilities": alloc_facilities,
            "notes": row_dict.get('allocation_notes'),
            "status": row_dict['status'],
            "suitability_score": row_dict.get('suitability_score'),
            "confidence_score": row_dict.get('confidence_score'),
            "workspace": WorkspaceRead(**workspace_data) # Add the nested object
        }
                
        allocations.append(AllocationRead(**allocation_data))
        
    return allocations

async def update_allocation(cursor: aiomysql.Cursor, allocation_id: int, allocation_update: AllocationUpdate) -> Optional[AllocationRead]:
    """Updates an existing allocation in MySQL."""
    update_data = allocation_update.model_dump(exclude_unset=True)
    if not update_data:
        return await get_allocation_by_id(cursor, allocation_id)

    set_clauses = []
    params = []

    for key, value in update_data.items():
        # Handle JSON conversion if facilities are updated
        if key == 'required_facilities' and value is not None:
            set_clauses.append(f"{key} = %s")
            params.append(json.dumps(value))
        elif value is not None: # Exclude None values explicitly
             set_clauses.append(f"{key} = %s")
             params.append(value.value if hasattr(value, 'value') else value)

    if not set_clauses:
        return await get_allocation_by_id(cursor, allocation_id)
        
    params.append(allocation_id) # For WHERE clause
    
    set_query = ", ".join(set_clauses)
    sql = f"UPDATE allocations SET {set_query} WHERE id = %s"
    
    rows_affected = await cursor.execute(sql, tuple(params))

    if rows_affected > 0:
        return await get_allocation_by_id(cursor, allocation_id)
    else:
        return None

async def cancel_allocation(cursor: aiomysql.Cursor, allocation_id: int, user_id: int) -> Optional[AllocationRead]:
    """Sets an allocation's status to Cancelled in MySQL."""
    sql = """
        UPDATE allocations 
        SET status = 'Cancelled' 
        WHERE id = %s AND user_id = %s AND status = 'Active'
    """
    rows_affected = await cursor.execute(sql, (allocation_id, user_id))
    
    if rows_affected > 0:
        return await get_allocation_by_id(cursor, allocation_id)
    else:
        # Either not found, not owned by user, or not Active
        return None 