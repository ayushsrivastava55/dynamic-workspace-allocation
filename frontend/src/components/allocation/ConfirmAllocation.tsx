import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AllocationConfirm, Allocation, Workspace } from '../../types'; // Import Workspace
import { allocationApi, workspaceApi, handleApiError } from '../../services/api'; // Import workspaceApi

const ConfirmAllocation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract confirmationData passed via navigation state
  const confirmationData: AllocationConfirm | undefined = location.state?.confirmationData;

  const [isLoading, setIsLoading] = useState<boolean>(false); // Loading for confirmation API call
  const [isFetchingDetails, setIsFetchingDetails] = useState<boolean>(true); // Loading for workspace details
  const [error, setError] = useState<string | null>(null);
  const [confirmedAllocation, setConfirmedAllocation] = useState<Allocation | null>(null);
  const [workspaceDetails, setWorkspaceDetails] = useState<Workspace | null>(null); // State for workspace details

  // Effect to check data and fetch workspace details
  useEffect(() => {
    console.log("ConfirmAllocation mounted. Location state:", location.state);
    if (!confirmationData) {
      console.error('Confirmation data missing, redirecting...');
      navigate('/'); 
      return; 
    } else {
      console.log("Received confirmation data:", confirmationData);
      // Fetch workspace details
      const fetchDetails = async () => {
        setIsFetchingDetails(true);
        try {
          const details = await workspaceApi.getWorkspaceById(confirmationData.workspace_id);
          console.log("Fetched workspace details:", details);
          setWorkspaceDetails(details);
        } catch (err) {
          console.error("Error fetching workspace details:", err);
          setError("Failed to load workspace details.");
        }
        setIsFetchingDetails(false);
      };
      fetchDetails();
    }
  }, [confirmationData, navigate, location.state]);

  const handleConfirmClick = async () => {
    if (!confirmationData) return; // Should not happen due to useEffect redirect

    console.log("Confirm button clicked. Data:", confirmationData); // Log data on click
    setIsLoading(true);
    setError(null);
    setConfirmedAllocation(null);

    try {
      console.log("Calling allocationApi.confirmAllocation..."); // Log before API call
      const result = await allocationApi.confirmAllocation(confirmationData);
      console.log("API call successful. Result:", result); // Log API result
      setConfirmedAllocation(result);
      // Optional: Show success message before redirecting
      alert('Allocation confirmed successfully!');
      // Redirect to allocation history or dashboard after successful confirmation
      navigate('/dashboard'); // Changed redirect to dashboard
    } catch (err) {
      const errorMsg = handleApiError(err);
      console.error("Error confirming allocation:", err); // Ensure full error is logged
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Render loading state or redirect message if data not ready
  if (!confirmationData || isFetchingDetails) {
    return <div className="container mx-auto px-4 py-8">Loading allocation details...</div>;
  }

  // Format dates for display
  const formatDate = (dateString: string) => {
      try {
        return new Date(dateString).toLocaleString();
      } catch { 
        return dateString; // Fallback if parsing fails
      }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Confirm Your Allocation</h1>
      
      {confirmedAllocation ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> Allocation ID: {confirmedAllocation.id} confirmed.</span>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary ml-4">Go to Dashboard</button>
        </div>
      ) : (
        <div className="bg-white p-6 rounded shadow-md space-y-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Review Your Booking Details</h2>
          
          {/* Display Fetched Workspace Details */}          
          {workspaceDetails ? (
            <>
              <p><strong>Workspace:</strong> {workspaceDetails.name} ({workspaceDetails.type})</p>
              <p><strong>Floor:</strong> {workspaceDetails.floor}</p>
              <p><strong>Capacity:</strong> {workspaceDetails.capacity}</p>
              {workspaceDetails.facilities && workspaceDetails.facilities.length > 0 && (
                 <p><strong>Facilities:</strong> {workspaceDetails.facilities.join(', ')}</p>
              )}
            </>
          ) : (
            <p className="text-gray-500">Loading workspace info...</p>
          )}

          <hr className="my-4" />

          {/* Display Booking Details from confirmationData */} 
          <p><strong>User ID:</strong> {confirmationData.user_id}</p>
          <p><strong>Team Size:</strong> {confirmationData.team_size}</p>
          <p><strong>Start Time:</strong> {formatDate(confirmationData.start_time)}</p>
          <p><strong>End Time:</strong> {formatDate(confirmationData.end_time)}</p>
          <p><strong>Privacy Need:</strong> {confirmationData.privacy_need}</p>
          <p><strong>Collaboration Need:</strong> {confirmationData.collaboration_need}</p>
          {confirmationData.required_facilities && confirmationData.required_facilities.length > 0 && (
            <p><strong>Required Facilities:</strong> {confirmationData.required_facilities.join(', ')}</p>
          )}
          {confirmationData.notes && <p><strong>Notes:</strong> {confirmationData.notes}</p>}

          {/* Display Error */}      
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <p className="font-bold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {/* Confirmation Button */}      
          <button 
            onClick={handleConfirmClick}
            className="btn-primary w-full flex justify-center items-center mt-4"
            disabled={isLoading || isFetchingDetails} // Disable if fetching details or confirming
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Confirming...
              </>
            ) : (
              'Confirm Allocation'
            )}
          </button>
        </div>
      )}
      
      {/* Only show back button if not confirmed yet */}
      {!confirmedAllocation && (
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline mt-4">
          &larr; Back to Suggestions
        </button>
      )}

    </div>
  );
};

export default ConfirmAllocation; 