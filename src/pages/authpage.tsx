import React, { useState } from 'react';
import { supabase } from "../supabase";
import { useLocation, useNavigate } from 'react-router-dom';

const AuthPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();
  
    const selectedRole = location.state?.role;
    console.log('AuthPage - Selected Role:', selectedRole); // Debugging: Log the selected role
  
    const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
  
      try {
        if (isSignUp) {
          console.log('Signing up with role:', selectedRole); // Debugging: Log signup attempt
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                role: selectedRole,
              },
            },
          });
  
          if (error) throw error;
  
          if (data.user) {
            console.log('Signup successful. User:', data.user); // Debugging: Log successful signup
            localStorage.setItem('user', JSON.stringify(data.user));
            navigate('/');
          }
        } else {
          console.log('Logging in with email:', email); // Debugging: Log login attempt
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
  
          if (error) throw error;
  
          if (data.user) {
            console.log('Login successful. User:', data.user); // Debugging: Log successful login
            localStorage.setItem('user', JSON.stringify(data.user));
            navigate('/');
          }
        }
      } catch (err) {
        console.error('Auth Error:', err); // Debugging: Log any errors
        setError(err instanceof Error ? err.message : 'An error occurred during authentication.');
      }
    };
  
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {isSignUp ? 'Sign Up' : 'Login'}
          </h2>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <form onSubmit={handleAuth}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 bg-white py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 bg-white py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isSignUp ? 'Sign Up' : 'Login'}
            </button>
          </form>
          <p className="mt-4 text-center">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setIsSignUp(false)}
                  className="text-blue-500 hover:underline"
                >
                  Login
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => setIsSignUp(true)}
                  className="text-blue-500 hover:underline"
                >
                  Sign Up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    );
  };
  
  export default AuthPage;