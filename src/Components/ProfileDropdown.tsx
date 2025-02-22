import React, { useState } from 'react';
import { supabase } from '../supabase'; // Adjust the import path

interface ProfileDropdownProps {
  onClose: () => void; // Function to close the dropdown
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('John Doe'); // Example metadata field
  const [email, setEmail] = useState('john.doe@example.com'); // Example metadata field

  const handleLogout = async () => {
    try {
      // Sign out using Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Error logging out:', error);
      } else {
        console.log('Logged out successfully');

        // Clear localStorage
        localStorage.removeItem('user');

        // Clear session (if needed)
        window.location.href = '/role-selection'; // Redirect to the role selection page
      }
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      onClose(); // Close the dropdown after logout
    }
  };

  const handleSave = async () => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { name, email }, // Update metadata fields
      });
  
      if (error) {
        console.error('Error updating profile:', error);
      } else {
        console.log('Profile updated successfully:', data);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error:', err);
    }
    console.log('Saving changes:', { name, email });
    setIsEditing(false);
  };

  return (
    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Name"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Email"
            />
            <button
              onClick={handleSave}
              className="w-full bg-blue-500 text-white py-1 px-2 rounded-md hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">{name}</p>
            <p className="text-sm text-gray-500">{email}</p>
            <button
              onClick={() => setIsEditing(true)}
              className="w-full bg-gray-100 text-gray-700 py-1 px-2 rounded-md hover:bg-gray-200"
            >
              Edit Profile
            </button>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full mt-2 bg-red-500 text-white py-1 px-2 rounded-md hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default ProfileDropdown;