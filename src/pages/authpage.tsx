import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useLocation, useNavigate } from 'react-router-dom';

const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { role, schoolId } = location.state || {};

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Step 1: Sign in with email and password
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Step 2: Determine the table to query based on the user's role
        const tableName = role === 'teacher' ? 'teachers' : role === 'student' ? 'students' : 'administrators';

        // Step 3: Fetch the user's role-specific data from the relevant table
        const { data: userData, error: queryError } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', data.user.id) // Match the user_id in the table with the authenticated user's ID
          .single();

        if (queryError) throw queryError;

        // Step 4: Verify that the user's school_id matches the selected school_id
        if (userData.school_id !== schoolId) {
          throw new Error('You are not authorized to access this school.');
        }

        // Step 5: Update the user's metadata with role, school_id, and role-specific ID
        await supabase.auth.updateUser({
          data: {
            role,
            school_id: schoolId,
            [role === 'teacher' ? 'teacher_id' : role === 'student' ? 'student_id' : 'admin_id']: userData.id,
          },
        });

        const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('name')
        .eq('id', schoolId)
        .single();
      
      if (schoolError) throw schoolError;

        // Step 6: Store user data in local storage
        await Promise.all([
          localStorage.setItem('user', JSON.stringify(data.user)),
          localStorage.setItem('school_id', schoolId),
          localStorage.setItem('school_name', schoolData.name),
          localStorage.setItem(`${role}_id`, userData.id)
        ]);

        // Step 7: Redirect to the dashboard or home page
        navigate('/');
      }
    } catch (err) {
      console.error('Login Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during login.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleLogin}>
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
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
