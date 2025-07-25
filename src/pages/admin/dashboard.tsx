import React from 'react';
import StudentDistribution from '../../Components/StudentDistribution';
import TeacherList from '../../Components/TeacherList';
import AttendanceChart from '../../Components/Attendance';
import EarningsChart from '../../Components/Earnings';

const Dashboard: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  return (
    <div className="w-full min-h-screen">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-1/3">
            <StudentDistribution schoolId={schoolId}/>
          </div>
          <div className="w-full lg:w-2/3">
            <TeacherList schoolId={schoolId}/>
          </div>
        </div>
          <div className="w-full ">
            <AttendanceChart schoolId={schoolId}/>
        </div>
          <div className="w-full">
            <EarningsChart schoolId={schoolId} currentSemester='2025 Spring'/>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;