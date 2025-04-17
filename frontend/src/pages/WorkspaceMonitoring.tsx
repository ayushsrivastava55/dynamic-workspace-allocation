import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Need axios for FormData request
import { handleApiError } from '../services/api'; // Use existing error handler
import { toast } from 'react-hot-toast';
import { Workspace } from '../types'; // Import Workspace type
import { workspaceApi } from '../services/api'; // Import workspaceApi

// Define expected API response structure
interface OccupancyResponse {
  person_count: number;
  detections: Array<{ confidence: number; box: number[] }>;
  error?: string;
}

const WorkspaceMonitoring: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<OccupancyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]); // State for workspace list
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(''); // State for selected workspace
  const [currentWorkspaceStatus, setCurrentWorkspaceStatus] = useState<string | null>(null); // State for current status
  const [isFetchingStatus, setIsFetchingStatus] = useState<boolean>(false); // Loading state for status fetch

  // Fetch workspaces on component mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const data = await workspaceApi.getAllWorkspaces();
        setWorkspaces(data);
      } catch (err) {
        console.error("Error fetching workspaces:", err);
        toast.error("Could not load workspace list.");
      }
    };
    fetchWorkspaces();
  }, []);

  // Effect to fetch current status when workspace selection changes
  useEffect(() => {
    if (selectedWorkspaceId && selectedWorkspaceId !== '') {
      const fetchStatus = async () => {
        setIsFetchingStatus(true);
        setCurrentWorkspaceStatus(null); // Clear previous status
        setError(null); // Clear previous errors
        try {
          const wsId = parseInt(selectedWorkspaceId);
          const details = await workspaceApi.getWorkspaceById(wsId);
          setCurrentWorkspaceStatus(details.is_available ? 'Available' : 'Occupied (Not Available)');
        } catch (err) {
          console.error(`Error fetching status for workspace ${selectedWorkspaceId}:`, err);
          setCurrentWorkspaceStatus('Error fetching status');
        }
        setIsFetchingStatus(false);
      };
      fetchStatus();
    } else {
      setCurrentWorkspaceStatus(null); // Clear status if no workspace selected
    }
  }, [selectedWorkspaceId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleCheckOccupancy = async () => {
    if (!selectedFile) {
      setError('Please select an image file first.');
      return;
    }
    // Optionally require workspace selection
    // if (!selectedWorkspaceId) {
    //   setError('Please select a workspace first.');
    //   return;
    // }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    // Add workspace_id if selected
    if (selectedWorkspaceId) {
      formData.append('workspace_id', selectedWorkspaceId);
    }

    // Manually construct the API call as it uses FormData
    // Get base URL from environment variables or default
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const API_V1_STR = "/api/v1";
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post<OccupancyResponse>(
        `${API_BASE_URL}${API_V1_STR}/monitoring/check-occupancy`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            // Include Authorization header if endpoint requires auth
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        }
      );
      setResult(response.data);
      toast.success(`Detection complete: ${response.data.person_count} person(s) found.`);
      // Add a message if status was updated
      if (selectedWorkspaceId && response.data.person_count > 0) {
         toast.info(`Workspace ${selectedWorkspaceId} status updated to Occupied (Not Available).`);
      } else if (selectedWorkspaceId) {
         toast.info(`Workspace ${selectedWorkspaceId} status updated to Available.`);
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      toast.error(`Failed to check occupancy: ${errorMsg}`);
      console.error('Error checking occupancy:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Workspace Occupancy Check</h1>

      <div className="bg-white p-6 rounded shadow-md space-y-4 mb-6">
        <h2 className="text-xl font-semibold">Upload Workspace Image</h2>
        <p className="text-sm text-gray-600">
          Select an image file to check occupancy. If you select a workspace, its availability status will be updated based on detection (people detected = Not Available).
        </p>
        
        {/* Workspace Selection Dropdown */}
        <div className="mt-4">
           <label htmlFor="workspaceSelect" className="block text-sm font-medium text-gray-700 mb-1">Select Workspace (Optional)</label>
           <div className="flex items-center space-x-4">
             <select
               id="workspaceSelect"
               className="form-input flex-grow"
               value={selectedWorkspaceId}
               onChange={(e) => setSelectedWorkspaceId(e.target.value)}
             >
               <option value="">-- Don't Update Status --</option>
               {workspaces.map(ws => (
                 <option key={ws.id} value={ws.id}>
                   {ws.name} (ID: {ws.id})
                 </option>
               ))}
             </select>
             {/* Display Current Status */} 
             <div className="w-40 text-sm text-right">
                {isFetchingStatus ? (
                   <span className="text-gray-500 italic">Loading status...</span>
                 ) : currentWorkspaceStatus ? (
                   <span className={`font-medium ${currentWorkspaceStatus === 'Available' ? 'text-green-600' : 'text-red-600'}`}>
                     Current: {currentWorkspaceStatus}
                   </span>
                 ) : selectedWorkspaceId ? (
                   <span className="text-gray-500 italic">-</span> // Placeholder if fetch failed or in progress initially
                 ) : null}
             </div>
           </div>
           <p className="text-xs text-gray-500 mt-1">If selected, the workspace availability will be set based on detection results.</p>
         </div>

        {/* Image Upload */}
        <div>
          <label htmlFor="imageUpload" className="block text-sm font-medium text-gray-700 mb-1">Select Image</label>
          <input 
            type="file"
            id="imageUpload"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
            className="form-input w-full"
          />
        </div>

        {/* Image Preview */}
        {previewUrl && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Preview:</p>
            <img src={previewUrl} alt="Preview" className="max-w-full h-auto rounded border border-gray-300" style={{ maxHeight: '300px' }}/>
          </div>
        )}
        
        {/* Submit Button */}
        <button 
          onClick={handleCheckOccupancy}
          disabled={!selectedFile || isLoading}
          className="btn-primary w-full mt-4 disabled:opacity-50"
        >
          {isLoading ? 'Processing Image...' : 'Check Occupancy & Update Status'}
        </button>
      </div>

      {/* Results Display */}      
      {result && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded shadow-md">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Detection Results</h3>
          <p><strong>People Detected:</strong> {result.person_count}</p>
          {/* Optionally display bounding box info */} 
          {result.detections && result.detections.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer">Detection Details ({result.detections.length})</summary>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(result.detections, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Error Display */}      
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default WorkspaceMonitoring; 