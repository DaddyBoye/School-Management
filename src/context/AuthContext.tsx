import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

interface SchoolInfo {
  id: string | null;
  name: string | null;
  logo_url?: string | null;
  slogan?: string | null;
  established?: string | null;
  theme_color?: string | null;
  secondary_color?: string | null;
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
  school: { id: null, name: null, logo_url: null, slogan: null, established: null, theme_color: null, secondary_color: null },
  loading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
  setUserRole: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [school, setSchool] = useState<SchoolInfo>({ id: null, name: null, logo_url: null, slogan: null, established: null, theme_color: null, secondary_color: null });
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
        .select('id, name, logo_url, slogan, established, theme_color, secondary_color')
        .eq('id', schoolId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching school:', err);
      return null;
    }
  };

  // In your initialization useEffect:
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const schoolId = getSchoolIdFromHost();
        
        if (schoolId) {
          const schoolInfo = await fetchSchoolInfo(schoolId);
          setSchool({
            id: schoolId,
            name: schoolInfo?.name || null,
            logo_url: schoolInfo?.logo_url || null,
            slogan: schoolInfo?.slogan || null,
            established: schoolInfo?.established || null
          });
          localStorage.setItem('school_id', schoolId);
          if (schoolInfo?.name) {
            localStorage.setItem('school_name', schoolInfo.name);
          }
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
          setUser(session.user);
          const role = session.user.user_metadata?.role || 
                      localStorage.getItem('userRole');
          if (role) setUserRole(role);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        const role = session.user.user_metadata?.role || 
                    localStorage.getItem('userRole');
        if (role) setUserRole(role);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserRole(null);
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleStorageSync = () => {
      if (!localStorage.getItem('user')) {
        setUser(null);
        setUserRole(null);
      }
    };
    
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
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
      // 1. Immediate UI update
      setUser(null);
      setUserRole(null);
      
      // 2. Targeted removal of auth-related items only
      const authKeys = [
        'user',
        'userRole',
        'school_id',
        'school_name',
        'admin_id',
        'teacher_id',
        'student_id'
      ];
      
      authKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // 3. Server-side sign out
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // 4. Add cross-tab sync
      window.dispatchEvent(new Event('storage'));
      
      // 5. Redirect without full reload (SPA-friendly)
      window.location.href = '/welcome';
      
    } catch (err) {
      console.error('Sign out failed:', err);
      // Fallback with full reload if SPA redirect fails
      window.location.href = '/welcome';
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