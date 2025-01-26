import React from 'react';
import { Search, Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="w-full bg-white border-b">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left - Page Title & Search */}
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search"
              className="pl-10 pr-4 py-2 w-[300px] bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right - Profile and Notifications */}
        <div className="flex items-center gap-4">
          {/* Notification Icon */}
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Bell className="h-5 w-5 text-gray-500" />
          </button>

          {/* Profile Section */}
          <div className="flex items-center gap-3">
            <img
              src="/api/placeholder/32/32"
              alt="User profile"
              className="w-8 h-8 rounded-full"
            />
            <div className="text-sm">
              <p className="font-medium text-gray-900">Gabriel Style</p>
              <p className="text-gray-500">Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;