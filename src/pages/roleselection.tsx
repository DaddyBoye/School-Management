import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RoleSelection: React.FC = () => {
  const [role, setRole] = useState<'student' | 'teacher' | 'admin' | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Mock schools data (replace with actual data from your database)
  const schools = [
    { id: 'SCHOOL-001', name: 'School A' },
    { id: '2', name: 'School B' },
    { id: '3', name: 'School C' },
  ];

  const handleRoleSelection = (selectedRole: 'student' | 'teacher' | 'admin') => {
    setRole(selectedRole);
  };

  const handleSchoolSelection = (selectedSchoolId: string) => {
    setSchoolId(selectedSchoolId);
  };

  const handleContinue = () => {
    if (role && schoolId) {
      navigate('/auth', { state: { role, schoolId } });
    } else {
      alert('Please select a role and school.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Select Your Role</h2>
        <div className="space-y-4">
          <button
            onClick={() => handleRoleSelection('student')}
            className={`w-full py-2 px-4 rounded-md ${
              role === 'student' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Student
          </button>
          <button
            onClick={() => handleRoleSelection('teacher')}
            className={`w-full py-2 px-4 rounded-md ${
              role === 'teacher' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Teacher
          </button>
          <button
            onClick={() => handleRoleSelection('admin')}
            className={`w-full py-2 px-4 rounded-md ${
              role === 'admin' ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Administrator
          </button>
        </div>

        {role && (
          <>
            <h2 className="text-2xl font-bold mt-6 mb-4 text-center">Select Your School</h2>
            <div className="space-y-2">
              {schools.map((school) => (
                <button
                  key={school.id}
                  onClick={() => handleSchoolSelection(school.id)}
                  className={`w-full py-2 px-4 rounded-md ${
                    schoolId === school.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {school.name}
                </button>
              ))}
            </div>
          </>
        )}

        {role && schoolId && (
          <button
            onClick={handleContinue}
            className="w-full mt-6 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
          >
            Continue to Login
          </button>
        )}
      </div>
    </div>
  );
};

export default RoleSelection;