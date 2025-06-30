// Header.tsx
import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { supabase } from '../supabase';
import ProfileDropdown from './ProfileDropdown';

interface HeaderProps {
  title: string;
  userId?: string;
  userRole?: string | null;
  userEmail?: string;
}

const Header: React.FC<HeaderProps> = ({ title, userId, userRole, userEmail }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userImage, setUserImage] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Role-based styling configurations
  const roleStyles = {
    admin: {
      profileButton: 'bg-blue-600 hover:bg-blue-700',
      profileButtonText: 'text-white',
      chevronColor: 'text-white',
      avatarBg: 'bg-blue-500'
    },
    teacher: {
      profileButton: 'bg-green-600 hover:bg-green-700',
      profileButtonText: 'text-white',
      chevronColor: 'text-white',
      avatarBg: 'bg-green-500'
    },
    student: {
      profileButton: 'bg-purple-600 hover:bg-purple-700',
      profileButtonText: 'text-white',
      chevronColor: 'text-white',
      avatarBg: 'bg-purple-500'
    }
  };

  const currentStyle = roleStyles[userRole as keyof typeof roleStyles] || roleStyles.admin;

  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!userId || !userRole) return;
      
      setIsLoadingUser(true);
      try {
        let tableName = '';
        let bucketName = '';
        
        switch (userRole) {
          case 'admin':
            tableName = 'administrators';
            bucketName = 'admin-photos';
            break;
          case 'teacher':
            tableName = 'teachers';
            bucketName = 'staff-photos';
            break;
          case 'student':
            tableName = 'students';
            bucketName = 'student-photos';
            break;
          default:
            return;
        }

        // Fetch user details
        const { data: userData, error: userError } = await supabase
          .from(tableName)
          .select('first_name, last_name, image_url, image_path')
          .eq('user_id', userId)
          .single();

        if (userError) throw userError;

        if (userData) {
          const fullName = `${userData.first_name} ${userData.last_name}`;
          setUserName(fullName);
          
          // Generate initials
          const initials = userData.first_name?.[0]?.toUpperCase() + 
                         (userData.last_name?.[0]?.toUpperCase() || '');
          setUserInitials(initials);
          
          // Get public image URL if available
          if (userData.image_path) {
            const { data: { publicUrl } } = supabase.storage
              .from(bucketName)
              .getPublicUrl(userData.image_path);
            
            setUserImage(publicUrl);
          } else if (userData.image_url) {
            setUserImage(userData.image_url);
          }
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
        <h1 className="text-lg md:text-xl font-semibold text-gray-900">
          {title}
        </h1>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={toggleProfileDropdown}
              className={`flex items-center gap-2 rounded-xl p-2 transition-colors duration-200 group ${currentStyle.profileButton}`}
            >
              {userImage ? (
                <img 
                  src={userImage} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full ring-2 ring-white shadow-sm object-cover"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className={`w-8 h-8 rounded-full ring-2 ring-white shadow-sm flex items-center justify-center ${currentStyle.avatarBg} text-white font-medium`}>
                  {userInitials}
                </div>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${currentStyle.chevronColor} ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProfileOpen && (
              <ProfileDropdown 
                onClose={() => setIsProfileOpen(false)}
                userName={userName}
                userInitials={userInitials}
                userRole={userRole || ''}
                userEmail={userEmail || ''}
                userImage={userImage}
                isLoadingUser={isLoadingUser}
                avatarBg={currentStyle.avatarBg}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;