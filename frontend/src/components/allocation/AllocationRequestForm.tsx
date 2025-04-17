import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    AllocationRequest,
    NeedLevel,
    SuggestedWorkspace,
    AllocationConfirm
} from '../../types';
import { allocationApi, workspaceApi, handleApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Define common workspace types
const WORKSPACE_TYPES = [
  "Meeting Room",
  "Hot Desk",
  "Conference Room",
  "Private Office",
  "Open Workspace",
  "Collaboration Space",
  "Phone Booth",
  "Quiet Zone"
];

// Define common facilities
const COMMON_FACILITIES = [
  "Whiteboard",
  "Projector",
  "Video Conferencing",
  "TV Monitor",
  "Standing Desk",
  "Ergonomic Chair",
  "Power Outlets",
  "Natural Light",
  "Coffee Machine",
  "Printer",
  "Refrigerator",
  "Microwave"
];

const AllocationRequestForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Form state variables
  const [teamSize, setTeamSize] = useState<number>(1);
  const [privacyNeed, setPrivacyNeed] = useState<NeedLevel>(NeedLevel.LOW);
  const [collaborationNeed, setCollaborationNeed] = useState<NeedLevel>(NeedLevel.LOW);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [requiredFacilities, setRequiredFacilities] = useState<string[]>([]);
  const [preferredFloor, setPreferredFloor] = useState<string>('');
  const [preferredType, setPreferredType] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Available floors from workspaces
  const [availableFloors, setAvailableFloors] = useState<number[]>([]);

  // API state
  const [suggestions, setSuggestions] = useState<SuggestedWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Set default times
  useEffect(() => {
    const now = new Date();
    const startDefault = new Date(now.getTime() + 5 * 60000); // 5 mins from now
    const endDefault = new Date(startDefault.getTime() + 60 * 60000); // 1 hour duration
    
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateTimeLocal = (date: Date) => {
        const pad = (num: number) => num.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    setStartTime(formatDateTimeLocal(startDefault));
    setEndTime(formatDateTimeLocal(endDefault));
  }, []);

  // Fetch available floors from workspaces
  useEffect(() => {
    const fetchFloors = async () => {
      try {
        const workspaces = await workspaceApi.getAllWorkspaces();
        // Extract unique floors
        const floors = [...new Set(workspaces.map(w => w.floor))].sort((a, b) => a - b);
        
        // If no floors found from API, use default floors 1-10
        if (!floors.length) {
          setAvailableFloors([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        } else {
          setAvailableFloors(floors);
        }
      } catch (err) {
        console.error('Error fetching floors:', err);
        // Fallback to default floors if API fails
        setAvailableFloors([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      }
    };

    fetchFloors();
  }, []);

  // Handle facility checkbox changes
  const handleFacilityChange = (facility: string, checked: boolean) => {
    if (checked) {
      setRequiredFacilities([...requiredFacilities, facility]);
    } else {
      setRequiredFacilities(requiredFacilities.filter(f => f !== facility));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuggestions([]);
    setIsLoading(true);

    // Check if user is available from context
    if (!user || !isAuthenticated) {
        setError("User not authenticated. Please log in.");
        setIsLoading(false);
        return;
    }

    // Basic validation
    if (!startTime || !endTime || new Date(startTime) >= new Date(endTime)) {
      setError('Please provide valid start and end times.');
      setIsLoading(false);
      return;
    }

    // Prepare request data using user.id from context
    const requestData: AllocationRequest = {
      user_id: user.id,
      team_size: teamSize,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      privacy_need: privacyNeed,
      collaboration_need: collaborationNeed,
      required_facilities: requiredFacilities,
      preferred_floor: preferredFloor ? parseInt(preferredFloor) : null,
      preferred_type: preferredType || null,
      notes: notes || null,
    };

    try {
      const result = await allocationApi.getSuggestions(requestData);
      setSuggestions(result);
      if (result.length === 0) {
        setError("No suitable workspaces found for your request.");
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      console.error('Error fetching suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to navigate to confirmation page
  const handleConfirm = (workspaceId: number) => {
    if (!user || !isAuthenticated) {
        setError("User not authenticated. Cannot confirm.");
        return;
    }
    // Prepare data needed for confirmation using user.id
    const confirmationData: AllocationConfirm = {
        user_id: user.id,
        workspace_id: workspaceId,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        team_size: teamSize,
        privacy_need: privacyNeed,
        collaboration_need: collaborationNeed,
        required_facilities: requiredFacilities,
        notes: notes || undefined,
    };
    navigate('/confirm-allocation', { state: { confirmationData } });
  };
  
  if (isAuthLoading) {
      return <div className="container mx-auto px-4 py-8">Checking authentication...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Request Workspace Allocation</h1>
      {!isAuthenticated && <p className="text-red-600 mb-4">Please log in to request an allocation.</p>}
      <form onSubmit={handleSubmit} className={`space-y-6 bg-white p-6 rounded shadow-md ${!isAuthenticated ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Row 1: Team Size, Start Time, End Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="teamSize" className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
            <input
              id="teamSize"
              type="number"
              min="1"
              className="form-input w-full"
              value={teamSize}
              onChange={(e) => setTeamSize(parseInt(e.target.value))}
              required
              disabled={!isAuthenticated}
            />
          </div>
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              id="startTime"
              type="datetime-local"
              className="form-input w-full"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              disabled={!isAuthenticated}
            />
          </div>
          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              id="endTime"
              type="datetime-local"
              className="form-input w-full"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              disabled={!isAuthenticated}
            />
          </div>
        </div>

        {/* Row 2: Privacy Need, Collaboration Need, Preferred Floor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div>
            <label htmlFor="privacyNeed" className="block text-sm font-medium text-gray-700 mb-1">Privacy Need</label>
            <select
              id="privacyNeed"
              className="form-input w-full"
              value={privacyNeed}
              onChange={(e) => setPrivacyNeed(e.target.value as NeedLevel)}
              required
              disabled={!isAuthenticated}
            >
              <option value={NeedLevel.LOW}>Low</option>
              <option value={NeedLevel.MEDIUM}>Medium</option>
              <option value={NeedLevel.HIGH}>High</option>
            </select>
          </div>
           <div>
            <label htmlFor="collaborationNeed" className="block text-sm font-medium text-gray-700 mb-1">Collaboration Need</label>
            <select
              id="collaborationNeed"
              className="form-input w-full"
              value={collaborationNeed}
              onChange={(e) => setCollaborationNeed(e.target.value as NeedLevel)}
              required
              disabled={!isAuthenticated}
            >
              <option value={NeedLevel.LOW}>Low</option>
              <option value={NeedLevel.MEDIUM}>Medium</option>
              <option value={NeedLevel.HIGH}>High</option>
            </select>
          </div>
           <div>
            <label htmlFor="preferredFloor" className="block text-sm font-medium text-gray-700 mb-1">Preferred Floor <span className="text-xs">(Optional)</span></label>
            <select
              id="preferredFloor"
              className="form-input w-full"
              value={preferredFloor}
              onChange={(e) => setPreferredFloor(e.target.value)}
              disabled={!isAuthenticated}
            >
              <option value="">Any Floor</option>
              {availableFloors.map(floor => (
                <option key={floor} value={floor}>Floor {floor}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Preferred Type */}
        <div>
          <label htmlFor="preferredType" className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Workspace Type <span className="text-xs">(Optional)</span>
          </label>
          <select
            id="preferredType"
            className="form-input w-full"
            value={preferredType}
            onChange={(e) => setPreferredType(e.target.value)}
            disabled={!isAuthenticated}
          >
            <option value="">Any Type</option>
            {WORKSPACE_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Row 4: Required Facilities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Required Facilities <span className="text-xs">(Optional)</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {COMMON_FACILITIES.map(facility => (
              <div key={facility} className="flex items-center">
                <input
                  type="checkbox"
                  id={`facility-${facility}`}
                  checked={requiredFacilities.includes(facility)}
                  onChange={(e) => handleFacilityChange(facility, e.target.checked)}
                  disabled={!isAuthenticated}
                  className="mr-2"
                />
                <label htmlFor={`facility-${facility}`} className="text-sm">
                  {facility}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Row 5: Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-xs">(Optional)</span></label>
          <textarea
            id="notes"
            className="form-input w-full min-h-[100px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter any additional requirements or notes"
            disabled={!isAuthenticated}
          ></textarea>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary py-2 px-4 disabled:opacity-50"
            disabled={isLoading || !isAuthenticated}
          >
            {isLoading ? 'Finding Workspaces...' : 'Find Available Workspaces'}
          </button>
        </div>
      </form>

      {/* Results Section - Added console log */}
      {console.log('Rendering suggestions section. isLoading:', isLoading, 'suggestions:', suggestions)}
      {!isLoading && suggestions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Suggested Workspaces</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((suggestion) => (
              <div key={suggestion.workspace_id} className="bg-white rounded shadow p-4">
                {/* Display Workspace Details from suggestion.workspace */}
                {suggestion.workspace ? (
                  <>
                    <h3 className="text-lg font-semibold">{suggestion.workspace.name}</h3>
                    <p className="text-sm text-gray-500 mb-1">Type: {suggestion.workspace.type} | Floor: {suggestion.workspace.floor} | Capacity: {suggestion.workspace.capacity}</p>
                    {suggestion.workspace.facilities && suggestion.workspace.facilities.length > 0 && (
                      <p className="text-xs text-gray-500 mb-2">Facilities: {suggestion.workspace.facilities.join(', ')}</p>
                    )}
                  </>
                ) : (
                  <h3 className="text-lg font-semibold">Workspace ID: {suggestion.workspace_id}</h3>
                )}
                
                {/* Display Scores */}
                <p className="text-sm text-gray-600 mb-1">Suitability: {suggestion.suitability_score?.toFixed(1)}%</p>
                <p className="text-sm text-gray-600 mb-2">Confidence: {(suggestion.confidence_score * 100)?.toFixed(1)}%</p>
                
                {/* Display Reasoning */}
                {suggestion.reasoning && suggestion.reasoning.length > 0 && (
                  <div className="mb-3 text-xs text-gray-500">
                    <strong>Reasoning:</strong>
                    <ul className="list-disc pl-4">
                      {suggestion.reasoning.map((reason, idx) => <li key={idx}>{reason}</li>)}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end items-center mt-2">
                  <button
                    type="button"
                    onClick={() => handleConfirm(suggestion.workspace_id)} // Use workspace_id here
                    className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm transition duration-150"
                  >
                    Select This Space
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllocationRequestForm; 