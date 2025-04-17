import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const UserProfile: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading profile...</div>;
  }

  if (!user) {
    return <div className="container mx-auto px-4 py-8">User not found. Please log in again.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      
      <div className="bg-white p-6 rounded shadow-md space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Full Name</p>
          <p className="text-lg text-gray-900">{user.full_name}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Email Address</p>
          <p className="text-lg text-gray-900">{user.email}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Department</p>
          <p className="text-lg text-gray-900">{user.department}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Level</p>
          <p className="text-lg text-gray-900">{user.level}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Status</p>
          <p className={`text-lg ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
            {user.is_active ? 'Active' : 'Inactive'}
          </p>
        </div>
        
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 