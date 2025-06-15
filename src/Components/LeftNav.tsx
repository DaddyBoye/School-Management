import { Link, useLocation } from 'react-router-dom';
import { Home, GraduationCap, Users, BookOpen, DollarSign, Clock, Award, UserCheck } from 'lucide-react';
import NavImage from '../images/school 1.png';

interface LeftNavProps {
  userRole: string | undefined;
  accessibleRoutes: Record<string, string[]>;
  schoolName: string | null;
}

const LeftNav = ({ userRole, accessibleRoutes, schoolName }: LeftNavProps) => {
  const location = useLocation();

  // Role-based styling configurations
  const roleStyles = {
    admin: {
      background: 'bg-gradient-to-b from-blue-600 to-blue-700',
      accent: 'bg-blue-800',
      activeItemBg: 'bg-white',
      activeItemText: 'text-blue-600',
      hoverBg: 'hover:bg-blue-500',
      logoRing: 'ring-2 ring-white ring-opacity-20',
      roleLabel: 'Administrator',
      roleBadge: 'bg-blue-800 text-blue-100'
    },
    teacher: {
      background: 'bg-gradient-to-b from-green-600 to-green-700',
      accent: 'bg-green-800',
      activeItemBg: 'bg-white',
      activeItemText: 'text-green-600',
      hoverBg: 'hover:bg-green-500',
      logoRing: 'ring-2 ring-white ring-opacity-20',
      roleLabel: 'Teacher',
      roleBadge: 'bg-green-800 text-green-100'
    },
    student: {
      background: 'bg-gradient-to-b from-purple-600 to-purple-700',
      accent: 'bg-purple-800',
      activeItemBg: 'bg-white',
      activeItemText: 'text-purple-600',
      hoverBg: 'hover:bg-purple-500',
      logoRing: 'ring-2 ring-white ring-opacity-20',
      roleLabel: 'Student',
      roleBadge: 'bg-purple-800 text-purple-100'
    }
  };

  // Default to admin styling if role is not recognized
  const currentStyle = roleStyles[userRole as keyof typeof roleStyles] || roleStyles.admin;

  // Define navigation links with better icons
  const navigationLinks = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/teachers', label: 'Teachers', icon: Users },
    { path: '/students', label: 'Students', icon: GraduationCap },
    { path: '/studentfees', label: 'Fees', icon: DollarSign },
    { path: '/studentgrades', label: 'Grades', icon: Award },
    { path: '/classsubjectmanager', label: 'Teacher Assignments', icon: UserCheck },
    { path: '/subjectclassmanager', label: 'Subject Class Manager', icon: BookOpen },
    { path: '/feemanager', label: 'Fee Manager', icon: DollarSign },
    { path: '/teacherstudentview', label: 'My Students', icon: Users },
    { path: '/teachergrades', label: 'Student Grades', icon: Award },
    { path: '/teacherrankings', label: 'Student Rankings', icon: Award },
    { path: '/teacherattendance', label: 'Student Attendance', icon: UserCheck },
    { path: '/timetablemanager', label: 'Timetables', icon: Clock },
    { path: '/teachertimetable', label: 'My Timetables', icon: Clock },
    { path: '/studentgradesview', label: 'My Grades', icon: Award },
    { path: '/studentfeeview', label: 'My Fees', icon: DollarSign },
    { path: '/studenttimetable', label: 'My Timetables', icon: Clock },
    { path: '/adminattendance', label: 'Attendance', icon: UserCheck },
  ];

  // Filter navigation links based on the user's role
  const filteredLinks = userRole
    ? navigationLinks.filter(({ path }) => accessibleRoutes[userRole]?.includes(path))
    : [];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className={`h-full w-full ${currentStyle.background} text-white z-50 py-4 flex flex-col shadow-xl overflow-hidden`}>
      {/* Logo and School Name */}
      <div className="px-4 mb-6 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 bg-white rounded-lg flex items-center justify-center ${currentStyle.logoRing} shadow-lg`}>
            <div className={currentStyle.activeItemText}>
              <GraduationCap size={24} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight">{schoolName}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${currentStyle.roleBadge} font-medium`}>
              {currentStyle.roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links with Custom Scrollbar */}
      <nav className="space-y-1 px-2 flex-grow min-h-0 overflow-y-auto scrollbar scrollbar-track-transparent scrollbar-thumb-white/60 hover:scrollbar-thumb-white/30">
        {filteredLinks.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 transform ${
              isActive(path)
                ? `${currentStyle.activeItemBg} ${currentStyle.activeItemText} shadow-lg scale-105 border-l-4 border-opacity-50`
                : `text-white ${currentStyle.hoverBg} hover:text-gray-100 hover:shadow-md hover:scale-102 hover:translate-x-1`
            }`}
          >
            <Icon size={20} className="mr-3 flex-shrink-0" />
            <span className="truncate">{label}</span>
            {isActive(path) && (
              <div className={`ml-auto w-2 h-2 rounded-full ${currentStyle.accent} opacity-75`} />
            )}
          </Link>
        ))}
      </nav>

      {/* Role-specific decorative element */}
      <div className={`mx-4 mb-4 h-1 rounded-full ${currentStyle.accent} opacity-30 flex-shrink-0`} />

      {/* Bottom Image */}
      <div className="px-4 flex-shrink-0">
        <div className="bg-white bg-opacity-10 rounded-xl p-3 backdrop-blur-sm">
          <img 
            src={NavImage} 
            alt="School" 
            className="w-full h-32 object-contain opacity-90"
          />
        </div>
      </div>
    </div>
  );
};

export default LeftNav;