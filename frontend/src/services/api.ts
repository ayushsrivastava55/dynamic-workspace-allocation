import axios from 'axios';
import { 
  AllocationRequest,
  SuggestedWorkspace,
  AllocationConfirm,
  Allocation,
  AllocationHistoryParams,
  AllocationUpdate,
  UserLogin,
  Token,
  User,
  Workspace,
  ApiError
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_V1_STR = "/api/v1";

const api = axios.create({
  baseURL: `${API_BASE_URL}${API_V1_STR}`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Changed to false since we're using * for origins
});

// Add interceptor to include Auth token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Allocation API --- //
export const allocationApi = {
  // Get workspace suggestions
  // Backend endpoint: POST /api/v1/allocations/suggest
  getSuggestions: async (request: AllocationRequest) => {
    // Removed min_score and limit params, as they are not in the backend route
    const response = await api.post<SuggestedWorkspace[]>(`/allocations/suggest`, request);
    return response.data;
  },

  // Confirm a specific workspace allocation
  // Backend endpoint: POST /api/v1/allocations/confirm
  confirmAllocation: async (confirmationData: AllocationConfirm) => {
    const response = await api.post<Allocation>(`/allocations/confirm`, confirmationData);
    return response.data;
  },

  // Get allocation history
  // Backend endpoint: GET /api/v1/allocations/
  getAllocationHistory: async (params?: AllocationHistoryParams) => {
    const response = await api.get<Allocation[]>('/allocations/', { params });
    return response.data;
  },

  // Get allocation details by ID
  // Backend endpoint: GET /api/v1/allocations/{allocation_id}
  getAllocationDetails: async (allocationId: number) => {
    const response = await api.get<Allocation>(`/allocations/${allocationId}`);
    return response.data;
  },

  // Cancel an allocation (User)
  // Backend endpoint: PUT /api/v1/allocations/{allocation_id}/cancel
  cancelAllocation: async (allocationId: number) => {
    const response = await api.put<Allocation>(`/allocations/${allocationId}/cancel`);
    return response.data;
  },

  // Update allocation status (Admin)
  // Backend endpoint: PATCH /api/v1/allocations/{allocation_id}/status
  updateAllocationStatus: async (allocationId: number, updateData: AllocationUpdate) => {
    const response = await api.patch<Allocation>(`/allocations/${allocationId}/status`, updateData);
    return response.data;
  }
};

// --- User & Auth API --- //
export const authApi = {
  // Login user
  // Backend endpoint: POST /api/v1/users/login
  login: async (credentials: UserLogin) => {
    // FastAPI typically expects form data for OAuth2PasswordRequestForm
    const formData = new URLSearchParams();
    formData.append('username', credentials.email); // Use email as username
    formData.append('password', credentials.password);

    const response = await api.post<Token>('/users/login', formData, {
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    // Store the token upon successful login
    if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  // Get current logged-in user
  // Backend endpoint: GET /api/v1/users/me
  getCurrentUser: async () => {
    const response = await api.get<User>('/users/me');
    return response.data;
  },
  
  // Placeholder for logout - typically involves removing the token
  logout: () => {
      localStorage.removeItem('token');
      // Add any other cleanup logic (e.g., redirecting, clearing state)
  }
};

export const userApi = {
    // Create a new user
    // Backend endpoint: POST /api/v1/users/
    createUser: async (userData: any) => {
        const response = await api.post<User>('/users/', JSON.stringify(userData), {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    },

    // Get user details by ID
    // Backend endpoint: GET /api/v1/users/{user_id}
    getUserById: async (userId: number) => {
        const response = await api.get<User>(`/users/${userId}`);
        return response.data;
    },
    
    // Get all users (if needed, requires admin privileges typically)
    // Backend endpoint: GET /api/v1/users/
    getAllUsers: async () => {
        const response = await api.get<User[]>('/users/');
        return response.data;
    },

    // Update current user
    // Backend endpoint: PATCH /api/v1/users/me
    updateCurrentUser: async (updateData: any) => { // Use UserUpdate type
        const response = await api.patch<User>('/users/me', updateData);
        return response.data;
    }
    // Add other user endpoints as needed (update specific user, delete user etc.)
};

// --- Workspace API --- //
export const workspaceApi = {
  // Create a new workspace
  // Backend endpoint: POST /api/v1/workspaces/
  createWorkspace: async (workspaceData: any) => { // Use WorkspaceCreate type
      const response = await api.post<Workspace>('/workspaces/', workspaceData);
      return response.data;
  },

  // Get workspace details by ID
  // Backend endpoint: GET /api/v1/workspaces/{workspace_id}
  getWorkspaceById: async (workspaceId: number) => {
    const response = await api.get<Workspace>(`/workspaces/${workspaceId}`);
    return response.data;
  },

  // Get all workspaces
  // Backend endpoint: GET /api/v1/workspaces/
  getAllWorkspaces: async () => {
    const response = await api.get<Workspace[]>('/workspaces/');
    return response.data;
  },

  // Update a workspace
  // Backend endpoint: PATCH /api/v1/workspaces/{workspace_id}
  updateWorkspace: async (workspaceId: number, updateData: any) => { // Use WorkspaceUpdate type
      const response = await api.patch<Workspace>(`/workspaces/${workspaceId}`, updateData);
      return response.data;
  },

  // Delete a workspace
  // Backend endpoint: DELETE /api/v1/workspaces/{workspace_id}
  deleteWorkspace: async (workspaceId: number) => {
      const response = await api.delete(`/workspaces/${workspaceId}`);
      return response.data; // Usually returns status or confirmation
  },

  // Get workspace status based on schedule
  // Backend endpoint: GET /api/v1/workspaces/{workspace_id}/status
  getWorkspaceStatus: async (workspaceId: number) => {
    const response = await api.get<{ status: string; occupied_until: string | null }>(`/workspaces/${workspaceId}/status`);
    return response.data;
  }
};

// --- Dashboard API --- //
export const dashboardApi = {
  // Get dashboard overview data in single request
  // Backend endpoint: GET /api/v1/dashboard/overview
  getDashboardOverview: async (userId: number) => {
    const response = await api.get(`/dashboard/overview?user_id=${userId}`);
    return response.data;
  }
};

// Utility to handle potential API errors
export const handleApiError = (error: unknown): string => {
  console.error("API Error:", error); // Log the full error object
  if (axios.isAxiosError(error)) {
    console.error("Axios Error Response:", error.response); // Log the response object
    const data = error.response?.data as ApiError;
    console.error("Axios Error Data:", data); // Log the extracted data
    if (data && data.detail) {
      if (typeof data.detail === 'string') {
        return data.detail;
      } else if (Array.isArray(data.detail)) {
        // Handle validation errors (list of dicts)
        return data.detail.map(err => `${err.loc?.join('.')} - ${err.msg} (${err.type})`).join(', ');
      }
    }
    return error.message;
  } else {
    return 'An unexpected error occurred';
  }
}; 