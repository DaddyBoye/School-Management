import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

interface SchoolInfo {
  id: string | null;
  name: string | null;
  logo_url?: string | null;
}

interface AuthContextType {
  user: any;
  userRole: string | null;
  school: SchoolInfo;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUserRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  school: { id: null, name: null },
  loading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
  setUserRole: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [school, setSchool] = useState<SchoolInfo>({ id: null, name: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Extract school ID from subdomain (e.g., stjoba.klaso.site → stjoba)
  const getSchoolIdFromHost = (): string | null => {
    if (typeof window === 'undefined') return null;
    
    const host = window.location.hostname;
    const parts = host.split('.');
    
    // Handle localhost development
    if (parts.includes('localhost')) {
      return 'default-school'; // Replace with your dev school ID
    }
    
    // stjoba.klaso.site → stjoba
    if (parts.length > 2) {
      return parts[0];
    }
    
    return null;
  };

  // Fetch school info by ID
  const fetchSchoolInfo = async (schoolId: string) => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, logo_url')
        .eq('id', schoolId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching school:', err);
      return null;
    }
  };

  // In your AuthProvider's initialization useEffect:
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const schoolId = getSchoolIdFromHost();
        
        // Set school ID from subdomain
        if (schoolId) {
          const schoolInfo = await fetchSchoolInfo(schoolId);
          setSchool({
            id: schoolId,
            name: schoolInfo?.name || null,
            logo_url: schoolInfo?.logo_url || null
          });
          localStorage.setItem('school_id', schoolId);
          if (schoolInfo?.name) {
            localStorage.setItem('school_name', schoolInfo.name);
          }
        }

        // Check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          setUser(session.user);
          const role = session.user.user_metadata?.role || 
                      localStorage.getItem('userRole');
          if (role) setUserRole(role);
        } else {
          // Redirect to welcome if no session
          if (window.location.pathname !== '/welcome') {
            navigate('/welcome');
          }
          
          // Clear any residual auth data
          localStorage.removeItem('user');
          localStorage.removeItem('userRole');
        }
      } catch (err) {
        console.error('Initialization error:', err);
        navigate('/welcome'); // Redirect to welcome on error
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // ... existing sign in logic
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserRole(null);
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        navigate('/welcome'); // Explicit redirect on sign out
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign in handler with school verification
  const signIn = async (email: string, password: string, role: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!school.id) {
        throw new Error('School not identified');
      }

      // 1. Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Authentication failed');

      // 2. Verify user belongs to this school in the specified role
      const roleTable = 
        role === 'student' ? 'students' :
        role === 'teacher' ? 'teachers' :
        'administrators';

      const { data: roleData, error: roleError } = await supabase
        .from(roleTable)
        .select('id')
        .eq('user_id', authData.user.id)
        .eq('school_id', school.id)
        .single();

      if (roleError) throw roleError;
      if (!roleData) throw new Error(`User not found as ${role} in this school`);

      // 3. Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          role,
          school_id: school.id,
          [`${role}_id`]: roleData.id,
        },
      });

      if (updateError) throw updateError;

      // 4. Persist data
      setUserRole(role);
      localStorage.setItem('user', JSON.stringify(authData.user));
      localStorage.setItem('userRole', role);
      localStorage.setItem(`${role}_id`, roleData.id);

      // 5. Redirect to dashboard
      navigate('/');
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err.message : 'Sign in failed');
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  // Sign out handler
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setUserRole(null);
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      navigate('/welcome'); // Ensure redirect happens after sign out
    } catch (err) {
      console.error('Sign out error:', err);
      setError('Failed to sign out');
      navigate('/welcome'); // Redirect even if error occurs
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        school,
        loading,
        error,
        signIn,
        signOut,
        setUserRole: (role) => {
          setUserRole(role);
          localStorage.setItem('userRole', role);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);