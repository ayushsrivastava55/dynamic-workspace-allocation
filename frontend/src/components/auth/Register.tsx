import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userApi, handleApiError } from '../../services/api';
import { UserCreate } from '../../types';
import { toast } from 'react-hot-toast';

const Register: React.FC = () => {
  const [formData, setFormData] = useState<UserCreate>({
    email: '',
    password: '',
    full_name: '',
    level: '', // Maybe provide dropdowns or suggestions?
    department: '', // Maybe provide dropdowns or suggestions?
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== confirmPassword) {
      setError("Passwords do not match.");
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      // Make sure all required fields are included
      const userData: UserCreate = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        level: formData.level,
        department: formData.department,
      };
      
      const createdUser = await userApi.createUser(userData);
      toast.success(`Registration successful for ${createdUser.email}! Please log in.`);
      navigate('/login'); // Redirect to login page after successful registration
      
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      toast.error(`Registration failed: ${errorMsg}`);
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Create your account
        </h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="sr-only">Full Name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              className="form-input rounded-t-md"
              placeholder="Full Name"
              value={formData.full_name}
              onChange={handleChange}
            />
          </div>
          {/* Email */}
          <div>
            <label htmlFor="email-address" className="sr-only">Email address</label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="form-input no-top-border"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          {/* Level */}
           <div>
            <label htmlFor="level" className="sr-only">Level</label>
            <input
              id="level"
              name="level"
              type="text" // Consider using a select/dropdown
              required
              className="form-input no-top-border"
              placeholder="Your Level (e.g., Staff, Manager)"
              value={formData.level}
              onChange={handleChange}
            />
          </div>
          {/* Department */}
          <div>
            <label htmlFor="department" className="sr-only">Department</label>
            <input
              id="department"
              name="department"
              type="text" // Consider using a select/dropdown
              required
              className="form-input no-top-border"
              placeholder="Your Department"
              value={formData.department}
              onChange={handleChange}
            />
          </div>
          {/* Password */}
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="form-input no-top-border"
              placeholder="Password (min 8 characters)"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              required
              className="form-input rounded-b-md no-top-border"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              <p>{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div>
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
                  Registering...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

// Helper CSS class for removing top border on adjacent inputs
const style = document.createElement('style');
style.innerHTML = `
  .no-top-border {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
`;
document.head.appendChild(style);


export default Register; 