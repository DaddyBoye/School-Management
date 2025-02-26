import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface AuthContextType {
  user: any;
  userRole: string | null;
  loading: boolean;
  setUser: (user: any) => void;
  setUserRole: (userRole: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  setUser: () => {},
  setUserRole: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      console.log('Fetching session...');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error fetching session:', error);
      }

      console.log('Session:', session);

      if (session) {
        console.log('Session found. User:', session.user);
        setUser(session.user);
        // Set the role from the session or local storage
        const storedRole = localStorage.getItem('userRole');
        if (storedRole) {
          setUserRole(storedRole);
        } else {
          // Fetch the role from Supabase metadata (only once)
          const metaRole = session.user.user_metadata?.role || session.user.app_metadata?.role;
          setUserRole(metaRole);
          localStorage.setItem('userRole', metaRole);
        }
      } else {
        console.log('No session found. Checking localStorage...');
        const storedUser = localStorage.getItem('user');
        const storedRole = localStorage.getItem('userRole');
        console.log('Stored User from localStorage:', storedUser);
        console.log('Stored Role from localStorage:', storedRole);

        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            console.log('Parsed User from localStorage:', parsedUser);
            setUser(parsedUser);
            if (storedRole) {
              setUserRole(storedRole);
            }
          } catch (err) {
            console.error('Error parsing stored user:', err);
          }
        } else {
          console.log('No user found in localStorage.');
        }
      }

      setLoading(false);
      console.log('Loading complete. User state:', user);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth State Change:', event, session);
      if (event === 'SIGNED_IN' && session) {
        console.log('User Signed In:', session.user);
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        console.log('User Signed Out');
        setUser(null);
        setUserRole(null);
        localStorage.removeItem('userRole');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, loading, setUser, setUserRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
