import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }: { children: JSX.Element; roles: string[] }) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - User:', user);
  console.log('ProtectedRoute - Role:', userRole);
  console.log('ProtectedRoute - Loading:', loading);

  if (loading) {
    console.log('Authentication state loading. Waiting...');
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log('User not authenticated. Redirecting to /roleselection.');
    return <Navigate to="/roleselection" state={{ from: location }} replace />;
  }

  if (!userRole || !roles.includes(userRole)) {
    console.log('User role not allowed. Redirecting to /.');
    return <Navigate to="/" replace />;
  }

  console.log('User authenticated and role allowed. Rendering children.');
  return children;
};

export default ProtectedRoute;