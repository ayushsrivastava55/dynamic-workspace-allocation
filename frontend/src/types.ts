// frontend/src/types.ts

// --- Enums ---

export enum AllocationStatus {
  ACTIVE = "Active",
  PENDING = "Pending",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
}

export enum NeedLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

// --- User Schemas ---

export interface User {
  id: number;
  email: string;
  full_name: string;
  level: string;
  department: string;
  is_active: boolean;
}

export interface UserLogin {
  email: string; // Assuming email is used for username field in form
  password: string;
}

// Define a type for the token response
export interface Token {
  access_token: string;
  token_type: string;
}

// Interface for creating a user (matches backend UserCreate)
export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
  level: string;
  department: string;
  is_active?: boolean; // Optional here, backend might default
}

// --- Workspace Schemas ---

export interface Workspace {
  id: number;
  name: string;
  type: string;
  floor: number;
  capacity: number;
  facilities: string[];
  is_available: boolean;
  description?: string | null;
  x_coord?: number | null;
  y_coord?: number | null;
}

// --- Allocation Schemas ---

// Base properties for reading an allocation
export interface Allocation extends AllocationBase {
  id: number;
  suitability_score?: number | null;
  confidence_score?: number | null;
  // Optionally include nested details if backend provides them
  // user?: User;
  workspace?: Workspace | null;
}

export interface AllocationBase {
    user_id: number;
    workspace_id: number;
    start_time: string; // Use string for ISO datetime format
    end_time: string;   // Use string for ISO datetime format
    team_size: number;
    privacy_need: NeedLevel;
    collaboration_need: NeedLevel;
    required_facilities: string[];
    notes?: string | null;
    status: AllocationStatus;
}

// Schema for requesting suggestions (corresponds to backend AllocationCreate)
export interface AllocationRequest {
  user_id: number; // This might be inferred from logged-in user on backend? Check usage.
  team_size: number;
  start_time: string; // ISO format string
  end_time: string;   // ISO format string
  privacy_need?: NeedLevel;
  collaboration_need?: NeedLevel;
  required_facilities?: string[];
  preferred_floor?: number | null;
  preferred_type?: string | null;
  notes?: string | null;
}

// Schema for the response when suggesting workspaces
// This should now match the updated AllocationRead Pydantic model
export interface SuggestedWorkspace {
  id: number; // Suggestion ID (might be -1 or similar)
  user_id: number;
  workspace_id: number;
  start_time: string; // ISO format string
  end_time: string;   // ISO format string
  team_size: number;
  privacy_need?: NeedLevel;
  collaboration_need?: NeedLevel;
  required_facilities?: string[];
  notes?: string | null;
  status: AllocationStatus; // Likely "Pending"
  suitability_score?: number | null;
  confidence_score?: number | null;
  reasoning?: string[]; // List of strings now
  workspace?: Workspace | null; // Include the full workspace details
}

// Schema for confirming a specific allocation (corresponds to backend AllocationConfirm)
export interface AllocationConfirm {
  user_id: number; // May be inferred from logged-in user
  workspace_id: number;
  start_time: string; // ISO format string
  end_time: string;   // ISO format string
  team_size: number;
  privacy_need?: NeedLevel;
  collaboration_need?: NeedLevel;
  required_facilities?: string[];
  notes?: string | null;
  // ML scores might be calculated/added by backend upon confirmation
}

// Schema for updating an allocation (e.g., cancelling)
export interface AllocationUpdate {
    status?: AllocationStatus;
    notes?: string | null;
}

// Schema for allocation history filtering
export interface AllocationHistoryParams {
  user_id?: number;
  workspace_id?: number;
  start_date?: string; // ISO format string
  end_date?: string;   // ISO format string
  status?: AllocationStatus;
  limit?: number;
  offset?: number;
}

// Placeholder for ML model response if used directly
export interface MLResponse {
  suitable: boolean;
  reasoning: string;
  confidence?: number;
  score?: number;
}

// Consider adding types for API error responses if standardized
export interface ApiError {
  detail: string | { msg: string; type: string }[]; // Based on FastAPI error formats
} 