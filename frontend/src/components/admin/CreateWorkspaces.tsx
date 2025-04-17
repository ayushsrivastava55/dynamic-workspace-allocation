import React, { useState } from 'react';
import { workspaceApi, handleApiError } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const SAMPLE_WORKSPACES = [
  {
    name: "Meeting Room A101",
    type: "Meeting Room",
    floor: 1,
    capacity: 6,
    facilities: ["Whiteboard", "Projector", "Video Conferencing"],
    is_available: true,
    description: "A medium-sized meeting room with video conferencing capabilities."
  },
  {
    name: "Hot Desk Zone B",
    type: "Hot Desk",
    floor: 2,
    capacity: 10,
    facilities: ["Power Outlets", "Natural Light", "Ergonomic Chair"],
    is_available: true,
    description: "Open workspace with multiple hot desks for flexible working."
  },
  {
    name: "Conference Room C201",
    type: "Conference Room",
    floor: 2,
    capacity: 20,
    facilities: ["Whiteboard", "Projector", "TV Monitor", "Video Conferencing"],
    is_available: true,
    description: "Large conference room ideal for team presentations and client meetings."
  },
  {
    name: "Private Office D103",
    type: "Private Office",
    floor: 1,
    capacity: 3,
    facilities: ["Whiteboard", "Natural Light", "Standing Desk"],
    is_available: true,
    description: "Small private office for focused work or small meetings."
  },
  {
    name: "Collaboration Space E305",
    type: "Collaboration Space",
    floor: 3,
    capacity: 8,
    facilities: ["Whiteboard", "Coffee Machine", "Informal Seating"],
    is_available: true,
    description: "Creative space designed for team collaboration and brainstorming."
  },
  {
    name: "Phone Booth F204",
    type: "Phone Booth",
    floor: 2,
    capacity: 1,
    facilities: ["Power Outlets", "Soundproofing"],
    is_available: true,
    description: "Private booth for important calls or virtual meetings."
  },
  {
    name: "Quiet Zone G102",
    type: "Quiet Zone",
    floor: 1,
    capacity: 4,
    facilities: ["Natural Light", "Noise Cancellation"],
    is_available: true,
    description: "Dedicated quiet space for focused work."
  },
  {
    name: "Executive Suite H405",
    type: "Private Office",
    floor: 4,
    capacity: 2,
    facilities: ["Whiteboard", "TV Monitor", "Coffee Machine", "Private Bathroom"],
    is_available: true,
    description: "Premium office space reserved for executive meetings."
  }
];

const CreateWorkspaces: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ success: number, failed: number }>({ success: 0, failed: 0 });
  const [errors, setErrors] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const navigate = useNavigate();

  const handleAddSampleWorkspaces = async () => {
    setIsLoading(true);
    setResults({ success: 0, failed: 0 });
    setErrors([]);
    setIsComplete(false);
    
    const successCount = 0;
    const failedCount = 0;
    const errorMessages: string[] = [];
    
    // Create each workspace one by one
    for (const workspace of SAMPLE_WORKSPACES) {
      try {
        await workspaceApi.createWorkspace(workspace);
        setResults(prev => ({ ...prev, success: prev.success + 1 }));
      } catch (error) {
        setResults(prev => ({ ...prev, failed: prev.failed + 1 }));
        const errorMsg = handleApiError(error);
        setErrors(prev => [...prev, `Failed to create ${workspace.name}: ${errorMsg}`]);
      }
    }
    
    setIsLoading(false);
    setIsComplete(true);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Admin: Create Sample Workspaces</h1>
      
      <div className="bg-white p-6 rounded shadow-md mb-6">
        <p className="mb-4">
          This utility will add {SAMPLE_WORKSPACES.length} sample workspaces to the database.
          Use this to quickly populate your workspace inventory for testing.
        </p>
        
        <button
          onClick={handleAddSampleWorkspaces}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          {isLoading ? 'Adding Workspaces...' : 'Add Sample Workspaces'}
        </button>
      </div>
      
      {isComplete && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Process complete!</p>
          <p>Successfully added {results.success} workspaces.</p>
          {results.failed > 0 && <p>Failed to add {results.failed} workspaces.</p>}
        </div>
      )}
      
      {errors.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold mb-2">Errors:</p>
          <ul className="list-disc pl-5">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex justify-between mt-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded"
        >
          Back to Dashboard
        </button>
        
        {isComplete && results.success > 0 && (
          <button
            onClick={() => navigate('/allocate')}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
          >
            Try Booking Now
          </button>
        )}
      </div>
    </div>
  );
};

export default CreateWorkspaces; 