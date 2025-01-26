import { useState } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { ChevronDown } from 'lucide-react';

const StudentDistribution = () => {
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState('Grade 5');

  const data = [
    { name: 'Boys', value: 205, color: '#4CB9FF' },
    { name: 'Girls', value: 223, color: '#FF6B8A' }
  ];

  const totalStudents = data.reduce((sum, item) => sum + item.value, 0);

  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];

  return (
    <div className="bg-white p-6 rounded-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Students</h2>
        
        {/* Custom Grade Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowGradeDropdown(!showGradeDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 focus:outline-none"
          >
            {selectedGrade}
            <ChevronDown size={16} />
          </button>
          
          {showGradeDropdown && (
            <div className="absolute right-0 mt-1 w-32 bg-white border rounded-lg shadow-lg py-1 z-10">
              {grades.map((grade) => (
                <button
                  key={grade}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    setSelectedGrade(grade);
                    setShowGradeDropdown(false);
                  }}
                >
                  {grade}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center">
        {/* Donut Chart */}
        <div className="relative">
          <PieChart width={200} height={200}>
            <Pie
              data={data}
              cx={100}
              cy={100}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <span className="text-2xl font-bold">{totalStudents}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-8 mt-4">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">
                {entry.name}: {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDistribution;