import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { supabase } from '../supabase';
import ProfileDropdown from './ProfileDropdown'; // We'll extract this to a separate file

interface HeaderProps {
  title: string;
  userId?: string;
  userRole?: string | null;
  userEmail?: string;
}

const Header: React.FC<HeaderProps> = ({ title, userId, userRole, userEmail }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Fetch user details when userId or userRole changes
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!userId || !userRole) return;
      
      setIsLoadingUser(true);
      try {
        let tableName = '';
        switch (userRole) {
          case 'admin':
            tableName = 'administrators';
            break;
          case 'teacher':
            tableName = 'teachers';
            break;
          case 'student':
            tableName = 'students';
            break;
          default:
            return;
        }

        const { data, error } = await supabase
          .from(tableName)
          .select('first_name, last_name')
          .eq('user_id', userId) // Using user_id column
          .single();

        if (error) throw error;

        if (data) {
          setUserName(`${data.first_name} ${data.last_name}`);
        }
      } catch (err) {
        console.error('Error fetching user details:', err);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserDetails();
  }, [userId, userRole]);

  const toggleProfileDropdown = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  return (
    <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-30 shadow-sm md:pr-52 pl-12 md:pl-0">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        {/* Page Title */}
        <h1 className="text-lg md:text-xl font-semibold text-gray-900">
          {title}
        </h1>

        {/* Right - Notification & Profile */}
        <div className="flex items-center gap-2">
          {/* Profile Section */}
          <div className="relative">
            <button
              onClick={toggleProfileDropdown}
              className="flex bg-blue-600 items-center gap-2 hover:bg-gray-100 rounded-xl p-2 transition-colors duration-200 group"
            >
              <span className="w-8 h-8 rounded-full ring-2 ring-white shadow-sm bg-gray-100 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.5a7.5 7.5 0 1115 0v.75a.75.75 0 01-.75.75h-13.5a.75.75 0 01-.75-.75v-.75z"
                  />
                </svg>
              </span>
              <ChevronDown className={`h-4 w-4 text-white transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <ProfileDropdown 
                onClose={() => setIsProfileOpen(false)}
                userName={userName}
                userRole={userRole || ''}
                userEmail={userEmail || ''}
                isLoadingUser={isLoadingUser}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;