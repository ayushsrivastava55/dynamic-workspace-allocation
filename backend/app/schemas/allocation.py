from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
from enum import Enum
from ..schemas.workspace import WorkspaceRead

# Define possible statuses for an allocation
class AllocationStatus(str, Enum):
    ACTIVE = "Active"
    PENDING = "Pending" # Maybe needed if there's an approval step
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

# Define levels for privacy/collaboration needs
class NeedLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

# Shared properties
class AllocationBase(BaseModel):
    user_id: int = Field(..., description="ID of the user making the allocation")
    workspace_id: int = Field(..., description="ID of the allocated workspace")
    start_time: datetime = Field(..., description="Start date and time of the allocation")
    end_time: datetime = Field(..., description="End date and time of the allocation")
    team_size: int = Field(..., gt=0, description="Number of people for this allocation")
    privacy_need: NeedLevel = Field(NeedLevel.LOW, description="Required level of privacy")
    collaboration_need: NeedLevel = Field(NeedLevel.LOW, description="Required level of collaboration")
    required_facilities: List[str] = Field(default_factory=list, description="Specific facilities required for this allocation")
    notes: Optional[str] = Field(None, max_length=500, description="Optional notes about the allocation")
    status: AllocationStatus = Field(AllocationStatus.ACTIVE, description="Current status of the allocation")

# Properties to receive via API on creation (requesting an allocation)
# This mirrors the request structure from the frontend
class AllocationCreate(BaseModel):
    user_id: int
    team_size: int = Field(default=1, ge=1)
    start_time: datetime
    end_time: datetime
    privacy_need: NeedLevel = Field(NeedLevel.LOW)
    collaboration_need: NeedLevel = Field(NeedLevel.LOW)
    required_facilities: List[str] = Field(default_factory=list)
    preferred_floor: Optional[int] = None
    preferred_type: Optional[str] = None
    notes: Optional[str] = None
    # workspace_id is NOT included here, as creation might involve suggesting first

# Properties received when confirming a specific allocation
class AllocationConfirm(BaseModel):
    user_id: int
    workspace_id: int
    start_time: datetime
    end_time: datetime
    team_size: int = Field(default=1, ge=1)
    privacy_need: NeedLevel = Field(NeedLevel.LOW)
    collaboration_need: NeedLevel = Field(NeedLevel.LOW)
    required_facilities: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    # ML scores can be added when creating the DB record
    suitability_score: Optional[float] = None
    confidence_score: Optional[float] = None

# Properties to receive via API on update (e.g., changing status)
class AllocationUpdate(BaseModel):
    status: Optional[AllocationStatus] = None
    notes: Optional[str] = Field(None, max_length=500)
    # Potentially allow updating times if logic permits
    # start_time: Optional[datetime] = None
    # end_time: Optional[datetime] = None

# Properties to return to client
class AllocationRead(AllocationBase):
    id: int
    # Include ML scores if available
    suitability_score: Optional[float] = Field(None, description="ML model's suitability score for this allocation")
    confidence_score: Optional[float] = Field(None, description="ML model's confidence in the suitability score")
    reasoning: Optional[List[str]] = Field(None, description="ML model's reasoning for the score")
    # Optionally include nested user/workspace details
    # user: Optional[UserRead] = None
    workspace: Optional[WorkspaceRead] = None

    class Config:
        from_attributes = True
        use_enum_values = True # Ensure Enum values are returned as strings 