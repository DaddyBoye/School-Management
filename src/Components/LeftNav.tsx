import { Link, useLocation } from 'react-router-dom';
import { Home, GraduationCap, Users, BookOpen, DollarSign, Clock, Award, UserCheck } from 'lucide-react';
import NavImage from '../images/school 1.png';
import { useAuth } from '../context/AuthContext';

interface LeftNavProps {
  userRole: string | undefined;
  accessibleRoutes: Record<string, string[]>;
}

const LeftNav = ({ userRole, accessibleRoutes }: LeftNavProps) => {
  const location = useLocation();
  const { school, loading } = useAuth();

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
    { path: '/staff', label: 'Staff', icon: Users },
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

  // Extract school data from useAuth
  const schoolName = school?.name || null;
  const logoUrl = school?.logo_url || null;

  // Truncate school name if too long for better display
  const displaySchoolName = schoolName && schoolName.length > 25 
    ? `${schoolName.substring(0, 22)}...` 
    : schoolName;

  // Show loading state if data is still being fetched
  if (loading) {
    return (
      <div className={`h-full w-full ${roleStyles.admin.background} text-white z-50 flex flex-col shadow-xl overflow-hidden`}>
        <div className="px-4 pt-4 pb-6 flex-shrink-0 border-b border-white border-opacity-10">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl animate-pulse flex-shrink-0"></div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="h-4 bg-white bg-opacity-20 rounded animate-pulse mb-2"></div>
              <div className="h-3 bg-white bg-opacity-20 rounded animate-pulse w-20"></div>
            </div>
          </div>
        </div>
        <div className="px-2 py-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-white bg-opacity-10 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full ${currentStyle.background} text-white z-50 flex flex-col shadow-xl overflow-visible`}>
      {/* Enhanced Header Section with Better Layout */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0 border-b border-white border-opacity-10">
        <div className="flex items-start gap-3 mb-4">
          {/* Logo Container with Dynamic Image Support */}
          <div className={`w-12 h-12 bg-white rounded-xl flex items-center justify-center ${currentStyle.logoRing} shadow-lg flex-shrink-0 overflow-hidden`}>
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="School Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to default icon if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`${logoUrl ? 'hidden' : ''} ${currentStyle.activeItemText}`}>
              <GraduationCap size={24} />
            </div>
          </div>
          
          {/* School Name and Role Container */}
          <div className="flex flex-col min-w-0 flex-1">
            {/* School Name with Tooltip for Long Names */}
            <div className="group relative">
              <span 
                className="font-bold text-base leading-tight block truncate cursor-default"
              >
                {displaySchoolName}
              </span>
                {/* Enhanced Tooltip */}
                {schoolName && schoolName.length > 25 && (
                <div
                  className="absolute left-0 top-full mt-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap border border-gray-600 transform translate-y-1"
                  style={{ transition: 'opacity 0.3s ease 0.2s' }}
                >
                  {schoolName}
                  <div className="absolute bottom-full left-3 w-2 h-2 bg-gray-800 border-l border-t border-gray-600 transform rotate-45 translate-y-1/2"></div>
                </div>
                )}
            </div>
            
            {/* Role Badge */}
            <span className={`text-xs px-2 py-1 rounded-full ${currentStyle.roleBadge} font-medium inline-block w-fit mt-1`}>
              {currentStyle.roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links with Custom Scrollbar */}
      <nav className="space-y-1 px-2 flex-grow min-h-0 overflow-y-auto py-4 scrollbar scrollbar-track-transparent scrollbar-thumb-white/60 hover:scrollbar-thumb-white/30">
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
      <div className="px-4 pb-4 flex-shrink-0">
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