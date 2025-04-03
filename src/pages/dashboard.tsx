import React from 'react';
import DashboardStats from '../Components/DashboardStats';
import StudentDistribution from '../Components/StudentDistribution';
import TeacherList from '../Components/TeacherList';
import AttendanceChart from '../Components/Attendance';
import EarningsChart from '../Components/Earnings';

const Dashboard: React.FC = () => {
  return (
    <div className="w-full min-h-screen">
      <div className="space-y-6">
        <DashboardStats />
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-1/3">
            <StudentDistribution/>
          </div>
          <div className="w-full lg:w-2/3">
            <TeacherList/>
          </div>
        </div>
        <div className="flex flex-col xl:flex-row gap-5">
          <div className="w-full xl:w-1/2">
            <AttendanceChart/>
          </div>
          <div className="w-full xl:w-1/2">
            <EarningsChart/>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;