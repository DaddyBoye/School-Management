import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }: { children: JSX.Element; roles: string[] }) => {
  const { user, userRole, school, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
    </div>;
  }

  if (!user) {
    // Redirect to welcome with intended destination
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  if (!userRole || !roles.includes(userRole)) {
    // Redirect to default route for their actual role
    return <Navigate to="/" replace />;
  }

  // Verify school context exists for school-specific routes
  if (location.pathname !== '/' && !school.id) {
    return <Navigate to="/welcome" replace />;
  }

  return children;
};

export default ProtectedRoute;