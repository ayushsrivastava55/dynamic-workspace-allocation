from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from typing import Dict, Any, Optional

from ..services import monitoring_service
from ..db.session import get_cursor # Import get_cursor for DB access
import aiomysql # Import aiomysql

router = APIRouter()

@router.post("/check-occupancy", response_model=Dict[str, Any])
async def check_occupancy_from_image(
    file: UploadFile = File(...),
    workspace_id: Optional[int] = Form(None), # Add workspace_id as optional form field
    cursor: aiomysql.Cursor = Depends(get_cursor) # Add cursor dependency
):
    """
    Check workspace occupancy by uploading an image file.
    Optionally updates the workspace status if a workspace_id is provided.
    Returns the number of people detected and their bounding boxes.
    """
    # Read image bytes
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No image file uploaded.")
    
    try:
        # Pass cursor and workspace_id to the service
        results = await monitoring_service.check_workspace_occupancy(
            cursor=cursor, 
            image_source=image_bytes, 
            workspace_id=workspace_id
        )
        if results.get("error"):
             raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=results["error"]
            )
        return results
    except Exception as e:
        # Log the exception e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to process image: {e}"
        )

# Add more endpoints later for starting/stopping monitoring feeds, getting status etc.
# Example:
# @router.post("/workspaces/{workspace_id}/start")
# async def start_monitoring_for_workspace(workspace_id: int, camera_url: str): ...

# @router.post("/workspaces/{workspace_id}/stop")
# async def stop_monitoring_for_workspace(workspace_id: int): ... 