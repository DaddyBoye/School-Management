import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronDown } from 'lucide-react';

// Define interfaces for data structures
interface DayAttendance {
  day: string;
  present: number;
  absent: number;
  totalStudents: number;
}

interface ClassAttendanceData {
  [period: string]: DayAttendance[];
}

interface AllClassesData {
  [className: string]: ClassAttendanceData;
}

const AttendanceChart = () => {
  const [periodType, setPeriodType] = useState<string>('This Week');
  const [selectedClass, setSelectedClass] = useState<string>('All Classes');
  const [showPeriodMenu, setShowPeriodMenu] = useState<boolean>(false);
  const [showClassMenu, setShowClassMenu] = useState<boolean>(false);

  const classes: string[] = ['All Classes', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];

  // Sample data with actual numbers
  const allData: AllClassesData = {
    'Grade 5': {
      'This Week': [
        { day: 'Mon', present: 70, absent: 25, totalStudents: 95 },
        { day: 'Tue', present: 80, absent: 20, totalStudents: 100 },
        { day: 'Wed', present: 50, absent: 45, totalStudents: 95 },
        { day: 'Thu', present: 65, absent: 35, totalStudents: 100 },
        { day: 'Fri', present: 90, absent: 10, totalStudents: 100 },
      ],
      'Last Week': [
        { day: 'Mon', present: 75, absent: 20, totalStudents: 95 },
        { day: 'Tue', present: 85, absent: 15, totalStudents: 100 },
        { day: 'Wed', present: 60, absent: 35, totalStudents: 95 },
        { day: 'Thu', present: 70, absent: 30, totalStudents: 100 },
        { day: 'Fri', present: 85, absent: 15, totalStudents: 100 },
      ],
      'This Month': [
        { day: 'Week 1', present: 82, absent: 18, totalStudents: 100 },
        { day: 'Week 2', present: 78, absent: 22, totalStudents: 100 },
        { day: 'Week 3', present: 85, absent: 15, totalStudents: 100 },
        { day: 'Week 4', present: 80, absent: 20, totalStudents: 100 },
      ],
      'This Semester': [
        { day: 'Sep', present: 85, absent: 15, totalStudents: 100 },
        { day: 'Oct', present: 82, absent: 18, totalStudents: 100 },
        { day: 'Nov', present: 88, absent: 12, totalStudents: 100 },
        { day: 'Dec', present: 80, absent: 20, totalStudents: 100 },
        { day: 'Jan', present: 86, absent: 14, totalStudents: 100 },
      ],
    },
    'Grade 6': {
      'This Week': [
        { day: 'Mon', present: 75, absent: 20, totalStudents: 95 },
        { day: 'Tue', present: 85, absent: 15, totalStudents: 100 },
        { day: 'Wed', present: 55, absent: 40, totalStudents: 95 },
        { day: 'Thu', present: 70, absent: 30, totalStudents: 100 },
        { day: 'Fri', present: 95, absent: 5, totalStudents: 100 },
      ],
    },
  };

  const periods: string[] = ['This Week', 'Last Week', 'This Month', 'This Semester'];

  // Get data based on selected class and period
  const getCurrentData = () => {
    if (selectedClass === 'All Classes') {
      const selectedPeriodData = Object.values(allData).map(classData => classData[periodType] || []);
      
      return selectedPeriodData[0].map((day, index) => {
        const averages = selectedPeriodData.reduce((acc, curr) => {
          const currentDay = curr[index] || day;
          return {
            day: day.day,
            present: acc.present + (currentDay.present / selectedPeriodData.length),
            absent: acc.absent + (currentDay.absent / selectedPeriodData.length),
            totalStudents: acc.totalStudents + (currentDay.totalStudents / selectedPeriodData.length),
          };
        }, { present: 0, absent: 0, totalStudents: 0, day: '' });

        return {
          day: day.day,
          present: Math.round(averages.present),
          absent: Math.round(averages.absent),
          totalStudents: Math.round(averages.totalStudents),
          presentPercent: Math.round((averages.present / averages.totalStudents) * 100),
          absentPercent: Math.round((averages.absent / averages.totalStudents) * 100)
        };
      });
    }

    const classData = allData[selectedClass][periodType] || [];
    return classData.map(day => ({
      ...day,
      presentPercent: Math.round((day.present / day.totalStudents) * 100),
      absentPercent: Math.round((day.absent / day.totalStudents) * 100)
    }));
  };

  const currentData = getCurrentData();

  // Calculate totals and averages
  interface Totals {
    present: number;
    absent: number;
    totalStudents: number;
  }

  const totals = currentData.reduce<Totals>((acc, day) => ({
    present: acc.present + day.present,
    absent: acc.absent + day.absent,
    totalStudents: acc.totalStudents + day.totalStudents
  }), { present: 0, absent: 0, totalStudents: 0 });

  const averages = {
    present: Math.round(totals.present / currentData.length),
    absent: Math.round(totals.absent / currentData.length),
    totalStudents: Math.round(totals.totalStudents / currentData.length),
    presentPercent: Math.round((totals.present / totals.totalStudents) * 100),
    absentPercent: Math.round((totals.absent / totals.totalStudents) * 100)
  };

  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload: DayAttendance & { presentPercent: number; absentPercent: number } }>;
  }

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border">
          <p className="text-gray-600 font-medium mb-2">{data.day}</p>
          <div className="space-y-1">
            <p className="text-blue-500">
              Present: {data.present} students ({data.presentPercent}%)
            </p>
            <p className="text-red-400">
              Absent: {data.absent} students ({data.absentPercent}%)
            </p>
            <p className="text-gray-500 text-sm">
              Total: {data.totalStudents} students
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  interface DropdownProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
  }

  const Dropdown = ({ options, value, onChange, isOpen, setIsOpen }: DropdownProps) => (
    <div className="relative">
      <button 
        className="flex h-10 w-28 items-center text-black bg-gray-200 text-sm gap-1 hover:bg-gray-300 px-3 py-1.5 rounded-lg border"
        onClick={() => setIsOpen(!isOpen)}
      >
        {value}
        <ChevronDown className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full bg-white rounded-lg shadow-lg z-10">
          {options.map((option) => (
            <button
              key={option}
              className="w-full text-left px-4 py-2 text-sm text-black bg-white hover:bg-gray-100"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl p-4 border-2">
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-2">
          <h3 className="text-xl text-black font-medium">Attendance</h3>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 font-semibold rounded-full bg-blue-400"></div>
              <span className="text-gray-600">
                Present: {averages.present} ({averages.presentPercent}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-300"></div>
              <span className="text-gray-600">
                Absent: {averages.absent} ({averages.absentPercent}%)
              </span>
            </div>
            <div className="text-gray-500">
              Total: {averages.totalStudents} students
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Dropdown 
            options={classes}
            value={selectedClass}
            onChange={setSelectedClass}
            isOpen={showClassMenu}
            setIsOpen={setShowClassMenu}
          />
          <Dropdown 
            options={periods}
            value={periodType}
            onChange={setPeriodType}
            isOpen={showPeriodMenu}
            setIsOpen={setShowPeriodMenu}
          />
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={currentData}
            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false}
              stroke="#E5E7EB"
            />
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 14, fill: '#6B7280' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 14, fill: '#6B7280' }}
              ticks={[0, 20, 40, 60, 80, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="presentPercent" 
              fill="#60A5FA"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar 
              dataKey="absentPercent" 
              fill="#FCA5A5"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AttendanceChart;