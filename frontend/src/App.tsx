import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';
import { List, ListItem, ListItemIcon, ListItemText, Toolbar, Box, CssBaseline, ThemeProvider, Drawer, AppBar, IconButton, Typography } from '@mui/material';
import ListItemButton from '@mui/material/ListItemButton';
import EventIcon from '@mui/icons-material/Event';
import HistoryIcon from '@mui/icons-material/History';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import WorkspaceList from './components/workspaces/WorkspaceList';
import AllocationRequestForm from './components/allocation/AllocationRequestForm';
import ConfirmAllocation from './components/allocation/ConfirmAllocation';
import WorkspaceAllocation from './pages/WorkspaceAllocation';
import AllocationHistory from './pages/AllocationHistory';
import CreateWorkspaces from './components/admin/CreateWorkspaces';
import UserProfile from './pages/UserProfile';
import WorkspaceMonitoring from './pages/WorkspaceMonitoring';
import WorkspaceStatusChecker from './pages/WorkspaceStatusChecker';

const PrivateRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading Authentication...</div>;
  }

  return isAuthenticated ? element : <Navigate to="/login" replace />;
};

const queryClient = new QueryClient();

const theme = createTheme({
  // Add your theme customization here
});

const drawerWidth = 240;

const App: React.FC = () => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar />
      <List>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/allocate">
            <ListItemIcon>
              <EventIcon />
            </ListItemIcon>
            <ListItemText primary="Book Workspace" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/allocation-history">
            <ListItemIcon>
              <HistoryIcon />
            </ListItemIcon>
            <ListItemText primary="History" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/profile">
            <ListItemIcon>
              <AccountCircleIcon />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/monitoring">
            <ListItemIcon>
              <CameraAltIcon />
            </ListItemIcon>
            <ListItemText primary="Monitor Workspace" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/workspace-status">
            <ListItemIcon>
              <AccessTimeIcon />
            </ListItemIcon>
            <ListItemText primary="Check Status" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Box sx={{ display: 'flex' }}>
              <AppBar 
                position="fixed"
                sx={{ 
                  width: { sm: `calc(100% - ${drawerWidth}px)` },
                  ml: { sm: `${drawerWidth}px` },
                }}
              >
                <Toolbar>
                  <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={handleDrawerToggle}
                    sx={{ mr: 2, display: { sm: 'none' } }}
                  >
                    <MenuIcon />
                  </IconButton>
                  <Typography variant="h6" noWrap component="div">
                    Workspace Manager
                  </Typography>
                </Toolbar>
              </AppBar>
              <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                aria-label="mailbox folders"
              >
                <Drawer
                  variant="temporary"
                  open={mobileOpen}
                  onClose={handleDrawerToggle}
                  ModalProps={{ keepMounted: true }}
                  sx={{ 
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
                  }}
                >
                  {drawer}
                </Drawer>
                <Drawer
                  variant="permanent"
                  sx={{ 
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
                  }}
                  open
                >
                  {drawer}
                </Drawer>
              </Box>
              <Box
                component="main"
                sx={{
                  flexGrow: 1,
                  p: 3,
                  width: { sm: `calc(100% - ${drawerWidth}px)` }
                }}
              >
                <Toolbar />
                <Routes>
                  <Route path="/" element={<WorkspaceAllocation />} />
                  <Route path="/allocate" element={<PrivateRoute element={<AllocationRequestForm />} />} />
                  <Route path="/history" element={<PrivateRoute element={<AllocationHistory />} />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route
                    path="/dashboard"
                    element={<PrivateRoute element={<Dashboard />} />}
                  />
                  <Route
                    path="/workspaces"
                    element={<PrivateRoute element={<WorkspaceList />} />}
                  />
                  <Route
                    path="/confirm-allocation"
                    element={<PrivateRoute element={<ConfirmAllocation />} />}
                  />
                  <Route
                    path="/allocation-history"
                    element={<PrivateRoute element={<AllocationHistory />} />}
                  />
                  <Route path="/admin/workspaces/create" element={<CreateWorkspaces />} />
                  <Route
                    path="/profile"
                    element={<PrivateRoute element={<UserProfile />} />}
                  />
                  <Route
                    path="/monitoring"
                    element={<PrivateRoute element={<WorkspaceMonitoring />} />}
                  />
                  <Route
                    path="/workspace-status"
                    element={<PrivateRoute element={<WorkspaceStatusChecker />} />}
                  />
                  <Route path="*" element={
                    localStorage.getItem('token')
                      ? <Navigate to="/dashboard" replace />
                      : <Navigate to="/login" replace />
                  } />
                </Routes>
              </Box>
            </Box>
          </Router>
        </AuthProvider>
        <Toaster position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
