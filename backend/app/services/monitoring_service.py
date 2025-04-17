import asyncpg
from typing import Dict, Any, Optional
import aiomysql

from ..ml.workspace_monitor import WorkspaceMonitor
from ..services import workspace_service # To update workspace status

# Create a single instance of the monitor when the module is loaded
# Adjust confidence threshold as needed
monitor = WorkspaceMonitor(confidence_threshold=0.7)

async def check_workspace_occupancy(
    cursor: aiomysql.Cursor, # Accept cursor
    image_source,
    workspace_id: Optional[int] = None # Accept workspace_id
) -> Dict[str, Any]:
    """Processes an image to detect occupancy and returns results."""
    # Directly use the monitor instance
    detection_results = await monitor.detect_people(image_source)
    
    # If a workspace ID was provided and people were detected, update status
    if workspace_id is not None and detection_results.get("person_count", 0) > 0:
        print(f"Occupancy detected ({detection_results['person_count']} people) for workspace {workspace_id}. Updating status...")
        # Call the update function, passing the cursor
        await update_workspace_status_based_on_occupancy(
            cursor=cursor, 
            workspace_id=workspace_id, 
            is_occupied=True
        )
        # Optionally add occupancy count to results if needed later
        # results["updated_status"] = True 
    elif workspace_id is not None:
        # Optionally set to available if no one detected?
        print(f"No occupancy detected for workspace {workspace_id}. Ensuring status is available...")
        await update_workspace_status_based_on_occupancy(
            cursor=cursor, 
            workspace_id=workspace_id, 
            is_occupied=False
        )
        
    return detection_results

async def update_workspace_status_based_on_occupancy(
    cursor: aiomysql.Cursor, # Use cursor passed from caller
    workspace_id: int, 
    is_occupied: bool
):
    """Updates the is_available status of a workspace."""
    from ..schemas.workspace import WorkspaceUpdate # Avoid circular import
    
    # Prepare the update data
    update_payload = WorkspaceUpdate(is_available=not is_occupied)

    # Update workspace status: occupied means not available
    try:
        print(f"Calling workspace_service.update_workspace for ID {workspace_id} with payload: {update_payload.model_dump()}") # Debug log
        await workspace_service.update_workspace(
            cursor=cursor, 
            workspace_id=workspace_id, 
            workspace=update_payload # Use the correct parameter name 'workspace'
        )
        print(f"Updated workspace {workspace_id} availability based on occupancy: {not is_occupied}")
    except Exception as e:
        print(f"Error updating workspace {workspace_id} status: {e}")
        # Decide if this error should propagate or just be logged

# Add functions here to manage monitoring tasks (start/stop feeds per workspace) if needed
# Example: active_monitors = {} 
# async def start_monitoring(workspace_id: int, camera_url: str): ...
# async def stop_monitoring(workspace_id: int): ... 