import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, GraduationCap, Users, Shield, Mail, Lock, Eye, EyeOff, ChevronRight, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';

const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const { role, schoolId } = location.state || {};

  // Fetch school name when component mounts
  React.useEffect(() => {
    const fetchSchoolName = async () => {
      if (schoolId) {
        try {
          const { data, error } = await supabase
            .from('schools')
            .select('name')
            .eq('id', schoolId)
            .single();

          if (error) throw error;
          if (data) setSchoolName(data.name);
        } catch (error) {
          console.error('Error fetching school name:', error);
        }
      }
    };

    fetchSchoolName();
  }, [schoolId]);

  const getRoleInfo = () => {
    switch (role) {
      case 'student':
        return { title: 'Student', icon: GraduationCap, color: 'from-blue-500 to-blue-600' };
      case 'teacher':
        return { title: 'Teacher', icon: Users, color: 'from-green-500 to-green-600' };
      case 'admin':
        return { title: 'Administrator', icon: Shield, color: 'from-purple-500 to-purple-600' };
      default:
        return { title: 'User', icon: User, color: 'from-gray-500 to-gray-600' };
    }
  };

  const roleInfo = getRoleInfo();
  const IconComponent = roleInfo.icon;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

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

      // 5. Store session data
      localStorage.setItem('user', JSON.stringify(authData.user));
      localStorage.setItem('userRole', role);
      localStorage.setItem('school_id', schoolId);
      localStorage.setItem('school_name', schoolName);
      localStorage.setItem(`${role}_id`, roleRecord.id);

      // 6. Show success state before redirect
      setIsSuccess(true);
      
      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (err) {
      console.error('Login Error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      // Ensure clean state on error
      await supabase.auth.signOut();
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/role-selection');
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
          <p className="text-gray-600 mb-4">Login successful. Redirecting to your dashboard...</p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-6 flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors duration-200 bg-blue-300 hover:bg-blue-100 rounded-xl px-4 py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to role selection</span>
        </button>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${roleInfo.color} px-8 py-6 text-white`}>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <IconComponent className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold">Welcome Back</h1>
              <p className="text-white/90 mt-1">
                Sign in as {roleInfo.title} • {schoolName}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-gray-700 transition-colors duration-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                  isLoading || !email || !password
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : `bg-gradient-to-r ${roleInfo.color} hover:shadow-lg text-white transform hover:scale-[1.02]`
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600">
                Need help? <span className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">Contact Support</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;