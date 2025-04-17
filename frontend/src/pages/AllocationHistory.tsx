import React, { useState, useEffect, useCallback } from 'react';
import { allocationApi, handleApiError } from '../services/api';
import { Allocation, AllocationStatus } from '../types';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Helper to format dates
const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch { 
      return dateString; // Fallback
    }
}

const AllocationHistory: React.FC = () => {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<AllocationStatus | '' >(''); // Allow filtering by status
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Function to fetch allocations
  const fetchAllocations = useCallback(async () => {
    if (isAuthLoading || !isAuthenticated || !user) {
        if (isLoading) setIsLoading(false);
        setAllocations([]); 
        return; 
    }

    setIsLoading(true);
    setError(null);
    try {
      const params: { status?: AllocationStatus, user_id?: number } = { user_id: user.id };
      if (filterStatus) {
        params.status = filterStatus;
      }
      
      const data = await allocationApi.getAllocationHistory(params);
      setAllocations(data);
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      console.error('Error fetching allocation history:', err);
      toast.error(`Failed to load history: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, user, isAuthenticated, isAuthLoading, isLoading]);

  // Fetch data on component mount and when filter or user changes
  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  // Function to handle cancellation
  const handleCancel = async (allocationId: number) => {
    if (!isAuthenticated) return;
    
    if (!window.confirm('Are you sure you want to cancel this allocation?')) {
      return;
    }
    
    const toastId = toast.loading('Cancelling allocation...');
    try {
      await allocationApi.cancelAllocation(allocationId);
      toast.success('Allocation cancelled successfully!', { id: toastId });
      fetchAllocations();
    } catch (err) {
      const errorMsg = handleApiError(err);
      toast.error(`Cancellation failed: ${errorMsg}`, { id: toastId });
      console.error('Error cancelling allocation:', err);
    }
  };

  if (isAuthLoading || isLoading) {
      return <div className="container mx-auto px-4 py-8 text-center">Loading history...</div>;
  }
  
  if (!isAuthenticated) {
      return <div className="container mx-auto px-4 py-8 text-center text-red-600">Please log in to view your allocation history.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Allocation History</h1>

      {/* Filter Controls */}      
      <div className="mb-4">
        <label htmlFor="statusFilter" className="mr-2">Filter by Status:</label>
        <select 
          id="statusFilter"
          className="form-input w-auto"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as AllocationStatus | '')}
        >
          <option value="">All</option>
          <option value={AllocationStatus.ACTIVE}>Active</option>
          <option value={AllocationStatus.PENDING}>Pending</option>
          <option value={AllocationStatus.COMPLETED}>Completed</option>
          <option value={AllocationStatus.CANCELLED}>Cancelled</option>
        </select>
      </div>

      {/* Error State */}      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Data Table / List */}      
      <div className="bg-white shadow-md rounded overflow-x-auto">
        {allocations.length === 0 && !error ? (
            <p className="p-4 text-center text-gray-500">No allocations found matching your criteria.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workspace</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allocations.map((alloc) => (
                <tr key={alloc.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{alloc.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {alloc.workspace?.name ?? `ID: ${alloc.workspace_id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(alloc.start_time)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(alloc.end_time)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${alloc.status === AllocationStatus.ACTIVE ? 'bg-green-100 text-green-800' : 
                          alloc.status === AllocationStatus.PENDING ? 'bg-yellow-100 text-yellow-800' : 
                          alloc.status === AllocationStatus.COMPLETED ? 'bg-blue-100 text-blue-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                        {alloc.status}
                      </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {(alloc.status === AllocationStatus.ACTIVE || alloc.status === AllocationStatus.PENDING) && (
                      <button 
                        onClick={() => handleCancel(alloc.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AllocationHistory; 