import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Shield, ArrowRight, School } from 'lucide-react';
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
      description: 'Access courses & grades',
      icon: GraduationCap,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'teacher',
      title: 'Teacher',
      description: 'Manage classes & curriculum',
      icon: Users,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'admin',
      title: 'Administrator',
      description: 'Full system access',
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  const handleContinue = () => {
    if (selectedRole && school.id) {
      navigate('/auth', { state: { role: selectedRole, schoolId: school.id } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full transform -translate-x-1/2 translate-y-1/2" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-3">
              {school.logo_url ? (
                <img 
                  src={school.logo_url} 
                  alt={`${school.name} Logo`}
                  className="w-12 h-12 object-contain"
                />
              ) : (
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <School className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Welcome to</h1>
            <p className="text-blue-100 font-semibold mb-2">{school.name || 'Our Learning Community'}</p>
            {school.slogan && (
              <p className="text-blue-200 text-sm italic mb-1">"{school.slogan}"</p>
            )}
            {school.established && (
              <p className="text-blue-300 text-xs">Est. {school.established}</p>
            )}
          </div>
        </div>

        {/* Role Selection */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            Select your role
          </h2>
          
          {/* Desktop Layout - 3 Column Grid */}
          <div className="hidden md:grid grid-cols-3 gap-3 mb-6">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id as any)}
                  className={`relative p-4 rounded-xl transition-all duration-300 text-center group transform ${
                    isSelected 
                      ? `${role.bgColor} ring-2 ring-offset-2 ring-blue-500 scale-105 shadow-lg` 
                      : 'bg-gray-50 hover:bg-gray-100 hover:scale-102 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto mb-2 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center transition-all duration-300 ${
                    isSelected ? 'shadow-lg scale-110' : 'shadow-sm group-hover:scale-105'
                  }`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className={`font-semibold text-sm mb-1 transition-colors duration-300 ${
                    isSelected ? 'text-blue-700' : 'text-gray-900'
                  }`}>
                    {role.title}
                  </h3>
                  <p className={`text-xs leading-tight transition-colors duration-300 ${
                    isSelected ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {role.description}
                  </p>
                  
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  
                  {isSelected && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Layout - Vertical Stack */}
          <div className="md:hidden space-y-3 mb-6">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id as any)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 group ${
                    isSelected 
                      ? `${role.bgColor} ring-2 ring-blue-500 shadow-lg` 
                      : 'bg-gray-50 hover:bg-gray-100 shadow-sm hover:shadow-md'
                  }`}
                >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${role.color} transition-all duration-300 ${
                        isSelected ? 'shadow-lg scale-110' : 'shadow-sm group-hover:scale-105'
                      }`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className={`font-semibold transition-colors duration-300 ${
                          isSelected ? 'text-blue-700' : 'text-gray-900'
                        }`}>
                          {role.title}
                        </h3>
                        <p className={`text-sm transition-colors duration-300 ${
                          isSelected ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          {role.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      {isSelected ? (
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      )}
                    </div>
                    
                    {isSelected && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 pointer-events-none" />
                    )}
                </button>
              );
            })}
          </div>

          {/* Action Button */}
          <button
            onClick={handleContinue}
            disabled={!selectedRole || isSubmitting}
            className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
              selectedRole && !isSubmitting
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Continuing...</span>
              </>
            ) : (
              <>
                <span>Continue to Login</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Footer Link */}
          <p className="mt-4 text-center text-xs text-gray-500">
            Not from {school.name}?{' '}
            <a 
              href="https://klaso.site" 
              className="text-blue-600 hover:underline font-medium"
            >
              Visit our main site
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SchoolRoleSelection;