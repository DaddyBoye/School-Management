import React from 'react';
import DashboardStats from '../Components/DashboardStats';
import StudentDistribution from '../Components/StudentDistribution';
import TeacherList from '../Components/TeacherList';

const Dashboard: React.FC = () => {
  return (
    <div className="w-full">
      <div className="mb-6">
        <DashboardStats />
        <div className='flex gap-4 mt-5'>
          <StudentDistribution/>
          <TeacherList/>
        </div>
      </div>
      {/* Rest of dashboard content */}
    </div>
  );
};

export default Dashboard;