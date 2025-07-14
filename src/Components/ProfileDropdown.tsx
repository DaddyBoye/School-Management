import React, { useRef, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProfileDropdownProps {
  onClose: () => void;
  userName: string;
  userInitials: string;
  userEmail: string;
  userRole: string;
  userImage: string;
  isLoadingUser: boolean;
  avatarBg: string;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ 
  onClose, 
  userName, 
  userInitials,
  userEmail,
  userRole, 
  userImage,
  isLoadingUser,
  avatarBg
}) => {
  const { signOut, signingOut } = useAuth(); // Get signingOut from auth context
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Role-based styling configurations
  const roleStyles = {
    admin: {
      headerBackground: 'bg-gradient-to-r from-blue-50 to-blue-100',
      roleLabel: 'Administrator',
      roleBadge: 'bg-blue-100 text-blue-800',
      logoutButton: 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200',
      accent: 'border-blue-200'
    },
    teacher: {
      headerBackground: 'bg-gradient-to-r from-green-50 to-green-100',
      roleLabel: 'Teacher',
      roleBadge: 'bg-green-100 text-green-800',
      logoutButton: 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200',
      accent: 'border-green-200'
    },
    student: {
      headerBackground: 'bg-gradient-to-r from-purple-50 to-purple-100',
      roleLabel: 'Student',
      roleBadge: 'bg-purple-100 text-purple-800',
      logoutButton: 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200',
      accent: 'border-purple-200'
    }
  };

  const currentStyle = roleStyles[userRole as keyof typeof roleStyles] || roleStyles.admin;

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleLogout = async () => {
    try {
      await signOut();
      // Don't call onClose here - the auth state change will handle the UI
    } catch (err) {
      console.error('Logout error:', err);
      onClose(); // Only close dropdown if error occurs
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className={`absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200 ${currentStyle.accent}`}
    >
      {/* Header */}
      <div className={`${currentStyle.headerBackground} px-6 py-4 border-b border-gray-100`}>
        <div className="flex items-center gap-3">
          {userImage ? (
            <img 
              src={userImage} 
              alt="Profile" 
              className="w-12 h-12 rounded-full object-cover shadow-lg ring-2 ring-white"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className={`w-12 h-12 rounded-full ${avatarBg} flex items-center justify-center text-white font-semibold text-lg shadow-lg ring-2 ring-white`}>
              {userInitials}
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">My Profile</h3>
            <span className={`inline-block text-xs px-2 py-1 rounded-full ${currentStyle.roleBadge} font-medium mt-1`}>
              {currentStyle.roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Name
            </label>
            {isLoadingUser ? (
              <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4 mb-3" />
            ) : (
              <p className="text-sm font-medium text-gray-900 mb-3">
                {userName || 'Not available'}
              </p>
            )}
            
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Email
            </label>
            <p className="text-sm text-gray-600 mb-4">{userEmail}</p>
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-4 mt-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            disabled={signingOut} // Use signingOut from context
            className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 text-sm ${currentStyle.logoutButton} disabled:opacity-50`}
          >
            {signingOut ? (
              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileDropdown;