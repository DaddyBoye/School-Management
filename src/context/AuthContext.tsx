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
  address?: string | null;
  contact?: string | null;
}

interface AuthContextType {
  user: any;
  userRole: string | null;
  school: SchoolInfo;
  currentTerm: { id: number; name: string } | null;
  loading: boolean;
  signingOut: boolean;
  error: string | null;
  signIn: (email: string, password: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUserRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  school: { id: null, name: null, logo_url: null, slogan: null, established: null, theme_color: null, secondary_color: null, address: null, contact: null },
  currentTerm: null,
  loading: true,
  error: null,
  signIn: async () => { },
  signOut: async () => { },
  setUserRole: () => { },
  signingOut: false
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [school, setSchool] = useState<SchoolInfo>({ id: null, name: null, logo_url: null, slogan: null, established: null, theme_color: null, secondary_color: null, address: null, contact: null });
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTerm, setCurrentTerm] = useState<{ id: number; name: string } | null>(null);
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
        .select('id, name, logo_url, slogan, established, theme_color, secondary_color, address, contact')
        .eq('id', schoolId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching school:', err);
      return null;
    }
  };

  const fetchCurrentTerm = async (schoolId: string) => {
    try {
      // 1. First try to get the active calendar for this school
      const { data: activeCalendar, error: calendarError } = await supabase
        .from('school_calendar')
        .select('id')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .single();

      if (calendarError) throw calendarError;

      // If no active calendar found, fallback to most recent calendar
      let calendarId = activeCalendar?.id;
      if (!calendarId) {
        const { data: recentCalendar } = await supabase
          .from('school_calendar')
          .select('id')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (!recentCalendar?.id) {
          console.log('No calendars found for school:', schoolId);
          return null;
        }
        calendarId = recentCalendar.id;
      }

      // 2. Try to get the current term for this calendar
      const { data: currentTerm, error: termError } = await supabase
        .from('calendar_terms')
        .select('id, name')
        .eq('calendar_id', calendarId)
        .eq('is_current', true)
        .single();

      if (termError) throw termError;

      // If no current term found, fallback to most recent term
      if (!currentTerm) {
        const { data: recentTerm } = await supabase
          .from('calendar_terms')
          .select('id, name')
          .eq('calendar_id', calendarId)
          .lte('start_date', new Date().toISOString())
          .order('start_date', { ascending: false })
          .limit(1)
          .single();

        if (!recentTerm) {
          console.log('No terms found for calendar:', calendarId);
          return null;
        }
        return recentTerm;
      }

      return currentTerm;
    } catch (err) {
      console.error('Error fetching current term:', err);
      return null;
    }
  };

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
            address: schoolInfo?.address || null,
            theme_color: schoolInfo?.theme_color || null,
            logo_url: schoolInfo?.logo_url || null,
            slogan: schoolInfo?.slogan || null,
            established: schoolInfo?.established || null,
            secondary_color: schoolInfo?.secondary_color || null,
            contact: schoolInfo?.contact || null
          });
          localStorage.setItem('school_id', schoolId);
          if (schoolInfo?.name) {
            localStorage.setItem('school_name', schoolInfo.name);
          }

          // Fetch current term
          const term = await fetchCurrentTerm(schoolId);
          if (term) {
            setCurrentTerm(term);
            localStorage.setItem('current_term_id', term.id.toString());
            localStorage.setItem('current_term_name', term.name);
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
      setSigningOut(true); // Show loading state
      
      // 1. Server-side sign out first
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // 2. Clear local state
      setUser(null);
      setUserRole(null);
      
      // 3. Clear storage items
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
      
      // 4. Trigger storage sync event
      window.dispatchEvent(new Event('storage'));
      
      // 5. Redirect after all cleanup is done
      navigate('/welcome');
    } catch (err) {
      console.error('Sign out failed:', err);
      // Fallback with full reload if needed
      window.location.href = '/welcome';
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        school,
        currentTerm,
        loading,
        signingOut,
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