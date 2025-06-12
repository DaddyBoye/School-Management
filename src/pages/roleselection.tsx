import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Shield, School, CheckCircle, ArrowLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';

interface School {
  id: string;
  name: string;
  address: string;
}

const RoleSelection: React.FC = () => {
  const [role, setRole] = useState<'student' | 'teacher' | 'admin' | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'role' | 'school'>('role');
  const [isAnimating, setIsAnimating] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoadingSchools(true);
        const { data, error } = await supabase
          .from('schools')
          .select('id, name, address')
          .order('name', { ascending: true });

        if (error) throw error;
        setSchools(data || []);
      } catch (error) {
        console.error('Error fetching schools:', error);
        setSchoolsError('Failed to load schools. Please try again later.');
      } finally {
        setLoadingSchools(false);
      }
    };

    fetchSchools();
  }, []);

  const roles = [
    {
      id: 'student',
      title: 'Student',
      description: 'Access courses, assignments, and grades',
      icon: GraduationCap,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'from-blue-600 to-blue-700'
    },
    {
      id: 'teacher',
      title: 'Teacher',
      description: 'Manage classes, students, and curriculum',
      icon: Users,
      color: 'from-green-500 to-green-600',
      hoverColor: 'from-green-600 to-green-700'
    },
    {
      id: 'admin',
      title: 'Administrator',
      description: 'Full system access and management',
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'from-purple-600 to-purple-700'
    }
  ];

  const handleRoleSelection = (selectedRole: 'student' | 'teacher' | 'admin') => {
    setRole(selectedRole);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep('school');
      setIsAnimating(false);
    }, 300);
  };

  const handleSchoolSelection = (selectedSchoolId: string) => {
    setSchoolId(selectedSchoolId);
  };

  const handleBack = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep('role');
      setSchoolId(null);
      setIsAnimating(false);
    }, 300);
  };

  const handleContinue = () => {
    if (role && schoolId) {
      navigate('/auth', { state: { role, schoolId } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors duration-300 ${
              currentStep === 'role' ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
            }`}>
              1
            </div>
            <div className={`h-0.5 w-8 transition-colors duration-300 ${
              currentStep === 'school' ? 'bg-blue-600' : 'bg-gray-300'
            }`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors duration-300 ${
              currentStep === 'school' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'
            }`}>
              2
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              {currentStep === 'school' && (
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-white/20 bg-white rounded-lg transition-colors duration-200"
                >
                  <ArrowLeft className="text-black w-5 h-5" />
                </button>
              )}
              <div className="flex-1 text-center">
                <h1 className="text-2xl font-bold">
                  {currentStep === 'role' ? 'Select Your Role' : 'Choose Your School'}
                </h1>
                <p className="text-blue-100 mt-1">
                  {currentStep === 'role' 
                    ? 'How will you be using the system?' 
                    : 'Which school are you associated with?'
                  }
                </p>
              </div>
              <div className="w-10"></div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 transform translate-x-4' : 'opacity-100 transform translate-x-0'}`}>
              {currentStep === 'role' ? (
                <div className="space-y-4">
                  {roles.map((roleOption) => {
                    const IconComponent = roleOption.icon;
                    const isSelected = role === roleOption.id;
                    
                    return (
                      <button
                        key={roleOption.id}
                        onClick={() => handleRoleSelection(roleOption.id as any)}
                        className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left group hover:shadow-lg ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-lg bg-gradient-to-br ${isSelected ? roleOption.color : 'bg-gray-100'} transition-all duration-300`}>
                            <IconComponent className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-semibold text-lg ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                              {roleOption.title}
                            </h3>
                            <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                              {roleOption.description}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-6 h-6 text-blue-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {loadingSchools ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                  ) : schoolsError ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                      <p className="text-red-700">{schoolsError}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : schools.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
                      <p className="text-yellow-700">No schools found</p>
                    </div>
                  ) : (
                    schools.map((school) => {
                      const isSelected = schoolId === school.id;
                      
                      return (
                        <button
                          key={school.id}
                          onClick={() => handleSchoolSelection(school.id)}
                          className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left group hover:shadow-lg ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg transition-colors duration-300 ${
                                isSelected ? 'bg-blue-100' : 'bg-gray-100'
                              }`}>
                                <School className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                              </div>
                              <div>
                                <h3 className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                  {school.name}
                                </h3>
                                <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                                  {school.address}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Continue Button */}
            {currentStep === 'school' && role && schoolId && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  <span>Continue to Login</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;