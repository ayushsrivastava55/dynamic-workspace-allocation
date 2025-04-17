from fastapi import APIRouter, Depends, HTTPException, status
import aiomysql
from typing import List, Dict, Any, Optional
import json
from datetime import datetime

from ..db.session import get_cursor
from ..schemas.allocation import AllocationRead
from ..schemas.workspace import WorkspaceRead
from ..services import allocation_service, workspace_service

router = APIRouter()

@router.get("/overview")
async def get_dashboard_overview(
    user_id: int,
    cursor = Depends(get_cursor)
):
    """
    Get all dashboard data in a single optimized request.
    """
    try:
        # Get current time for calculations
        now = datetime.now()
        
        # Create all queries to run
        queries = [
            # 1. Basic workspace counts
            """
            SELECT 
                COUNT(*) as total_workspaces,
                SUM(CASE WHEN is_available = TRUE THEN 1 ELSE 0 END) as available_workspaces
            FROM workspaces
            """,
            
            # 2. Active allocations for user
            f"""
            SELECT COUNT(*) as active_count
            FROM allocations
            WHERE user_id = %s AND status = 'Active'
            """,
            
            # 3. Upcoming allocations for user (start time in future)
            f"""
            SELECT COUNT(*) as upcoming_count
            FROM allocations
            WHERE user_id = %s AND status = 'Active' AND start_time > %s
            """,
            
            # 4. Pending allocations for user
            f"""
            SELECT COUNT(*) as pending_count
            FROM allocations
            WHERE user_id = %s AND status = 'Pending'
            """,
            
            # 5. Top 5 active allocations
            f"""
            SELECT a.id, a.workspace_id, a.start_time, a.end_time, a.team_size, a.status,
                   w.name as workspace_name, w.type as workspace_type
            FROM allocations a
            JOIN workspaces w ON a.workspace_id = w.id
            WHERE a.user_id = %s AND a.status = 'Active'
            ORDER BY a.start_time ASC
            LIMIT 5
            """,
            
            # 6. Top 6 available workspaces
            """
            SELECT id, name, type, floor, capacity, facilities, is_available, description
            FROM workspaces
            WHERE is_available = TRUE
            ORDER BY capacity DESC
            LIMIT 6
            """
        ]
        
        # Execute queries
        results = {}
        
        # Query 1 - workspace counts
        await cursor.execute(queries[0])
        workspace_counts = await cursor.fetchone()
        results["workspace_counts"] = workspace_counts
        
        # Query 2 - active allocations
        await cursor.execute(queries[1], (user_id,))
        active_count = await cursor.fetchone()
        results["active_count"] = active_count.get("active_count", 0)
        
        # Query 3 - upcoming allocations
        await cursor.execute(queries[2], (user_id, now))
        upcoming_count = await cursor.fetchone()
        results["upcoming_count"] = upcoming_count.get("upcoming_count", 0)
        
        # Query 4 - pending allocations
        await cursor.execute(queries[3], (user_id,))
        pending_count = await cursor.fetchone()
        results["pending_count"] = pending_count.get("pending_count", 0)
        
        # Query 5 - active allocations list
        await cursor.execute(queries[4], (user_id,))
        active_allocations = await cursor.fetchall()
        results["active_allocations"] = active_allocations
        
        # Query 6 - available workspaces
        await cursor.execute(queries[5])
        available_workspaces = await cursor.fetchall()
        
        # Process facilities JSON
        for workspace in available_workspaces:
            if workspace.get("facilities"):
                workspace["facilities"] = json.loads(workspace["facilities"])
            else:
                workspace["facilities"] = []
                
        results["available_workspaces"] = available_workspaces
        
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting dashboard data: {str(e)}"
        ) 