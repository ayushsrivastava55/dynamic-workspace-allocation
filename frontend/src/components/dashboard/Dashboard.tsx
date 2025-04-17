import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi, allocationApi, handleApiError } from '../../services/api';
import { Workspace, Allocation, AllocationStatus, AllocationConfirm, NeedLevel } from '../../types';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch { 
      return dateString;
    }
}

// Define interface for the overview data structure
interface DashboardOverviewData {
  workspace_counts: { total_workspaces: number, available_workspaces: number };
  active_count: number;
  upcoming_count: number;
  pending_count: number;
  active_allocations: Allocation[]; // May need adjustments based on actual API response fields
  available_workspaces: Workspace[];
}

const Dashboard: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  // State to hold dashboard overview data
  const [overviewData, setOverviewData] = useState<DashboardOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (isAuthLoading || !user) {
        if (isLoading) setIsLoading(false);
        return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
        // Use the single-request dashboard endpoint
        const data: DashboardOverviewData = await dashboardApi.getDashboardOverview(user.id);
        console.log("Fetched dashboard overview data:", data); // Debug log
        setOverviewData(data);
    } catch (err) {
        const errorMsg = handleApiError(err);
        setError(errorMsg);
        toast.error(`Failed to load dashboard data: ${errorMsg}`);
        console.error('Error fetching dashboard data:', err);
    } finally {
        setIsLoading(false);
    }
  }, [user, isAuthLoading]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Cancel Allocation Function
  const cancelAllocation = async (allocationId: number) => {
    const toastId = toast.loading('Cancelling allocation...');
    try {
      await allocationApi.cancelAllocation(allocationId);
      toast.success("Allocation cancelled successfully", { id: toastId });
      fetchDashboardData(); // Refresh data after cancellation
    } catch (err) {
      const errorMsg = handleApiError(err);
      toast.error(`Failed to cancel allocation: ${errorMsg}`, { id: toastId });
    }
  };

  // Handle Book Now
  const handleBookNow = (workspaceId: number) => {
    if (!user) {
      toast.error("Please log in to book a workspace.");
      return;
    }
    
    const now = new Date();
    const startTime = new Date(now.getTime() + 5 * 60000); 
    const endTime = new Date(startTime.getTime() + 60 * 60000);

    const confirmationData: AllocationConfirm = {
      user_id: user.id,
      workspace_id: workspaceId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      team_size: 1, 
      privacy_need: NeedLevel.LOW, 
      collaboration_need: NeedLevel.LOW,
      required_facilities: [],
      notes: "Booked via Dashboard Quick Book",
    };
    
    navigate('/confirm-allocation', { state: { confirmationData } });
  };
  
  // --- Loading and Error States ---
  if (isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
        {/* Skeleton Loading UI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="bg-white p-6 rounded-lg shadow mb-8 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-6"></div>
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-4 bg-gray-200 rounded w-full mb-4"></div>
          ))}
        </div>
        <p className="text-center text-gray-500">Loading your dashboard data...</p>
      </div>
    );
  }

  if (error) {
     return (
        <div className="container mx-auto px-4 py-8">
             <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline"> {error}</span>
            </div>
        </div>
    );
  }
  
  if (!overviewData) {
     return (
        <div className="container mx-auto px-4 py-8">
             <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
             <p className="text-center text-gray-500">No dashboard data available.</p>
        </div>
    );
  }
  
  // --- Render Dashboard Content ---
  const activeAllocations = overviewData.active_allocations || [];
  const availableWorkspaces = overviewData.available_workspaces || [];
  const workspaceCounts = overviewData.workspace_counts || { total_workspaces: 0, available_workspaces: 0 };

  return (
    <div className="container mx-auto px-4 py-8">
      {user && <h1 className="text-3xl font-bold mb-4">Welcome, {user.full_name}!</h1>}
      <p className="text-lg text-gray-600 mb-8">Here's an overview of your workspace usage.</p>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500">Total Workspaces</h3>
          <p className="text-3xl font-semibold text-blue-600 mt-2">
            {workspaceCounts.total_workspaces}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {workspaceCounts.available_workspaces} available now
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500">Your Bookings</h3>
          <p className="text-3xl font-semibold text-green-600 mt-2">
            {overviewData.active_count}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {overviewData.upcoming_count} upcoming, {overviewData.pending_count} pending
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-between">
          <h3 className="text-lg font-medium text-gray-500">Quick Actions</h3>
          <div className="flex flex-col gap-2 mt-2">
            <Link to="/allocate" className="btn-primary text-center">
               Book a Workspace
            </Link>
            <Link to="/allocation-history" className="text-blue-600 hover:underline text-sm text-center">
               View History
            </Link>
             {/* Admin Link - Consider conditional rendering based on user role */}
             <Link to="/admin/workspaces/create" className="text-gray-600 hover:underline text-xs text-center mt-2">
               Admin: Add Sample Workspaces
             </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500">Department</h3>
          <p className="text-xl font-semibold text-gray-800 mt-2">
            {user?.department || 'N/A'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Level: {user?.level || 'N/A'}
          </p>
        </div>
      </div>

      {/* Active Allocations Table */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Active Allocations</h2>
        <div className="overflow-x-auto">
          {activeAllocations.length === 0 ? (
            <p className="text-gray-500 italic">You have no active allocations.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workspace</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeAllocations.map((allocation) => (
                  <tr key={allocation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {allocation.workspace?.name ?? `ID: ${allocation.workspace_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(allocation.start_time)}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(allocation.end_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {allocation.team_size} people
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${allocation.status === AllocationStatus.ACTIVE ? 'bg-green-100 text-green-800' : 
                          allocation.status === AllocationStatus.PENDING ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {allocation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        onClick={() => cancelAllocation(allocation.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-4">
          <Link to="/allocation-history" className="text-blue-600 hover:underline">
            View Full History &rarr;
          </Link>
        </div>
      </div>
      
      {/* Available Workspaces Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Available Workspaces</h2>
          <Link to="/workspaces" className="text-blue-600 hover:underline text-sm">
            View All Workspaces
          </Link>
        </div>
        <div className="overflow-x-auto">
          {availableWorkspaces.length === 0 ? (
            <p className="text-gray-500 italic">No available workspaces found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableWorkspaces
                .slice(0, 6) // Show only the first 6 available workspaces
                .map((workspace) => (
                  <div key={workspace.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <h3 className="font-semibold text-gray-800">{workspace.name}</h3>
                    <p className="text-sm text-gray-600">Type: {workspace.type}</p>
                    <p className="text-sm text-gray-600">Floor: {workspace.floor}</p>
                    <p className="text-sm text-gray-600">Capacity: {workspace.capacity} people</p>
                    <button
                      onClick={() => handleBookNow(workspace.id)}
                      className="mt-2 btn-secondary btn-sm text-xs text-white"
                    >
                      Book Now (Next Hour)
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
