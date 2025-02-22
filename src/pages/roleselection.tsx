import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RoleSelection: React.FC = () => {
  const [role, setRole] = useState<'student' | 'teacher' | 'admin' | null>(null);
  const navigate = useNavigate();

  const handleRoleSelection = (selectedRole: 'student' | 'teacher' | 'admin') => {
    console.log('Role Selected:', selectedRole); // Debugging: Log the selected role
    setRole(selectedRole);
    navigate('/auth', { state: { role: selectedRole } });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Select Your Role</h2>
        <div className="space-y-4">
          <button
            onClick={() => handleRoleSelection('student')}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Student/Parent
          </button>
          <div className='hidden'>
            {role}
          </div>
          <button
            onClick={() => handleRoleSelection('teacher')}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Teacher
          </button>
          <button
            onClick={() => handleRoleSelection('admin')}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Administrator
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;