import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Shield, ChevronRight } from 'lucide-react';

const SchoolWelcome = () => {
  const { school, loading } = useAuth();
  const navigate = useNavigate();

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
                <div className="text-white text-3xl font-bold">
                  {school.name?.charAt(0)}
                </div>
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
              Join us as...
            </h2>
            
            <div className="space-y-4">
              {/* Student Button */}
              <button
                onClick={() => navigate('/role-selection', { state: { schoolId: school.id } })}
                className="w-full flex items-center justify-between p-5 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-all duration-300 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                    <GraduationCap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Student</h3>
                    <p className="text-sm text-gray-600">Access your courses and grades</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </button>

              {/* Teacher Button */}
              <button
                onClick={() => navigate('/role-selection', { state: { schoolId: school.id } })}
                className="w-full flex items-center justify-between p-5 bg-green-50 hover:bg-green-100 rounded-2xl transition-all duration-300 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Teacher</h3>
                    <p className="text-sm text-gray-600">Manage classes and students</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
              </button>

              {/* Admin Button */}
              <button
                onClick={() => navigate('/role-selection', { state: { schoolId: school.id } })}
                className="w-full flex items-center justify-between p-5 bg-purple-50 hover:bg-purple-100 rounded-2xl transition-all duration-300 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Administrator</h3>
                    <p className="text-sm text-gray-600">Manage school systems</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
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

export default SchoolWelcome;