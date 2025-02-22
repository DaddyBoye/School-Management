import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Calendar, FileText, Bell, CheckSquare, Settings, GraduationCap } from 'lucide-react';
import NavImage from '../images/school 1.png';

interface LeftNavProps {
  userRole: string | undefined;
  accessibleRoutes: Record<string, string[]>; // Key: role, Value: array of accessible routes
}

const LeftNav = ({ userRole, accessibleRoutes }: LeftNavProps) => {
  const location = useLocation();

  // Define all navigation links
  const navigationLinks = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/teachers', label: 'Teachers', icon: Calendar },
    { path: '/messages', label: 'Messages', icon: MessageSquare },
    { path: '/timetable', label: 'Timetable', icon: FileText },
    { path: '/attendance', label: 'Attendance', icon: Bell },
    { path: '/exam-result', label: 'Exam Result', icon: CheckSquare },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/payroll', label: 'Payroll', icon: FileText },
  ];

  // Filter navigation links based on the user's role
  const filteredLinks = userRole
    ? navigationLinks.filter(({ path }) => accessibleRoutes[userRole]?.includes(path))
    : [];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="h-full w-full bg-blue-500 text-white z-50 py-4 flex flex-col">
      {/* Logo and School Name */}
      <div className="px-4 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
            <div className="text-blue-500">
              <GraduationCap size={20} />
            </div>
          </div>
          <span className="font-semibold">Schoolname</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1 pl-2 flex-grow overflow-y-auto">
        {filteredLinks.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center pl-3 py-3 rounded-l-xl text-sm transition-colors ${
              isActive(path)
                ? 'bg-white text-blue-500'
                : 'text-white hover:bg-blue-600 hover:text-white'
            }`}
          >
            <Icon size={18} className="mr-3" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom Image */}
      <div className="mt-auto px-4">
        <img 
          src={NavImage} 
          alt="School" 
          className="w-full h-40 object-contain"
        />
      </div>
    </div>
  );
};

export default LeftNav;