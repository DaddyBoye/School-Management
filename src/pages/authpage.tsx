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
      // 1. Authenticate with email/password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
  
      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from authentication');
  
      // 2. Check if user exists in the specified role table for the specified school
      const { data: roleData, error: roleError } = await supabase
        .from(role === 'teacher' ? 'teachers' : 
              role === 'student' ? 'students' : 
              'administrators')
        .select('id, school_id')
        .eq('user_id', authData.user.id)
        .eq('school_id', schoolId);
  
      if (roleError) throw roleError;
  
      // 3. Verify the user has this role in this school
      if (!roleData || roleData.length === 0) {
        await supabase.auth.signOut();
        throw new Error(`You are not registered as a ${role} in this school.`);
      }
  
      const roleRecord = roleData[0];
  
      // 4. Update user metadata with role and school info
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          role,
          school_id: schoolId,
          [`${role}_id`]: roleRecord.id,
        },
      });
  
      if (updateError) throw updateError;
  
      // 5. Get school name for storage
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('name')
        .eq('id', schoolId)
        .single();
  
      if (schoolError) throw schoolError;
  
      // 6. Store session data
      localStorage.setItem('user', JSON.stringify(authData.user));
      localStorage.setItem('userRole', role);
      localStorage.setItem('school_id', schoolId);
      localStorage.setItem('school_name', schoolData.name);
      localStorage.setItem(`${role}_id`, roleRecord.id);
  
      // 7. Redirect to dashboard
      navigate('/');
  
    } catch (err) {
      console.error('Login Error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      // Ensure clean state on error
      await supabase.auth.signOut();
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
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
