import React, { useState, useEffect } from 'react';
import { workspaceApi, handleApiError } from '../services/api';
import { Workspace } from '../types';
import { toast } from 'react-hot-toast';

interface StatusInfo {
  status: string;
  occupied_until: string | null;
}

const WorkspaceStatusChecker: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [statusInfo, setStatusInfo] = useState<StatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspaces on mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const data = await workspaceApi.getAllWorkspaces();
        setWorkspaces(data);
      } catch (err) {
        console.error("Error fetching workspaces:", err);
        toast.error("Could not load workspace list.");
        setError("Could not load workspace list.");
      }
    };
    fetchWorkspaces();
  }, []);

  // Fetch status when selection changes
  useEffect(() => {
    if (selectedWorkspaceId && selectedWorkspaceId !== '') {
      const fetchStatus = async () => {
        setIsLoading(true);
        setStatusInfo(null); // Clear previous status
        setError(null);
        try {
          const wsId = parseInt(selectedWorkspaceId);
          const data = await workspaceApi.getWorkspaceStatus(wsId);
          setStatusInfo(data);
        } catch (err) {
          const errorMsg = handleApiError(err);
          setError(errorMsg);
          setStatusInfo(null);
          console.error(`Error fetching status for workspace ${selectedWorkspaceId}:`, err);
        }
        setIsLoading(false);
      };
      fetchStatus();
    } else {
      setStatusInfo(null); // Clear status if no workspace selected
      setError(null);
    }
  }, [selectedWorkspaceId]);

  const getStatusColor = (status: string | undefined | null): string => {
    switch (status) {
      case 'Available':
        return 'text-green-600';
      case 'Occupied':
        return 'text-red-600';
      case 'Unavailable':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };
  
  const formatDate = (dateString: string | null): string => {
      if (!dateString) return 'N/A';
      try {
        return new Date(dateString).toLocaleString();
      } catch { 
        return dateString; 
      }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Check Workspace Status (by Schedule)</h1>
      
      <div className="bg-white p-6 rounded shadow-md space-y-4">
        <div>
          <label htmlFor="workspaceSelectStatus" className="block text-sm font-medium text-gray-700 mb-1">
            Select Workspace
          </label>
          <select
            id="workspaceSelectStatus"
            className="form-input w-full"
            value={selectedWorkspaceId}
            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            disabled={workspaces.length === 0}
          >
            <option value="">-- Select a Workspace --</option>
            {workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>
                {ws.name} (ID: {ws.id}, Floor: {ws.floor})
              </option>
            ))}
          </select>
        </div>

        {isLoading && (
          <p className="text-blue-600 italic">Checking status...</p>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        )}
        
        {statusInfo && !isLoading && !error && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
            <h3 className="text-lg font-semibold mb-2">Current Status:</h3>
            <p className={`text-xl font-bold ${getStatusColor(statusInfo.status)}`}>
              {statusInfo.status}
            </p>
            {statusInfo.status === 'Occupied' && (
              <p className="text-sm text-gray-600 mt-1">
                Occupied until: {formatDate(statusInfo.occupied_until)}
              </p>
            )}
             {statusInfo.status === 'Unavailable' && (
              <p className="text-sm text-gray-600 mt-1">
                This workspace is marked as generally unavailable (not bookable).
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceStatusChecker; 