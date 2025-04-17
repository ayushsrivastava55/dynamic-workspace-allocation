import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Workspace } from '../../types';
import { workspaceApi, handleApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const WorkspaceList: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoading: isAuthLoading } = useAuth();

  const fetchWorkspaces = useCallback(async () => {
    if (isAuthLoading) {
        if (!isLoading) setIsLoading(true);
        return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await workspaceApi.getAllWorkspaces();
      setWorkspaces(data);
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      toast.error(`Failed to load workspaces: ${errorMsg}`);
      console.error('Error fetching workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthLoading, isLoading]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  if (isAuthLoading || isLoading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading workspaces...</div>;
  }

  if (error) {
     return (
        <div className="container mx-auto px-4 py-8">
             <h1 className="text-2xl font-bold mb-8">Available Workspaces</h1>
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline"> {error}</span>
            </div>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Available Workspaces</h1>
        <Link to="/allocate" className="btn-primary">
          Book a Workspace
        </Link>
      </div>
      {workspaces.length === 0 ? (
         <p className="text-center text-gray-500 italic">No workspaces found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <div key={workspace.id} className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">
                {workspace.name}
              </h3>
              <div className="text-sm text-gray-600 space-y-1 mb-3">
                <p><span className="font-medium">Type:</span> {workspace.type}</p>
                <p><span className="font-medium">Floor:</span> {workspace.floor}</p>
                <p><span className="font-medium">Capacity:</span> {workspace.capacity} people</p>
                <p><span className="font-medium">Status:</span> 
                   <span className={`ml-2 font-semibold ${workspace.is_available ? 'text-green-600' : 'text-red-600'}`}>
                       {workspace.is_available ? 'Available' : 'Unavailable'}
                    </span>
                </p>
                {workspace.description && <p><span className="font-medium">Description:</span> {workspace.description}</p>}
                {workspace.facilities.length > 0 && (
                  <div>
                    <p className="font-medium">Facilities:</p>
                    <ul className="list-disc list-inside ml-4">
                      {workspace.facilities.map((facility, index) => (
                        <li key={index}>{facility}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
       )}
    </div>
  );
};

export default WorkspaceList;
