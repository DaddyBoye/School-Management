import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Calendar, Users, UserCheck, UserX, Search, Filter } from 'lucide-react';
import { supabase } from "../supabase";

// StatsCard Component
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconColor: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon: Icon, iconColor }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`w-4 h-4 ${iconColor}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </CardContent>
  </Card>
);

// Define AttendanceRecord interface
interface AttendanceRecord {
  student_id: number;
  date: string;
  status: string;
  reason?: string;
}

// StudentsList Component
interface Student {
  id: number;
  student_id: number;
  name: string;
  class: string;
  class_id: string;
  attendance_percentage: number;
  status: string;
}

interface StudentsListProps {
  students: Student[];
}

const StudentsList: React.FC<StudentsListProps> = ({ students }) => {
  const [localFilters, setLocalFilters] = useState({
    search: '',
    class: 'all'
  });

  const handleLocalFilterChange = (filterType: 'search' | 'class', value: string) => {
    const newFilters = {
      ...localFilters,
      [filterType]: value
    };
    setLocalFilters(newFilters);
  };

  // Filter students based on search and class
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(localFilters.search.toLowerCase());
    const matchesClass = localFilters.class === 'all' || student.class === localFilters.class;
    return matchesSearch && matchesClass;
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Students
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {students.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No students available to display.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search students by name..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={localFilters.search}
                    onChange={(e) => handleLocalFilterChange('search', e.target.value)}
                  />
                </div>

                <div>
                  <select
                    className="w-full border rounded-lg bg-white px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={localFilters.class}
                    onChange={(e) => handleLocalFilterChange('class', e.target.value)}
                  >
                    <option value="all">All Classes</option>
                    {[...new Set(students.map(student => student.class_id))].map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No students found matching the current filters.
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium">{student.name}</h3>
                          <p className="text-sm text-gray-500">{student.attendance_percentage}% attendance</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className={`px-2 py-1 rounded-full text-sm ${
                          student.status === "Present" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {student.status}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ClassBreakdown Component
interface ClassData {
  class: string;
  total: number;
  present: number;
  absent: number;
}

interface ClassBreakdownProps {
  classData: ClassData[];
  onViewDetails: (className: string) => void;
}

const ClassBreakdown: React.FC<ClassBreakdownProps> = ({ classData, onViewDetails }) => (
  <div className="space-y-4">
    {classData.map((cls) => (
      <div key={cls.class} className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">{cls.class}</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{cls.total} students</span>
            <button 
              onClick={() => onViewDetails(cls.class)} // Pass the selected class
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${(cls.present / cls.total) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-green-600">{cls.present} Present</span>
          <span className="text-red-600">{cls.absent} Absent</span>
        </div>
      </div>
    ))}
  </div>
);

// AttendanceChart Component
interface AttendanceChartProps {
  data: { date: string; present: number; absent: number }[];
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    {data.length === 0 ? (
      <div className="flex items-center justify-center h-full text-gray-500">
        No attendance data available to display.
      </div>
    ) : (
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="present" stroke="#22c55e" />
        <Line type="monotone" dataKey="absent" stroke="#ef4444" />
      </LineChart>
    )}
  </ResponsiveContainer>
);

// AttendanceTable Component
interface Absence {
  student: string;
  class: string;
  date: string;
  reason: string;
  status: string;
}

interface AttendanceTableProps {
  absences: Absence[];
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ absences }) => (
  <div className="overflow-x-auto">
    {absences.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        No absences recorded to display.
      </div>
    ) : (
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4">Student</th>
            <th className="text-left py-3 px-4">Class</th>
            <th className="text-left py-3 px-4">Date</th>
            <th className="text-left py-3 px-4">Reason</th>
            <th className="text-left py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {absences.map((absence, i) => (
            <tr key={i} className="border-b hover:bg-gray-50 transition-colors duration-150">
              <td className="py-3 px-4">{absence.student}</td>
              <td className="py-3 px-4">{absence.class}</td>
              <td className="py-3 px-4">{absence.date}</td>
              <td className="py-3 px-4">{absence.reason}</td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                  {absence.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const AttendanceReport = () => {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    attendanceRange: 'all',
    status: 'all',
    sortBy: 'name',
    search: '',
    class: 'all',
    timeRange: 'this-week'
  });

  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    averageRate: 0
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          name,
          class_id,
          attendance_percentage,
          status,
          classes!inner (class_id, teacher)
        `);
      if (studentsError) throw studentsError;

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*');
      if (attendanceError) throw attendanceError;

      const mappedStudentsData = studentsData.map(student => ({
        ...student,
        class: student.classes[0]?.class_id || 'Unknown'
      }));

      calculateStats(mappedStudentsData, attendanceData);

      setStudents(mappedStudentsData);
      setAttendanceRecords(attendanceData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const calculateStats = (students: Student[], attendanceRecords: AttendanceRecord[]) => {
    const totalStudents = students.length;
    const today = new Date().toISOString().split('T')[0];
    const presentToday = attendanceRecords.filter(record => 
      record.status === 'Present' && record.date === today
    ).length;
    const absentToday = attendanceRecords.filter(record => 
      record.status === 'Absent' && record.date === today
    ).length;
    const averageRate = parseFloat(((presentToday / totalStudents) * 100).toFixed(1));

    setStats({
      totalStudents,
      presentToday,
      absentToday,
      averageRate
    });
  };

  const getClassBreakdownData = () => {
    const classData = [];
    const classMap: { [key: string]: { class: string; total: number; present: number; absent: number } } = {};

    students.forEach(student => {
      const studentClass = student.class_id;
      if (!classMap[studentClass]) {
        classMap[studentClass] = {
          class: studentClass,
          total: 0,
          present: 0,
          absent: 0
        };
      }
      classMap[studentClass].total += 1;
    });

    attendanceRecords.forEach(record => {
      const student = students.find(s => s.student_id === record.student_id);
      if (student && classMap[student.class_id]) {
        if (record.status === 'Present') {
          classMap[student.class_id].present += 1;
        } else if (record.status === 'Absent') {
          classMap[student.class_id].absent += 1;
        }
      }
    });

    for (const key in classMap) {
      classData.push(classMap[key]);
    }

    return classData;
  };

  const getAttendanceChartData = () => {
    const chartData = [];
    const dateMap: { [key: string]: { date: string; present: number; absent: number } } = {};

    attendanceRecords.forEach(record => {
      if (!dateMap[record.date]) {
        dateMap[record.date] = {
          date: record.date,
          present: 0,
          absent: 0
        };
      }
      if (record.status === 'Present') {
        dateMap[record.date].present += 1;
      } else if (record.status === 'Absent') {
        dateMap[record.date].absent += 1;
      }
    });

    for (const key in dateMap) {
      chartData.push(dateMap[key]);
    }

    return chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getRecentAbsences = () => {
    const absences = attendanceRecords
      .filter(record => record.status === 'Absent')
      .map(record => {
        const student = students.find(s => s.student_id === record.student_id);
        return {
          student: student ? student.name : 'Unknown',
          class: student ? student.class_id : 'Unknown',
          date: record.date,
          reason: record.reason || 'No reason provided',
          status: record.status
        };
      });

    return absences.slice(0, 5); // Show only the 5 most recent absences
  };

  return (
    <div className="min-h-screen p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Attendance Report</h1>
        <p className="text-gray-600">Weekly attendance overview and class-wise breakdown</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select 
            className="border rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            value={filters.class}
            onChange={(e) => setFilters({ ...filters, class: e.target.value })}
          >
            <option value="all">All Classes</option>
            {[...new Set(students.map(student => student.class_id))].map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          <select 
            className="border rounded-lg px-4 bg-white py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            value={filters.timeRange}
            onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
          >
            <option value="this-week">This Week</option>
            <option value="last-week">Last Week</option>
            <option value="this-month">This Month</option>
          </select>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-150">
            Generate Report
          </button>
        </div>
        <div className='hidden'>{selectedClass}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.totalStudents === 0 ? (
            <div className="text-center py-8 text-gray-500 col-span-4">
              No statistics available to display.
            </div>
          ) : (
            <>
              <StatsCard
                title="Total Students"
                value={stats.totalStudents.toString()}
                subtitle="in selected classes"
                icon={Users}
                iconColor="text-gray-500"
              />
              <StatsCard
                title="Present Today"
                value={stats.presentToday.toString()}
                subtitle={`${stats.averageRate}% attendance`}
                icon={UserCheck}
                iconColor="text-green-500"
              />
              <StatsCard
                title="Absent Today"
                value={stats.absentToday.toString()}
                subtitle={`${((stats.absentToday / stats.totalStudents) * 100).toFixed(1)}% absence`}
                icon={UserX}
                iconColor="text-red-500"
              />
              <StatsCard
                title="Average Rate"
                value={`${stats.averageRate}%`}
                subtitle={filters.timeRange.replace('-', ' ')}
                icon={Calendar}
                iconColor="text-blue-500"
              />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceChart data={getAttendanceChartData()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class-wise Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassBreakdown 
              classData={getClassBreakdownData()} 
              onViewDetails={setSelectedClass}
            />
          </CardContent>
        </Card>
      </div>

      <StudentsList 
        students={students}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent Absences</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceTable absences={getRecentAbsences()} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceReport;