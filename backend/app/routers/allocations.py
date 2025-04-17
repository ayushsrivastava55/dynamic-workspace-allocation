from fastapi import APIRouter, Depends, HTTPException, Query, status
import aiomysql
from typing import List, Optional
from datetime import datetime

from ..db.session import get_cursor
from ..schemas.allocation import (AllocationCreate, AllocationUpdate, 
                                    AllocationRead, AllocationConfirm)
from ..services import allocation_service
# Assuming you have a way to get the current user ID (e.g., from JWT)
# from ..dependencies import get_current_user_id 

router = APIRouter()

@router.post("/suggest", response_model=List[AllocationRead])
async def suggest_workspaces(
    request_in: AllocationCreate,
    limit: int = Query(5, ge=1, le=20, description="Limit the number of suggestions returned"),
    cursor = Depends(get_cursor)
):
    """
    Suggest suitable workspaces based on user requirements.
    Uses ML model (placeholder) to score and rank available workspaces.
    """
    # Here you might want to verify the user_id in request_in matches the logged-in user
    # current_user_id = Depends(get_current_user_id)
    # if request_in.user_id != current_user_id: ...
    
    try:
        # Validate datetime values explicitly
        if request_in.start_time >= request_in.end_time:
            raise ValueError("Start time must be before end time")
            
        suggestions = await allocation_service.suggest_workspaces_for_request(
            cursor=cursor, request=request_in
        )
        return suggestions[:limit] # Apply limit after getting all suggestions
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except TypeError as te:
        # This would catch type conversion errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Invalid data format: {str(te)}. Please check date formats and numeric values."
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Suggestion error: {e}")

@router.post("/confirm", response_model=AllocationRead, status_code=status.HTTP_201_CREATED)
async def confirm_allocation(
    confirm_in: AllocationConfirm,
    cursor = Depends(get_cursor)
):
    """
    Create a new allocation record for a chosen workspace.
    This confirms a suggestion or a direct booking attempt.
    """
    # Verify user ID, check workspace availability again? 
    try:
        # You might want to pass ML scores from the suggestion phase if available
        created_allocation = await allocation_service.create_allocation(
            cursor=cursor, allocation=confirm_in
        )
        return created_allocation
    except Exception as e:
        # More specific error handling (e.g., workspace not available, user not found)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Failed to confirm allocation: {e}"
        )

@router.get("/", response_model=List[AllocationRead])
async def read_allocations_history(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    workspace_id: Optional[int] = Query(None, description="Filter by workspace ID"),
    start_date: Optional[datetime] = Query(None, description="Filter allocations starting on or after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter allocations ending on or before this date"),
    status: Optional[str] = Query(None, description="Filter by allocation status (Active, Completed, Cancelled)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    cursor = Depends(get_cursor)
):
    """Retrieve allocation history with filters (requires authentication)."""
    # Add logic here to restrict access (e.g., users can only see their own history unless admin)
    # current_user_id = Depends(get_current_user_id)
    # if not is_admin(current_user_id) and user_id != current_user_id:
    #     user_id = current_user_id # Force filter to current user
        
    allocations = await allocation_service.get_allocations(
        cursor=cursor, skip=skip, limit=limit, user_id=user_id, workspace_id=workspace_id,
        start_date=start_date, end_date=end_date, status=status
    )
    return allocations

@router.get("/{allocation_id}", response_model=AllocationRead)
async def read_allocation_details(
    allocation_id: int,
    cursor = Depends(get_cursor)
):
    """Get details of a specific allocation (requires authentication)."""
    # Add logic to check if the current user owns this allocation or is an admin
    allocation = await allocation_service.get_allocation_by_id(cursor=cursor, allocation_id=allocation_id)
    if allocation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Allocation with ID {allocation_id} not found"
        )
    # Check ownership: if allocation.user_id != current_user_id and not is_admin(current_user_id):
    #    raise HTTPException(status_code=403, detail="Not authorized")
    return allocation

@router.put("/{allocation_id}/cancel", response_model=AllocationRead)
async def cancel_user_allocation(
    allocation_id: int,
    cursor = Depends(get_cursor)
    # current_user_id: int = Depends(get_current_user_id) # Get current user ID
):
    """Cancel an active allocation (only owner can cancel)."""
    # Placeholder for current user ID
    current_user_id = 1 
    
    updated_allocation = await allocation_service.cancel_allocation(
        cursor=cursor, allocation_id=allocation_id, user_id=current_user_id
    )
    if updated_allocation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Active allocation with ID {allocation_id} not found for current user, or cannot be cancelled."
        )
    return updated_allocation

# Potential endpoint for admin to update status
@router.patch("/{allocation_id}/status", response_model=AllocationRead)
async def update_allocation_status_admin(
    allocation_id: int,
    allocation_update: AllocationUpdate, # Schema allows updating status/notes
    cursor = Depends(get_cursor)
):
    """Update allocation status or notes (requires admin privileges)."""
    # TODO: Add admin authentication check
    if allocation_update.status is None and allocation_update.notes is None:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided (status or notes)."
        )
        
    updated = await allocation_service.update_allocation(
        cursor=cursor, allocation_id=allocation_id, allocation_update=allocation_update
    )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Allocation with ID {allocation_id} not found."
        )
    return updated 