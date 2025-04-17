import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    AllocationRequest, 
    NeedLevel, 
    SuggestedWorkspace 
} from '../../types'; // Import from centralized types
import { allocationApi, handleApiError } from '../../services/api'; // Import API service and error handler

// Placeholder for getting user ID - replace with actual auth context/logic
const getCurrentUserId = (): number => {
  // In a real app, get this from auth state, context, or local storage
  console.warn("Using placeholder user ID: 1");
  return 1; 
};

const AllocationRequestForm: React.FC = () => {
  const navigate = useNavigate();
  
  // State for form fields aligned with AllocationRequest type
  const [teamSize, setTeamSize] = useState<number>(1);
  const [privacyNeed, setPrivacyNeed] = useState<NeedLevel>(NeedLevel.LOW);
  const [collaborationNeed, setCollaborationNeed] = useState<NeedLevel>(NeedLevel.LOW);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [requiredFacilitiesInput, setRequiredFacilitiesInput] = useState<string>(''); // Temp input
  const [preferredFloor, setPreferredFloor] = useState<string>(''); // Use string for input field
  const [preferredType, setPreferredType] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // State for API results and errors
  const [suggestions, setSuggestions] = useState<SuggestedWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Set default start/end times (e.g., now + 1 hour)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuggestions([]); // Clear previous suggestions
    setIsLoading(true);

    const userId = getCurrentUserId(); // Get current user ID

    // Basic validation
    if (!startTime || !endTime || new Date(startTime) >= new Date(endTime)) {
      setError('Please provide valid start and end times.');
      setIsLoading(false);
      return;
    }

    // Prepare request data
    const requestData: AllocationRequest = {
      user_id: userId,
      team_size: teamSize,
      start_time: new Date(startTime).toISOString(), // Convert to ISO string for backend
      end_time: new Date(endTime).toISOString(),   // Convert to ISO string for backend
      privacy_need: privacyNeed,
      collaboration_need: collaborationNeed,
      // Convert comma-separated string to array, trimming whitespace
      required_facilities: requiredFacilitiesInput.split(',').map(f => f.trim()).filter(f => f !== ''), 
      preferred_floor: preferredFloor ? parseInt(preferredFloor) : undefined,
      preferred_type: preferredType || undefined,
      notes: notes || undefined,
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

  // Function to navigate to confirmation page (example)
  const handleConfirm = (workspaceId: number) => {
    // Prepare data needed for confirmation
    const confirmationData = {
        user_id: getCurrentUserId(),
        workspace_id: workspaceId,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        team_size: teamSize,
        privacy_need: privacyNeed,
        collaboration_need: collaborationNeed,
        required_facilities: requiredFacilitiesInput.split(',').map(f => f.trim()).filter(f => f !== ''), 
        notes: notes || undefined,
    };
    // Navigate to a confirmation component/page, passing necessary data
    navigate('/confirm-allocation', { state: { confirmationData } });
    console.log("Confirming workspace:", workspaceId, confirmationData);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Request Workspace Allocation</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded shadow-md">
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
            >
              <option value={NeedLevel.LOW}>Low</option>
              <option value={NeedLevel.MEDIUM}>Medium</option>
              <option value={NeedLevel.HIGH}>High</option>
            </select>
          </div>
           <div>
            <label htmlFor="preferredFloor" className="block text-sm font-medium text-gray-700 mb-1">Preferred Floor <span className="text-xs">(Optional)</span></label>
            <input
              id="preferredFloor"
              type="number"
              min="1"
              className="form-input w-full"
              value={preferredFloor}
              onChange={(e) => setPreferredFloor(e.target.value)}
            />
          </div>
        </div>

        {/* Row 3: Required Facilities, Preferred Type */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
            {/* TODO: Replace with checkboxes or multi-select component */}
            <label htmlFor="requiredFacilities" className="block text-sm font-medium text-gray-700 mb-1">Required Facilities <span className="text-xs">(Comma-separated, Optional)</span></label>
            <input
              id="requiredFacilities"
              type="text"
              className="form-input w-full"
              value={requiredFacilitiesInput}
              onChange={(e) => setRequiredFacilitiesInput(e.target.value)}
              placeholder="e.g., Whiteboard, Projector"
            />
           </div>
            <div>
            <label htmlFor="preferredType" className="block text-sm font-medium text-gray-700 mb-1">Preferred Type <span className="text-xs">(Optional)</span></label>
            <input
              id="preferredType"
              type="text"
              className="form-input w-full"
              value={preferredType}
              onChange={(e) => setPreferredType(e.target.value)}
              placeholder="e.g., Meeting Room, Hot Desk"
            />
          </div>
         </div>

        {/* Row 4: Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-xs">(Optional)</span></label>
          <textarea
            id="notes"
            className="form-input w-full min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific requirements or context..."
          />
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          className="btn-primary w-full flex justify-center items-center" 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </>
          ) : (
            'Find Suitable Workspaces'
          )}
        </button>
      </form>

      {/* Error Display */}      
      {error && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Suggestions Display */}      
      {!isLoading && suggestions.length > 0 && (
        <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Suggested Workspaces</h2>
            <div className="space-y-4">
                {suggestions.map((ws) => (
                    <div key={ws.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                        <div>
                            <h3 className="font-bold">{ws.name} (Floor: {ws.floor}, Type: {ws.type})</h3>
                            <p>Capacity: {ws.capacity}</p>
                            <p>Facilities: {ws.facilities.join(', ') || 'None'}</p>
                            <p className="text-sm text-green-600">
                                Suitability: {ws.suitability_score?.toFixed(2)} 
                                (Confidence: {ws.confidence_score?.toFixed(2)})
                            </p>
                             {ws.reasoning && <p className="text-sm text-gray-600">Reasoning: {ws.reasoning}</p>}
                        </div>
                        <button 
                          onClick={() => handleConfirm(ws.id)}
                          className="btn-secondary"
                        >
                            Confirm
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default AllocationRequestForm;
