import React from 'react';
import DashboardStats from '../Components/DashboardStats';

const Dashboard: React.FC = () => {
  return (
    <div className="w-full">
      <div className="mb-6">
        <DashboardStats />
      </div>
      {/* Rest of dashboard content */}
    </div>
  );
};

export default Dashboard;