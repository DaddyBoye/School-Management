import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import LeftNav from './Components/LeftNav';
import { Menu } from 'lucide-react';
import Header from './Components/Header';
import Dashboard from './pages/dashboard';
import Teachers from './pages/teachers';
import ExamResult from './pages/exam-result';
import Messages from './pages/messages';
import Payroll from './pages/payroll';
import Settings from './pages/settings';
import Timetable from './pages/timetable';
import RoleSelection from './pages/roleselection';
import AuthPage from './pages/authpage'; // New AuthPage component
import Attendance from './pages/attendance'; // Import the Attendance component
import { supabase } from "./supabase";

const useAuth = () => {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true); // Add a loading state

  React.useEffect(() => {
    const fetchSession = async () => {
      console.log('Fetching session...'); // Debugging: Log when fetching session starts
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error fetching session:', error); // Debugging: Log any errors
      }
  
      console.log('Session:', session); // Debugging: Log the session object
  
      if (session) {
        console.log('Session found. User:', session.user); // Debugging: Log the user from session
        setUser(session.user);
      } else {
        console.log('No session found. Checking localStorage...'); // Debugging: Log when no session is found
        const storedUser = localStorage.getItem('user');
        console.log('Stored User from localStorage:', storedUser); // Debugging: Log the stored user
  
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            console.log('Parsed User from localStorage:', parsedUser); // Debugging: Log the parsed user
            setUser(parsedUser);
          } catch (err) {
            console.error('Error parsing stored user:', err); // Debugging: Log parsing errors
          }
        } else {
          console.log('No user found in localStorage.'); // Debugging: Log when no user is found in localStorage
        }
      }
  
      setLoading(false); // Mark loading as complete
      console.log('Loading complete. User state:', user); // Debugging: Log the final user state
    };
  
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth State Change:', event, session); // Debugging: Log auth state changes
      if (event === 'SIGNED_IN' && session) {
        console.log('User Signed In:', session.user); // Debugging: Log the signed-in user
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        console.log('User Signed Out'); // Debugging: Log when the user signs out
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  console.log('Current User:', user); // Debugging: Log the current user
  return { user, loading }; // Return both user and loading state
};

const ProtectedRoute = ({ children, roles }: { children: JSX.Element, roles: string[] }) => {
  const { user, loading } = useAuth(); // Destructure user and loading state
  const location = useLocation();

  console.log('ProtectedRoute - User:', user); // Debugging: Log the user
  console.log('ProtectedRoute - Loading:', loading); // Debugging: Log the loading state

  if (loading) {
    console.log('Authentication state loading. Waiting...'); // Debugging: Log loading state
    return <div>Loading...</div>; // Show a loading spinner or placeholder
  }

  if (!user) {
    console.log('User not authenticated. Redirecting to /role-selection.'); // Debugging: Log redirection
    return <Navigate to="/role-selection" state={{ from: location }} replace />;
  }

  const userRole = user.user_metadata?.role;
  console.log('ProtectedRoute - User Role:', userRole); // Debugging: Log the user's role

  if (!roles.includes(userRole)) {
    console.log('User role not allowed. Redirecting to /.'); // Debugging: Log redirection
    return <Navigate to="/" replace />;
  }

  console.log('User authenticated and role allowed. Rendering children.'); // Debugging: Log successful access
  return children;
};

const AppContent = () => {
  const [isNavOpen, setIsNavOpen] = React.useState(false);
  const location = useLocation();
  const { user } = useAuth(); // Get the authenticated user
  const userRole = user?.user_metadata?.role; // Extract the user's role

  // Define accessible routes for each role
  const accessibleRoutes = {
    admin: ['/', '/teachers', '/messages', '/timetable', '/attendance', '/exam-result', '/settings', '/payroll'],
    teacher: ['/', '/messages', '/timetable', '/attendance', '/exam-result'],
    student: ['/', '/messages', '/timetable', '/exam-result', '/attendance'],
    parent: ['/', '/messages', '/exam-result'],
  };

  const getPageTitle = () => {
    const path = location.pathname;
    const titles: { [key: string]: string } = {
      '/': 'Dashboard',
      '/teachers': 'Teachers',
      '/exam-result': 'Exam Result',
      '/messages': 'Messages',
      '/payroll': 'Payroll',
      '/settings': 'Settings',
      '/timetable': 'Timetable',
      '/attendance': 'Attendance',
    };
    return titles[path] || 'Dashboard';
  };

  const hideNavAndHeader = location.pathname === '/role-selection' || location.pathname === '/auth';

  return (
    <div className="flex flex-col md:flex-row h-full w-full font-sans bg-[#ffffff]">
      {!hideNavAndHeader && (
        <>
          <button
            className={`md:hidden fixed top-2 left-4 p-2 bg-blue-500 z-40
              ${isNavOpen ? 'hidden' : 'block'} text-white rounded-lg`}
            onClick={() => setIsNavOpen(!isNavOpen)}
          >
            <Menu size={24} />
          </button>
          <div
            className={`
              fixed top-0 left-0 h-screen w-64 md:w-56 bg-blue-500 z-40 transition-transform duration-200 ease-in-out
              ${isNavOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
          >
            {/* Pass userRole and accessibleRoutes to LeftNav */}
            <LeftNav userRole={userRole} accessibleRoutes={accessibleRoutes} />
          </div>
        </>
      )}
      <div className={`flex-1 w-full h-full ${!hideNavAndHeader ? 'md:ml-56 pt-20' : ''}`}>
        {!hideNavAndHeader && <Header title={getPageTitle()} />}
        <main className="md:p-6 p-4">
          <Routes>
            <Route path="/role-selection" element={<RoleSelection />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Teachers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-result"
              element={
                <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                  <ExamResult />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Payroll />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/timetable"
              element={
                <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                  <Timetable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute roles={['admin', 'student']}>
                  <Attendance />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
      {isNavOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsNavOpen(false)}
        />
      )}
    </div>
  );
};

// Main App component
const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;