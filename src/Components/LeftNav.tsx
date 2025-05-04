import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Calendar, GraduationCap } from 'lucide-react';
import NavImage from '../images/school 1.png';

interface LeftNavProps {
  userRole: string | undefined;
  accessibleRoutes: Record<string, string[]>;
}

const LeftNav = ({ userRole, accessibleRoutes }: LeftNavProps) => {
  const location = useLocation();

  // Define all navigation links
  const navigationLinks = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/teachers', label: 'Teachers', icon: Calendar },
    { path: '/students', label: 'Students', icon: MessageSquare },
    { path: '/studentfees', label: 'Fees', icon: Calendar },
    { path: '/studentgrades', label: 'Grades', icon: Calendar },
    { path: '/classsubjectmanager', label: 'Teacher Assignments', icon: Calendar },
    { path: '/subjectclassmanager', label: 'Subject Class Manager', icon: Calendar },
    { path: '/feemanager', label: 'Fee Manager', icon: Calendar },
    { path: '/teacherstudentview', label: 'My Students', icon: Calendar },
    { path: '/teachergrades', label: 'Student Grades', icon: Calendar },
    { path: '/teacherrankings', label: 'Student Rankings', icon: Calendar },
    { path: '/teacherattendance', label: 'Student Attendance', icon: Calendar },
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