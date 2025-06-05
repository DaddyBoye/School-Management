import React, { useState, useEffect } from 'react';
import { supabase } from "../../supabase";
import { AnimatePresence } from 'framer-motion';
import { ToastNotification } from '@/Components/ToastNotification';
import { 
  Users, 
  Loader2, 
  Calendar as CalendarIcon,
  Clock,
  Home,
  User,
  ChevronLeft,
  ChevronRight as RightIcon} from 'lucide-react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';
dayjs.extend(customParseFormat);
dayjs.extend(weekOfYear);
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

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
  classes?: {
    name: string;
    grade: string;
  };
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

interface TeacherSubject {
  subject_id: number;
  class_id: string;
  subject_name: string;
  subject_code: string;
  class_name: string;
}

interface Class {
  id: string;
  name: string;
  grade: string;
}

interface TeacherTimetableProps {
  teacherId: string;
  schoolId: string;
}

const TeacherTimetable: React.FC<TeacherTimetableProps> = ({ 
  teacherId, 
  schoolId
}) => {
  // View state
  const [viewMode, setViewMode] = useState<'personal' | 'class'>('personal');
  
  // Data state
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [assignedClass, setAssignedClass] = useState<Class | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(dayjs());
  const [selectedDay, setSelectedDay] = useState<number>(dayjs().day());
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error';
  }>>([]);

  // Day names for display
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Fetch teacher data
  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch teacher's assigned class
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('class_id, classes!teachers_class_id_fkey(id, name, grade)')
          .eq('user_id', teacherId)
          .single();
  
        if (teacherError) throw teacherError;
  
        if (teacherData?.classes) {
          const assignedClassData = Array.isArray(teacherData.classes) ? teacherData.classes[0] : teacherData.classes;
          setAssignedClass(assignedClassData);
        }

        // Fetch teacher's assigned subjects
        const { data: teacherSubjectsData, error: subjectsError } = await supabase
          .from('teacher_subjects')
          .select(`
            subject_id, 
            class_id, 
            subjects:subject_id(name, code), 
            classes:class_id(name)
          `)
          .eq('teacher_id', teacherId)
          .eq('school_id', schoolId);

        if (subjectsError) throw subjectsError;
        
        const formattedSubjects = (teacherSubjectsData || []).map(item => {
          const subjectObj = Array.isArray(item.subjects) 
            ? item.subjects[0]
            : item.subjects;
          
          const classObj = Array.isArray(item.classes)
            ? item.classes[0]
            : item.classes;
          
          return {
            subject_id: item.subject_id,
            class_id: item.class_id,
            subject_name: subjectObj?.name || 'Unknown',
            subject_code: subjectObj?.code || '',
            class_name: classObj?.name || 'Unknown'
          };
        });

        setTeacherSubjects(formattedSubjects);

      } catch (error) {
        console.error('Error fetching teacher data:', error);
        showNotification('Failed to load teacher data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    if (teacherId && schoolId) {
      fetchTeacherData();
    }
  }, [teacherId, schoolId]);

  // Fetch timetable data
  useEffect(() => {
    const fetchTimetableData = async () => {
      try {
        setIsLoading(true);
        
        if (viewMode === 'personal') {
          // Fetch teacher's personal timetable
          const { data, error } = await supabase
            .from('timetable_entries')
            .select(`
              *,
              classes:class_id(name, grade),
              subjects:subject_id(name, code),
              timeslots:timeslot_id(name, start_time, end_time, is_break),
              rooms:room_id(name)
            `)
            .eq('teacher_id', teacherId)
            .eq('school_id', schoolId);

          if (error) throw error;
          setTimetableEntries(data || []);
        } else if (viewMode === 'class' && assignedClass?.id) {
          // Fetch class timetable
          const { data, error } = await supabase
            .from('timetable_entries')
            .select(`
              *,
              classes:class_id(name, grade),
              subjects:subject_id(name, code),
              timeslots:timeslot_id(name, start_time, end_time, is_break),
              rooms:room_id(name),
              teachers:teacher_id(first_name, last_name)
            `)
            .eq('class_id', assignedClass.id)
            .eq('school_id', schoolId);

          if (error) throw error;
          setTimetableEntries(data || []);
        }
      } catch (error) {
        console.error('Error fetching timetable data:', error);
        showNotification('Failed to load timetable data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimetableData();
  }, [viewMode, teacherId, schoolId, assignedClass]);

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

  const getColorForEntry = (entry: TimetableEntry) => {
    if (entry.timeslots?.is_break) return 'bg-gray-100';
    if (viewMode === 'personal') return 'bg-blue-50 border-blue-200';
    return 'bg-green-50 border-green-200';
  };

  const getTextColorForEntry = (entry: TimetableEntry) => {
    if (entry.timeslots?.is_break) return 'text-gray-600';
    if (viewMode === 'personal') return 'text-blue-800';
    return 'text-green-800';
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'prev' 
      ? prev.subtract(1, 'week') 
      : prev.add(1, 'week')
    );
  };

  const formatTime = (timeString: string) => {
    return dayjs(timeString, 'HH:mm:ss').format('h:mm A');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading timetable data...</span>
        </div>
      </div>
    );
  }

  const hasAssignedClass = !!assignedClass;
  const hasSubjectsTaught = teacherSubjects.length > 0;
  
  if (!hasAssignedClass && !hasSubjectsTaught) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-2">No Assignments Found</h2>
        <p className="text-gray-600">
          You haven't been assigned to any classes or subjects yet.
          <br />
          Please contact your school administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-black">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header with toggles */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Timetable Management</h1>
          
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('personal')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                viewMode === 'personal' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <User className="w-4 h-4" />
              My Schedule
            </button>
            
            {hasAssignedClass && (
              <button
                onClick={() => setViewMode('class')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  viewMode === 'class' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                Class Timetable
              </button>
            )}
          </div>
        </div>

        {/* Week navigation */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 rounded-full hover:bg-gray-100 bg-blue-500"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <h2 className="text-lg font-medium">
                {currentWeek.startOf('week').format('MMM D')} - {currentWeek.endOf('week').format('MMM D, YYYY')}
              </h2>
              
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 rounded-full hover:bg-gray-100 bg-blue-500"
              >
                <RightIcon className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setCurrentWeek(dayjs())}
                className="px-3 py-1 text-sm bg-blue-500 hover:bg-gray-200 rounded-md"
              >
                Today
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CalendarIcon className="w-4 h-4" />
              <span>Week {currentWeek.week()}</span>
            </div>
          </div>
          
          {/* Day selector */}
          <div className="mt-4 grid grid-cols-7 gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => (
              <button
                key={dayIndex}
                onClick={() => setSelectedDay(dayIndex)}
                className={`py-2 rounded-md flex flex-col items-center ${
                  selectedDay === dayIndex
                    ? 'bg-blue-500 text-white font-medium'
                    : 'hover:bg-blue-200 bg-slate-400'
                }`}
              >
                <span className="text-sm">{dayNames[dayIndex].substring(0, 3)}</span>
                <span className="text-lg">
                  {currentWeek.startOf('week').add(dayIndex, 'day').date()}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Current View Info */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">View:</span>
              <span className="font-medium">
                {viewMode === 'personal' ? 'My Personal Schedule' : 'Class Timetable'}
              </span>
            </div>
            
            {viewMode === 'class' && assignedClass && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Class:</span>
                <span className="font-medium">
                  {assignedClass.name} (Grade {assignedClass.grade})
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Day:</span>
              <span className="font-medium">
                {dayNames[selectedDay]}, {currentWeek.startOf('week').add(selectedDay, 'day').format('MMM D')}
              </span>
            </div>
          </div>
        </div>

        {/* Timetable for selected day */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {getEntriesForDay(selectedDay).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CalendarIcon className="mx-auto h-12 w-12" />
              <h3 className="mt-2 text-lg font-medium">
                No {viewMode === 'personal' ? 'classes' : 'timetable entries'} scheduled
              </h3>
              <p className="mt-1">
                {viewMode === 'personal' 
                  ? 'You have no classes scheduled for this day.' 
                  : 'There are no timetable entries for this class on this day.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {getEntriesForDay(selectedDay).map(entry => (
                <div 
                  key={entry.id}
                  className={`p-4 border-l-4 ${getColorForEntry(entry)} ${getTextColorForEntry(entry)}`}
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
                        
                        {viewMode === 'class' && entry.teacher_id !== teacherId && (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>
                              {entry.teachers?.first_name} {entry.teachers?.last_name}
                            </span>
                          </div>
                        )}
                        
                        {viewMode === 'class' && entry.teacher_id === teacherId && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {!entry.timeslots?.is_break && viewMode === 'class' && (
                      <div>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                          {entry.classes?.name} (Grade {entry.classes?.grade})
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {!entry.recurring && entry.start_date && entry.end_date && (
                    <div className="mt-2 text-xs text-gray-500">
                      One-time event: {dayjs(entry.start_date).format('MMM D')} - {dayjs(entry.end_date).format('MMM D, YYYY')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Weekly overview */}
        <div className="mt-8">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Weekly Overview
          </h2>
          
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="grid grid-cols-7 divide-x divide-gray-200">
              {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                const dayEntries = getEntriesForDay(dayIndex);
                const isToday = dayjs().isSame(currentWeek.startOf('week').add(dayIndex, 'day'), 'day');
                
                return (
                  <div 
                    key={dayIndex}
                    className={`p-2 ${isToday ? 'bg-blue-50' : ''}`}
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

export default TeacherTimetable;