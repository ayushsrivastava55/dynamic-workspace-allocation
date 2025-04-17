import React from 'react';
import { Container, Grid, Typography } from '@mui/material';
// import { useMutation } from '@tanstack/react-query'; // Not used if suggestions handled in form
// import { toast } from 'react-hot-toast'; // Not used directly here now
import AllocationRequestForm from '../components/allocation/AllocationRequestForm';
// import WorkspaceSuggestions from '../components/WorkspaceSuggestions'; // Removed import
// import { allocationApi } from '../services/api'; // Not used directly here now
// import { AllocationRequest, AllocationResponse } from '../types/allocation'; // Incorrect path, types now in ../types

// These constants might be used within AllocationRequestForm now, remove if unused here
/*
const FACILITIES = [...];
const WORKSPACE_TYPES = [...];
const FLOORS = [...];
*/

const WorkspaceAllocation: React.FC = () => {
  // State and mutations related to suggestions/allocation are likely handled within AllocationRequestForm now
  // Remove if not needed at this page level
  /*
  const [currentRequest, setCurrentRequest] = React.useState<AllocationRequest | null>(null);
  const [suggestions, setSuggestions] = React.useState<AllocationResponse[]>([]);
  const getSuggestionsMutation = useMutation({ ... });
  const allocateMutation = useMutation({ ... });
  const handleSubmit = (request: AllocationRequest) => { ... };
  const handleSelect = (suggestion: AllocationResponse) => { ... };
  */

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Workspace Allocation
      </Typography>
      
      {/* Render the form component. It handles its own logic. */}
      <AllocationRequestForm />
      
      {/* Remove the Grid structure if it only contained the form and suggestions */}
      {/* 
      <Grid container spacing={4}>
        <Grid item xs={12} md={5}>
          <AllocationRequestForm
            // Remove props - form handles its own state/logic
            // onSubmit={handleSubmit} 
            // facilities={FACILITIES}
            // workspaceTypes={WORKSPACE_TYPES}
            // floors={FLOORS}
            // isLoading={getSuggestionsMutation.isPending}
          />
        </Grid>
        
        <Grid item xs={12} md={7}>
           {currentRequest && suggestions.length > 0 && (
            <WorkspaceSuggestions // Removed usage
              // ...props 
            />
          )} 
        </Grid>
      </Grid>
      */}
    </Container>
  );
};

export default WorkspaceAllocation; 