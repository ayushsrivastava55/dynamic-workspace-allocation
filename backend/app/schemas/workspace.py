from pydantic import BaseModel, Field
from typing import List, Optional

# Shared properties
class WorkspaceBase(BaseModel):
    """Base model for workspace data."""
    name: str = Field(..., max_length=100, description="The display name of the workspace")
    type: str = Field(..., max_length=50, description="Type of the workspace (e.g., Meeting Room, Hot Desk)")
    floor: int = Field(..., description="Floor number where the workspace is located")
    capacity: int = Field(..., gt=0, description="Maximum number of people the workspace can accommodate")
    facilities: List[str] = Field(default_factory=list, description="List of available facilities")
    is_available: bool = Field(default=True, description="Current availability status (can be updated by monitoring)")
    description: Optional[str] = Field(None, max_length=500, description="Optional description of the workspace")
    x_coord: Optional[float] = Field(None, description="X coordinate for floor plan mapping")
    y_coord: Optional[float] = Field(None, description="Y coordinate for floor plan mapping")

# Properties to receive via API on creation
class WorkspaceCreate(WorkspaceBase):
    """Model for creating a new workspace."""
    pass # No extra fields needed for creation beyond base

# Properties to receive via API on update
class WorkspaceUpdate(WorkspaceBase):
    """Model for updating an existing workspace."""
    name: Optional[str] = None
    type: Optional[str] = None
    floor: Optional[int] = None
    capacity: Optional[int] = None
    facilities: Optional[List[str]] = None
    is_available: Optional[bool] = None
    description: Optional[str] = None
    x_coord: Optional[float] = None
    y_coord: Optional[float] = None

# Properties to return to client
class WorkspaceRead(WorkspaceBase):
    """Model for reading workspace data from the database."""
    id: int

    class Config:
        """Configuration for Pydantic model."""
        orm_mode = True 