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
      color: `from-[${school?.theme_color}] to-[${school?.theme_color}CC]`,
      bgColor: `bg-[${school?.theme_color}]/10`
    },
    {
      id: 'teacher',
      title: 'Teacher',
      description: 'Manage classes & curriculum',
      icon: Users,
      color: `from-[${school?.secondary_color}] to-[${school?.secondary_color}CC]`,
      bgColor: `bg-[${school?.secondary_color}]/10`
    },
    {
      id: 'admin',
      title: 'Administrator',
      description: 'Full system access',
      icon: Shield,
      color: `from-gray-600 to-gray-700`,
      bgColor: `bg-gray-100`
    }
  ];

  const handleContinue = () => {
    if (selectedRole && school?.id) {
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
        <div 
          className="px-6 py-8 text-center relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${school?.theme_color || '#3b82f6'} 0%, ${school?.secondary_color || '#6366f1'} 100%)`
          }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full transform -translate-x-1/2 translate-y-1/2" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              {school?.logo_url ? (
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg">
                  <img 
                    src={school.logo_url} 
                    alt={`${school.name} Logo`}
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
              ) : (
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: `${school?.secondary_color || '#6366f1'}20` }}
                >
                  <School className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Welcome to</h1>
            <p className="text-white font-semibold mb-2">{school?.name || 'Our Learning Community'}</p>
            {school?.slogan && (
              <p className="text-white/90 text-sm italic mb-1">"{school.slogan}"</p>
            )}
            {school?.established && (
              <p className="text-white/80 text-xs">Est. {school.established}</p>
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
                      ? 'ring-2 ring-offset-2 shadow-lg scale-105' 
                      : 'bg-gray-50 hover:bg-gray-100 hover:scale-102 shadow-sm hover:shadow-md'
                  }`}
                  style={isSelected ? {
                    backgroundColor: `${school?.theme_color || '#3b82f6'}15`,
                    borderColor: school?.theme_color || '#3b82f6',
                    // Remove ringColor as it's not a valid CSS property
                  } : {}}
                >
                  <div 
                    className={`w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center transition-all duration-300 ${
                      isSelected ? 'shadow-lg scale-110' : 'shadow-sm group-hover:scale-105'
                    }`}
                    style={{
                      background: role.id === 'student' 
                        ? `linear-gradient(135deg, ${school?.theme_color || '#3b82f6'}, ${school?.theme_color || '#3b82f6'}CC)`
                        : role.id === 'teacher'
                        ? `linear-gradient(135deg, ${school?.secondary_color || '#6366f1'}, ${school?.secondary_color || '#6366f1'}CC)`
                        : 'linear-gradient(135deg, #6B7280, #4B5563)'
                    }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className={`font-semibold text-sm mb-1 transition-colors duration-300 ${
                    isSelected ? 'text-gray-900' : 'text-gray-900'
                  }`}
                  style={isSelected ? { color: school?.theme_color || '#3b82f6' } : undefined}
                  >
                    {role.title}
                  </h3>
                  <p className={`text-xs leading-tight transition-colors duration-300 ${
                    isSelected ? 'text-gray-700' : 'text-gray-600'
                  }`}
                  style={isSelected ? { color: `${school?.theme_color || '#3b82f6'}AA` } : undefined}
                  >
                    {role.description}
                  </p>
                  
                  {isSelected && (
                    <div 
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg animate-pulse"
                      style={{
                        background: `linear-gradient(135deg, ${school?.theme_color || '#3b82f6'}, ${school?.secondary_color || '#6366f1'})`
                      }}
                    >
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  
                  {isSelected && (
                    <div 
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        background: `linear-gradient(135deg, ${school?.theme_color || '#3b82f6'}10, ${school?.secondary_color || '#6366f1'}10)`
                      }}
                    />
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
                      ? 'ring-2 shadow-lg' 
                      : 'bg-gray-50 hover:bg-gray-100 shadow-sm hover:shadow-md'
                  }`}
                  style={isSelected ? {
                    backgroundColor: `${school?.theme_color || '#3b82f6'}15`,
                    borderColor: school?.theme_color || '#3b82f6',
                    // Remove ringColor as it's not a valid CSS property
                  } : {}}
                >
                    <div className="flex items-center space-x-4">
                      <div 
                        className={`p-3 rounded-xl transition-all duration-300 ${
                          isSelected ? 'shadow-lg scale-110' : 'shadow-sm group-hover:scale-105'
                        }`}
                        style={{
                          background: role.id === 'student' 
                            ? `linear-gradient(135deg, ${school?.theme_color || '#3b82f6'}, ${school?.theme_color || '#3b82f6'}CC)`
                            : role.id === 'teacher'
                            ? `linear-gradient(135deg, ${school?.secondary_color || '#6366f1'}, ${school?.secondary_color || '#6366f1'}CC)`
                            : 'linear-gradient(135deg, #6B7280, #4B5563)'
                        }}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className={`font-semibold transition-colors duration-300`}
                        style={isSelected ? { color: school?.theme_color || '#3b82f6' } : undefined}
                        >
                          {role.title}
                        </h3>
                        <p className={`text-sm transition-colors duration-300`}
                        style={isSelected ? { color: `${school?.theme_color || '#3b82f6'}AA` } : undefined}
                        >
                          {role.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      {isSelected ? (
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${school?.theme_color || '#3b82f6'}, ${school?.secondary_color || '#6366f1'})`
                          }}
                        >
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <ArrowRight 
                          className="w-5 h-5 transition-colors" 
                          color="#9CA3AF"
                        />
                      )}
                    </div>
                    
                    {isSelected && (
                      <div 
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{
                          background: `linear-gradient(135deg, ${school?.theme_color || '#3b82f6'}10, ${school?.secondary_color || '#6366f1'}10)`
                        }}
                      />
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
                ? 'text-white shadow-lg hover:shadow-xl hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            style={selectedRole && !isSubmitting ? {
              background: `linear-gradient(135deg, ${school?.theme_color || '#3b82f6'}, ${school?.secondary_color || '#6366f1'})`
            } : undefined}
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
            {/*
            <p className="mt-4 text-center text-xs text-gray-500">
            Not from {school?.name}?{' '}
            <a 
              href="https://klaso.site" 
              className="hover:underline font-medium transition-colors"
              style={{ color: school?.theme_color || '#3b82f6' }}
            >
              Visit our main site
            </a>
            </p>
            */}
        </div>
      </div>
    </div>
  );
};

export default SchoolRoleSelection;