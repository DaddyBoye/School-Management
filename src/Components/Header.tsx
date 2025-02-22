import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const toggleProfileDropdown = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  return (
    <header className="fixed top-0 w-full bg-white border-b z-30 shadow-sm md:pr-52 pl-12 md:pl-0">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        {/* Page Title */}
        <h1 className="text-lg md:text-xl font-semibold text-gray-900">
          {title}
        </h1>

        {/* Right - Notification & Profile */}
        <div className="flex items-center gap-3">
          {/* Notification Icon */}
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Bell className="h-5 w-5 text-gray-500" />
          </button>

          {/* Profile Section */}
          <div className="relative">
            <button
              onClick={toggleProfileDropdown}
              className="flex items-center gap-2 hover:bg-gray-100 rounded-full p-1"
            >
              <img
                src="/api/placeholder/32/32"
                alt="User profile"
                className="w-8 h-8 rounded-full"
              />
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <ProfileDropdown onClose={() => setIsProfileOpen(false)} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;