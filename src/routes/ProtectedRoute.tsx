import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }: { children: JSX.Element; roles: string[] }) => {
  const { user, userRole, school, loading, error } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
    </div>;
  }

  if (error) {
    // Stay on current page and show error
    return children;
  }

  if (!user) {
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  if (!userRole || !roles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  if (location.pathname !== '/' && !school.id) {
    return <Navigate to="/welcome" replace />;
  }

  return children;
};

export default ProtectedRoute;