import React, { useState, useEffect } from 'react';
import { supabase } from "../../supabase";
import { AnimatePresence } from 'framer-motion';
import { ToastNotification } from '@/Components/ToastNotification';
import { 
  Calendar as CalendarIcon,
  Clock,
  Home,
  User,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Loader2,
  AlertCircle,
  UserCheck} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';

// Extend dayjs with plugins
dayjs.extend(customParseFormat);
dayjs.extend(weekOfYear);
dayjs.extend(isBetween);

interface TimetableEntry {
  id: number;
  class_id: string;
  subject_id: number;
  teacher_id: string;
  timeslot_id: number;
  room_id?: number;
  day_of_week: number;
  recurring: boolean;
  start_date?: string;
  end_date?: string;
  subjects?: {
    name: string;
    code: string;
  };
  timeslots?: {
    name: string;
    start_time: string;
    end_time: string;
    is_break: boolean;
  };
  rooms?: {
    name: string;
  };
  teachers?: {
    first_name: string;
    last_name: string;
  };
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  reason?: string;
  teacher_id: string;
  class_id: string;
}

interface StudentTimetableProps {
  studentId: string;
  schoolId: string;
}

const StudentTimetable: React.FC<StudentTimetableProps> = ({ 
  studentId, 
  schoolId
}) => {
  // Data state
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [classInfo, setClassInfo] = useState<{name: string, grade: string, id: string} | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState({
    timetable: true,
    attendance: true,
    initial: true
  });
  const [currentWeek, setCurrentWeek] = useState(dayjs());
  const [selectedDay, setSelectedDay] = useState<number>(dayjs().day());
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [showAttendanceHistory, setShowAttendanceHistory] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error';
  }>>([]);

  // Day names for display
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Fetch all necessary data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(prev => ({ ...prev, initial: true }));
        
        // First, get the student's class_id
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('class_id')
          .eq('user_id', studentId)
          .single();

        if (studentError) throw studentError;
        if (!studentData?.class_id) throw new Error('Student has no class assigned');

        // Fetch class info
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('name, grade, id')
          .eq('id', studentData.class_id)
          .single();

        if (classError) throw classError;
        setClassInfo(classData);

        // Fetch timetable entries
        await fetchTimetableData(studentData.class_id);
        
        // Fetch attendance records
        await fetchAttendanceData(studentData.class_id);

      } catch (error) {
        console.error('Error fetching data:', error);
        showNotification('Failed to load data', 'error');
      } finally {
        setIsLoading(prev => ({ ...prev, initial: false }));
      }
    };

    fetchData();
  }, [studentId, schoolId]);

  // Fetch timetable data
  const fetchTimetableData = async (classId: string) => {
    try {
      setIsLoading(prev => ({ ...prev, timetable: true }));
      
      const { data, error } = await supabase
        .from('timetable_entries')
        .select(`
          *,
          subjects:subject_id(name, code),
          timeslots:timeslot_id(name, start_time, end_time, is_break),
          rooms:room_id(name),
          teachers:teacher_id(first_name, last_name)
        `)
        .eq('class_id', classId)
        .eq('school_id', schoolId);

      if (error) throw error;
      setTimetableEntries(data || []);

    } catch (error) {
      console.error('Error fetching timetable data:', error);
      showNotification('Failed to load timetable data', 'error');
    } finally {
      setIsLoading(prev => ({ ...prev, timetable: false }));
    }
  };

  // Fetch attendance data
  const fetchAttendanceData = async (classId: string) => {
    try {
      setIsLoading(prev => ({ ...prev, attendance: true }));
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('class_id', classId)
        .eq('school_id', schoolId)
        .order('date', { ascending: false });

      if (error) throw error;
      setAttendanceRecords(data || []);

    } catch (error) {
      console.error('Error fetching attendance data:', error);
      showNotification('Failed to load attendance records', 'error');
    } finally {
      setIsLoading(prev => ({ ...prev, attendance: false }));
    }
  };

  // Helper functions
  const showNotification = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  };

  const getEntriesForDay = (dayOfWeek: number) => {
    return timetableEntries.filter(entry => {
      // For recurring entries, match day of week
      if (entry.recurring) {
        return entry.day_of_week === dayOfWeek;
      }
      
      // For one-time entries, check if within date range
      if (entry.start_date && entry.end_date) {
        const startDate = dayjs(entry.start_date);
        const endDate = dayjs(entry.end_date);
        return dayOfWeek === dayjs(entry.start_date).day() && 
               currentWeek.isBetween(startDate, endDate, 'day', '[]');
      }
      
      return false;
    }).sort((a, b) => {
      // Sort by timeslot start time
      const timeA = a.timeslots?.start_time || '00:00:00';
      const timeB = b.timeslots?.start_time || '00:00:00';
      return timeA.localeCompare(timeB);
    });
  };

  const getAttendanceForDay = (date: string) => {
    return attendanceRecords.find(record => record.date === date);
  };

  const getFilteredAttendanceRecords = () => {
    const now = new Date();
    let startDate = new Date();

    if (timeRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      startDate.setDate(now.getDate() - 30);
    }

    return attendanceRecords.filter(record => 
      timeRange === 'all' || new Date(record.date) >= startDate
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const calculateAttendanceStats = () => {
    const filtered = getFilteredAttendanceRecords();
    const totalDays = filtered.length;
    const presentDays = filtered.filter(r => r.status === 'Present').length;
    const absentDays = filtered.filter(r => r.status === 'Absent').length;
    const lateDays = filtered.filter(r => r.status === 'Late').length;
    
    const attendancePercentage = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      attendancePercentage
    };
  };

  const getAttendanceChartData = () => {
    const chartData: { date: string; status: string }[] = [];
    const dateMap: Record<string, string> = {};

    attendanceRecords.forEach(record => {
      dateMap[record.date] = record.status;
    });

    for (const date in dateMap) {
      chartData.push({
        date,
        status: dateMap[date]
      });
    }

    return chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const formatTime = (timeString: string) => {
    return dayjs(timeString, 'HH:mm:ss').format('h:mm A');
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'prev' 
      ? prev.subtract(1, 'week') 
      : prev.add(1, 'week')
    );
  };

  const goToToday = () => {
    setCurrentWeek(dayjs());
    setSelectedDay(dayjs().day());
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Present':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Present</span>;
      case 'Absent':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Absent</span>;
      case 'Late':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Late</span>;
      case 'Excused':
        return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Excused</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">Not marked</span>;
    }
  };

  if (isLoading.initial) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading your schedule...</span>
        </div>
      </div>
    );
  }

  const stats = calculateAttendanceStats();
  const chartData = getAttendanceChartData();
  const filteredAttendance = getFilteredAttendanceRecords();

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              My Schedule
            </h1>
            {classInfo && (
              <p className="text-gray-600 mt-1">
                Class: {classInfo.name} (Grade {classInfo.grade})
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowAttendanceHistory(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              View Attendance
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <CalendarIcon className="w-4 h-4" />
              Today
            </button>
          </div>
        </div>

        {/* Week navigation */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 rounded-full hover:bg-gray-100 bg-gray-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <h2 className="text-lg font-medium">
                {currentWeek.startOf('week').format('MMM D')} - {currentWeek.endOf('week').format('MMM D, YYYY')}
              </h2>
              
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 rounded-full hover:bg-gray-100 bg-gray-200"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CalendarIcon className="w-4 h-4" />
              <span>Week {currentWeek.week()}</span>
            </div>
          </div>
          
          {/* Day selector */}
          <div className="mt-4 grid grid-cols-7 gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
              const isToday = dayjs().isSame(currentWeek.startOf('week').add(dayIndex, 'day'), 'day');
              const isSelected = selectedDay === dayIndex;
              
              return (
                <button
                  key={dayIndex}
                  onClick={() => setSelectedDay(dayIndex)}
                  className={`py-2 rounded-md flex flex-col items-center ${
                    isSelected
                      ? 'bg-blue-500 text-white font-medium'
                      : isToday
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-100 bg-gray-300'
                  }`}
                >
                  <span className="text-sm">{dayNames[dayIndex].substring(0, 3)}</span>
                  <span className="text-lg">
                    {currentWeek.startOf('week').add(dayIndex, 'day').date()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Day Info */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            {dayNames[selectedDay]}, {currentWeek.startOf('week').add(selectedDay, 'day').format('MMMM D, YYYY')}
          </h2>
        </div>

        {/* Timetable for selected day */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-8">
          {isLoading.timetable ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : getEntriesForDay(selectedDay).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertCircle className="mx-auto h-12 w-12" />
              <h3 className="mt-2 text-lg font-medium">
                No classes scheduled
              </h3>
              <p className="mt-1">
                You have no classes scheduled for this day.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {getEntriesForDay(selectedDay).map(entry => {
                const date = currentWeek.startOf('week').add(selectedDay, 'day').format('YYYY-MM-DD');
                const attendance = getAttendanceForDay(date);
                
                return (
                  <div 
                    key={entry.id}
                    className={`p-4 border-l-4 ${
                      entry.timeslots?.is_break 
                        ? 'bg-gray-100 border-gray-300 text-gray-600' 
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          {entry.timeslots?.is_break ? (
                            <span>{entry.timeslots.name}</span>
                          ) : (
                            <>
                              {entry.subjects?.name} 
                              {entry.subjects?.code && (
                                <span className="text-sm font-normal">
                                  ({entry.subjects.code})
                                </span>
                              )}
                            </>
                          )}
                        </h3>
                        
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {formatTime(entry.timeslots?.start_time || '')} - {formatTime(entry.timeslots?.end_time || '')}
                            </span>
                          </div>
                          
                          {entry.rooms?.name && (
                            <div className="flex items-center gap-1">
                              <Home className="w-4 h-4" />
                              <span>{entry.rooms.name}</span>
                            </div>
                          )}
                          
                          {entry.teachers && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>
                                {entry.teachers.first_name} {entry.teachers.last_name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {!entry.timeslots?.is_break && attendance && (
                        <div>
                          {renderStatusBadge(attendance.status)}
                        </div>
                      )}
                    </div>
                    
                    {!entry.recurring && entry.start_date && entry.end_date && (
                      <div className="mt-2 text-xs text-gray-500">
                        One-time event: {dayjs(entry.start_date).format('MMM D')} - {dayjs(entry.end_date).format('MMM D, YYYY')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Weekly overview */}
        <div>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Weekly Schedule
          </h2>
          
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="grid grid-cols-7 divide-x divide-gray-200">
              {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                const dayEntries = getEntriesForDay(dayIndex);
                const isToday = dayjs().isSame(currentWeek.startOf('week').add(dayIndex, 'day'), 'day');
                const isSelected = selectedDay === dayIndex;
                
                return (
                  <div 
                    key={dayIndex}
                    className={`p-2 ${isToday ? 'bg-blue-50' : ''} ${isSelected ? 'border-t-2 border-blue-500' : ''}`}
                    onClick={() => setSelectedDay(dayIndex)}
                  >
                    <div className={`text-center font-medium mb-2 ${isToday ? 'text-blue-600' : ''}`}>
                      {dayNames[dayIndex].substring(0, 3)}
                    </div>
                    
                    {dayEntries.length === 0 ? (
                      <div className="text-center text-xs text-gray-400 h-6">
                        -
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {dayEntries.slice(0, 3).map(entry => (
                          <div 
                            key={entry.id}
                            className={`text-xs p-1 rounded truncate ${entry.timeslots?.is_break ? 'bg-gray-100' : 'bg-blue-100'}`}
                            title={entry.subjects?.name || entry.timeslots?.name}
                          >
                            {entry.subjects?.code || entry.timeslots?.name}
                          </div>
                        ))}
                        
                        {dayEntries.length > 3 && (
                          <div className="text-xs text-center text-gray-500">
                            +{dayEntries.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Attendance History Modal */}
      <AnimatePresence>
        {showAttendanceHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                      My Attendance History
                    </h2>
                    {classInfo && (
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-gray-600">
                          Class: {classInfo.name} (Grade {classInfo.grade})
                        </p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setShowAttendanceHistory(false)} 
                    className="text-gray-500 bg-slate-200 hover:bg-gray-100 hover:text-gray-700 p-2 rounded-full transition-colors"
                    aria-label="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setTimeRange('week')}
                    className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                      timeRange === 'week' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Last Week
                  </button>
                  <button
                    onClick={() => setTimeRange('month')}
                    className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                      timeRange === 'month' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Last Month
                  </button>
                  <button
                    onClick={() => setTimeRange('all')}
                    className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                      timeRange === 'all' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Time
                  </button>
                </div>
                
                {/* Attendance Summary Cards */}
                {!isLoading.attendance && filteredAttendance.length > 0 && (
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-sm text-gray-500 mb-1">Total Days</div>
                      <div className="text-2xl font-bold text-gray-800">{stats.totalDays}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="text-sm text-green-600 mb-1">Present</div>
                      <div className="text-2xl font-bold text-green-700">{stats.presentDays}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <div className="text-sm text-red-600 mb-1">Absent</div>
                      <div className="text-2xl font-bold text-red-700">{stats.absentDays}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <div className="text-sm text-yellow-600 mb-1">Late</div>
                      <div className="text-2xl font-bold text-yellow-700">{stats.lateDays}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-sm text-blue-600 mb-1">Attendance</div>
                      <div className="text-2xl font-bold text-blue-700">{stats.attendancePercentage}%</div>
                    </div>
                  </div>
                )}

                {/* Attendance Chart */}
                {chartData.length > 0 && (
                  <div className="h-64 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="status" 
                          stroke="#8884d8" 
                          strokeWidth={2} 
                          name="Status" 
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {isLoading.attendance ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-500">Loading attendance records...</p>
                  </div>
                ) : filteredAttendance.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="font-medium mb-1">No attendance records found</p>
                    <p className="text-sm">No data available for the selected time period</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredAttendance.map(record => {
                      const statusColors = {
                        'Present': 'bg-green-100 text-green-800',
                        'Absent': 'bg-red-100 text-red-800',
                        'Late': 'bg-yellow-100 text-yellow-800',
                        'Excused': 'bg-blue-100 text-blue-800'
                      };
                      
                      const statusIcons = {
                        'Present': (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ),
                        'Absent': (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ),
                        'Late': (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ),
                        'Excused': (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )
                      };
                      
                      return (
                        <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusColors[record.status]}`}>
                                {statusIcons[record.status]}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">
                                  {new Date(record.date).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </p>
                                {record.reason && record.reason !== 'No reason provided' && (
                                  <div className="mt-2 bg-gray-50 p-3 rounded-md">
                                    <p className="text-sm font-medium text-gray-700 mb-1">Teacher's Note:</p>
                                    <p className="text-sm text-gray-600">{record.reason}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColors[record.status]}`}>
                              {record.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowAttendanceHistory(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Toast Notifications */}
      <AnimatePresence>
        {notifications.map((notification) => (
          <ToastNotification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => setNotifications((prev) => prev.filter((n) => n.id !== notification.id))}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default StudentTimetable;