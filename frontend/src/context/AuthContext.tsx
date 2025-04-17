// frontend/src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { User, UserLogin, Token } from '../types';
import { authApi, handleApiError } from '../services/api';
import { toast } from 'react-hot-toast';

// Define the shape of the context data
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean; // To handle initial loading state
  login: (credentials: UserLogin) => Promise<void>;
  logout: () => void;
}

// Create the context with a default value (usually null or undefined)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for the provider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create the AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading initially

  // Function to fetch user profile based on token
  const fetchUserProfile = useCallback(async (currentToken: string) => {
    if (currentToken) {
      try {
        // Set token for API calls if not already set by login
        // Note: axios interceptor should handle adding the token from localStorage
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
        setToken(currentToken); // Ensure token state is synced
        console.log("User profile fetched:", currentUser);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        // Token might be invalid/expired, clear auth state
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        toast.error("Session expired. Please log in again.");
      }
    }
    setIsLoading(false);
  }, []);

  // Check token and fetch user on initial mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      console.log("Token found in storage, fetching user...");
      fetchUserProfile(storedToken);
    } else {
      console.log("No token found, setting loading to false.");
      setIsLoading(false); // No token, not loading
    }
  }, [fetchUserProfile]);

  // Login function
  const login = async (credentials: UserLogin) => {
    setIsLoading(true);
    try {
      const tokenData: Token = await authApi.login(credentials);
      // authApi.login now handles localStorage.setItem('token', ...) internally
      await fetchUserProfile(tokenData.access_token); // Fetch profile after successful login
      // setIsLoading(false) will be handled by fetchUserProfile
    } catch (error) {
      // Error handling is done within authApi.login and fetchUserProfile
      // We re-throw here so the Login component can catch it for UI feedback
      setIsLoading(false); 
      throw error; 
    }
  };

  // Logout function
  const logout = () => {
    authApi.logout(); // Clears token from localStorage
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    toast.success("Logged out successfully.");
    // Optionally navigate user after logout (handled in component using navigate)
  };

  // Value provided by the context
  const value = {
    isAuthenticated,
    user,
    token,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 