import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  bgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, bgColor }) => (
  <div className={`${bgColor} rounded-lg h-[88px] min-w-[250px] relative overflow-hidden`}>
    <div className="absolute top-2 left-3">
      <p className="text-sm text-white/90">{label}</p>
    </div>
    <div className="absolute bottom-3 left-3">
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
    <div className="absolute right-3 top-1/2 -translate-y-1/2">
      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
        <div className="w-6 h-6 bg-white rounded-full" />
      </div>
    </div>
  </div>
);

const DashboardStats: React.FC = () => {
  return (
    <div className="flex gap-4 flex-wrap">
      <StatCard
        label="Number of Students"
        value="2,500"
        bgColor="bg-[#FF6B8A]"
      />
      <StatCard
        label="Number of Teachers"
        value="246"
        bgColor="bg-[#C5A992]"
      />
      <StatCard
        label="Number of Employees"
        value="600"
        bgColor="bg-[#55D5AE]"
      />
      <StatCard
        label="Total Revenue"
        value="$5,000,000"
        bgColor="bg-[#4CB9FF]"
      />
    </div>
  );
};

export default DashboardStats;