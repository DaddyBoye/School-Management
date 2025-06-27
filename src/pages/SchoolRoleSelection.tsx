import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Shield, ChevronRight, School } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SchoolRoleSelection: React.FC = () => {
  const { school, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | 'admin' | null>(null);
  const [isSubmitting] = useState(false);

  const roles = [
    {
      id: 'student',
      title: 'Student',
      description: 'Access courses, assignments, and grades',
      icon: GraduationCap,
      color: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'teacher',
      title: 'Teacher',
      description: 'Manage classes, students, and curriculum',
      icon: Users,
      color: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      id: 'admin',
      title: 'Administrator',
      description: 'Full system access and management',
      icon: Shield,
      color: 'bg-purple-100',
      iconColor: 'text-purple-600'
    }
  ];

  const handleContinue = () => {
    if (selectedRole && school.id) {
      navigate('/auth', { state: { role: selectedRole, schoolId: school.id } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* School Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-white rounded-full transform translate-x-1/4 translate-y-1/4" />
          </div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              {school.logo_url ? (
                <img 
                  src={school.logo_url} 
                  alt={`${school.name} Logo`}
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <School className="w-10 h-10 text-white" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to</h1>
            <p className="text-xl font-medium text-blue-100">{school.name || 'Our Learning Community'}</p>
          </div>
        </div>

        {/* Role Selection */}
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 text-center">
              Please select your role:
            </h2>
            
            <div className="space-y-4">
              {roles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id as any)}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all duration-300 group ${
                      isSelected 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 ${role.color} rounded-xl ${
                        isSelected ? 'bg-opacity-100' : 'bg-opacity-70'
                      }`}>
                        <Icon className={`w-6 h-6 ${role.iconColor}`} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{role.title}</h3>
                        <p className="text-sm text-gray-600">{role.description}</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${
                      isSelected ? 'text-blue-600' : 'text-gray-400'
                    } group-hover:text-blue-600 transition-colors`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Continue Button */}
          {selectedRole && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={handleContinue}
                disabled={isSubmitting}
                className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl ${
                  isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Continuing...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Login</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-500">
            Not from {school.name}?{' '}
            <a 
              href="https://klaso.site" 
              className="text-blue-600 hover:underline font-medium"
            >
              Go to our main site
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolRoleSelection;