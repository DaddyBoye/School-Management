import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Select,
  DatePicker,
  Statistic,
  Progress,
  Tag,
  Alert,
  Button,
  Tabs,
  Badge,
  Empty,
  Input,
  Space,
  Spin,
  Dropdown,
  Modal,
  Form,
  Checkbox,
  Popover
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FilePdfOutlined,
  BarChartOutlined,
  FilterOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  CheckOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import {
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;
import { supabase } from '../../supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types
type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused' | string;

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  reason?: string;
  teacher_id: string;
  created_at: string;
  school_id: string;
}

interface Student {
  user_id: string;
  first_name: string;
  last_name: string;
  roll_no?: string;
}

interface Class {
  id: string;
  name: string;
  grade: string;
}

interface Teacher {
  user_id: string;
  first_name: string;
  last_name: string;
}

interface DailyStats {
  Present: number;
  Absent: number;
  Late: number;
  Excused: number;
}

interface AcademicYear {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

interface AcademicTerm {
  id: string;
  academic_year_id: string;
  name: string;
  term_type: 'semester' | 'trimester' | 'quarter' | 'term';
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

interface SchoolHoliday {
  id: string;
  academic_year_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_recurring: boolean;
  recurring_pattern?: string;
  created_at: string;
  updated_at: string;
}

interface SchoolEvent {
  id: string;
  academic_year_id: string;
  name: string;
  description?: string;
  event_date: string;
  event_type: 'exam' | 'sports_day' | 'cultural_event' | 'parent_meeting' | 'teacher_training' | 'other';
  affects_attendance: boolean;
  created_at: string;
  updated_at: string;
}

const AdminAttendanceViewer = ({ schoolId }: { schoolId: string }) => {
  // State
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [schoolHolidays, setSchoolHolidays] = useState<SchoolHoliday[]>([]);
  const [schoolEvents, setSchoolEvents] = useState<SchoolEvent[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<AcademicYear | null>(null);
  const [currentTerm, setCurrentTerm] = useState<AcademicTerm | null>(null);
  const [loading, setLoading] = useState({
    initial: true,
    data: false,
    export: false,
    connection: false
  });
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('summary');
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [calendarModalMode, setCalendarModalMode] = useState<'year' | 'term' | 'holiday' | 'event'>('year');
  const [calendarFormData, setCalendarFormData] = useState<Partial<AcademicYear & AcademicTerm & SchoolHoliday & SchoolEvent>>({});
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);

  // Check connection and fetch initial data
  const checkConnectionAndFetchData = async () => {
    try {
      setLoading(prev => ({ ...prev, connection: true }));
      setConnectionError(false);
      
      // Simple ping to Supabase to check connection
      const { error } = await supabase
        .from('teachers')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      await fetchInitialData();
    } catch (err) {
      console.error('Connection check failed:', err);
      setConnectionError(true);
      setError('No internet connection detected');
    } finally {
      setLoading(prev => ({ ...prev, connection: false }));
    }
  };

  // Fetch all necessary data
  const fetchInitialData = async () => {
    try {
      setLoading(prev => ({ ...prev, initial: true }));
      setError(null);

      // Fetch all data in parallel
      const [
        classesRes, 
        teachersRes, 
        studentsRes,
        academicYearsRes,
        academicTermsRes,
        schoolHolidaysRes,
        schoolEventsRes
      ] = await Promise.all([
        supabase.from('classes').select('*').eq('school_id', schoolId),
        supabase.from('teachers').select('user_id, first_name, last_name').eq('school_id', schoolId),
        supabase.from('students').select('user_id, first_name, last_name, roll_no').eq('school_id', schoolId),
        supabase.from('academic_years').select('*').eq('school_id', schoolId).order('start_date', { ascending: false }),
        supabase.from('academic_terms').select('*').order('start_date', { ascending: false }),
        supabase.from('school_holidays').select('*').order('start_date', { ascending: false }),
        supabase.from('school_events').select('*').order('event_date', { ascending: false })
      ]);

      const errors = [
        classesRes.error && 'Failed to fetch classes',
        teachersRes.error && 'Failed to fetch teachers',
        studentsRes.error && 'Failed to fetch students',
        academicYearsRes.error && 'Failed to fetch academic years',
        academicTermsRes.error && 'Failed to fetch academic terms',
        schoolHolidaysRes.error && 'Failed to fetch school holidays',
        schoolEventsRes.error && 'Failed to fetch school events'
      ].filter(Boolean);

      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      setClasses(classesRes.data || []);
      setTeachers(teachersRes.data || []);
      setStudents(studentsRes.data || []);
      setAcademicYears(academicYearsRes.data || []);
      setAcademicTerms(academicTermsRes.data || []);
      setSchoolHolidays(schoolHolidaysRes.data || []);
      setSchoolEvents(schoolEventsRes.data || []);

      // Set current academic year and term
      const currentYear = academicYearsRes.data?.find(y => y.is_current) || null;
      setCurrentAcademicYear(currentYear);
      
      if (currentYear) {
        const currentTerm = academicTermsRes.data?.find(t => 
          t.academic_year_id === currentYear.id && t.is_current
        ) || null;
        setCurrentTerm(currentTerm);
        setSelectedTerm(currentTerm?.id || null);
      }

      await fetchAttendanceRecords();
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError(
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to load initial data'
      );
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  };

  // Fetch attendance records
  const fetchAttendanceRecords = async () => {
    try {
      setLoading(prev => ({ ...prev, data: true }));
      setError(null);

      let query = supabase
        .from('attendance_records')
        .select('*')
        .eq('school_id', schoolId)
        .order('date', { ascending: false });

      // Apply date range filter if specified
      if (dateRange) {
        const [start, end] = dateRange;
        query = query
          .gte('date', start.format('YYYY-MM-DD'))
          .lte('date', end.format('YYYY-MM-DD'));
      }

      // Apply term filter if specified
      if (selectedTerm) {
        const term = academicTerms.find(t => t.id === selectedTerm);
        if (term) {
          query = query
            .gte('date', term.start_date)
            .lte('date', term.end_date);
        }
      }

      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }

      if (selectedTeacher) {
        query = query.eq('teacher_id', selectedTeacher);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setAttendanceData(data || []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance records. See console for details.');
    } finally {
      setLoading(prev => ({ ...prev, data: false }));
    }
  };

  // Check if a date is a holiday
  const isHoliday = (date: string) => {
    return schoolHolidays.some(holiday => {
      const holidayStart = dayjs(holiday.start_date);
      const holidayEnd = dayjs(holiday.end_date);
      const checkDate = dayjs(date);
      return checkDate.isBetween(holidayStart, holidayEnd, null, '[]');
    });
  };

  // Check if a date has a special event
  const getEventForDate = (date: string) => {
    return schoolEvents.find(event => event.event_date === date);
  };

  // Apply filters when they change
  useEffect(() => {
    if (!loading.initial) {
      fetchAttendanceRecords();
    }
  }, [dateRange, selectedClass, selectedTeacher, selectedTerm]);

  // Handle date range button clicks
  const handleDateRangeButtonClick = (range: 'today' | 'week' | 'month' | 'term') => {
    switch (range) {
      case 'today':
        setDateRange([dayjs(), dayjs()]);
        setSelectedTerm(null);
        break;
      case 'week':
        setDateRange([dayjs().subtract(6, 'days'), dayjs()]);
        setSelectedTerm(null);
        break;
      case 'month':
        setDateRange([dayjs().startOf('month'), dayjs().endOf('month')]);
        setSelectedTerm(null);
        break;
      case 'term':
        if (currentTerm) {
          setDateRange(null);
          setSelectedTerm(currentTerm.id);
        }
        break;
      default:
        setDateRange(null);
        setSelectedTerm(null);
    }
  };

  // Filter data based on current filters and search
  const filteredData = useMemo(() => {
    return attendanceData.filter(record => {
      // Status filter
      if (selectedStatus && record.status !== selectedStatus) return false;
      
      // Search filter
      if (searchQuery) {
        const student = students.find(s => s.user_id === record.student_id);
        const studentName = student ? `${student.first_name} ${student.last_name}` : '';
        const studentRollNo = student?.roll_no || '';
        
        const searchLower = searchQuery.toLowerCase();
        if (!studentName.toLowerCase().includes(searchLower) && 
            !studentRollNo.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
  }, [attendanceData, selectedStatus, searchQuery, students]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRecords = filteredData.length;
    const presentCount = filteredData.filter(r => r.status === 'Present').length;
    const absentCount = filteredData.filter(r => r.status === 'Absent').length;
    const lateCount = filteredData.filter(r => r.status === 'Late').length;
    const excusedCount = filteredData.filter(r => r.status === 'Excused').length;
    
    return {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      presentPercentage: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0,
      absentPercentage: totalRecords > 0 ? Math.round((absentCount / totalRecords) * 100) : 0,
      latePercentage: totalRecords > 0 ? Math.round((lateCount / totalRecords) * 100) : 0,
      excusedPercentage: totalRecords > 0 ? Math.round((excusedCount / totalRecords) * 100) : 0,
    };
  }, [filteredData]);

  // Prepare chart data
  const { lineChartData, barChartData, classStats } = useMemo(() => {
    // Group data by date
    const dateMap: Record<string, DailyStats> = {};
    
    filteredData.forEach(record => {
      if (!dateMap[record.date]) {
        dateMap[record.date] = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
      }
      dateMap[record.date][record.status as keyof DailyStats]++;
    });

    // Convert to array and sort by date
    const lineChartData = Object.entries(dateMap)
      .map(([date, stats]) => ({ 
        date, 
        ...stats,
        isHoliday: isHoliday(date),
        event: getEventForDate(date)
      }))
      .sort((a, b) => dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1);

    // Bar chart data
    const barChartData = [
      { name: 'Present', value: stats.presentCount, fill: '#52c41a' },
      { name: 'Absent', value: stats.absentCount, fill: '#f5222d' },
      { name: 'Late', value: stats.lateCount, fill: '#faad14' },
      { name: 'Excused', value: stats.excusedCount, fill: '#1890ff' },
    ];

    // Class-wise stats
    const classStats = classes.map(cls => {
      const classRecords = filteredData.filter(record => record.class_id === cls.id);
      const presentCount = classRecords.filter(r => r.status === 'Present').length;
      const totalCount = classRecords.length;
      
      return {
        classId: cls.id,
        className: cls.name,
        grade: cls.grade,
        presentCount,
        totalCount,
        percentage: totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
      };
    }).filter(stat => stat.totalCount > 0)
      .sort((a, b) => b.percentage - a.percentage);

    return { lineChartData, barChartData, classStats };
  }, [filteredData, classes, stats, schoolHolidays, schoolEvents]);

  // Render status tag with holiday/event indicators
  const renderStatusTag = (status: AttendanceStatus, date: string) => {
    const normalizedStatus = status.toLowerCase();
    const holiday = isHoliday(date);
    const event = getEventForDate(date);
    
    const statusConfig = {
      present: { color: 'green', icon: <CheckCircleOutlined /> },
      absent: { color: 'red', icon: <CloseCircleOutlined /> },
      late: { color: 'orange', icon: <ClockCircleOutlined /> },
      excused: { color: 'blue', icon: <UserOutlined /> },
      default: { color: 'gray', icon: <ExclamationCircleOutlined /> }
    };

    const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || statusConfig.default;
    
    let tagContent = (
      <Tag color={config.color} icon={config.icon}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </Tag>
    );

    if (holiday || event) {
      const popoverContent = (
        <div>
          {holiday && (
            <div>
              <strong>Holiday:</strong> {
                schoolHolidays.find(h => 
                  dayjs(date).isBetween(h.start_date, h.end_date, null, '[]')
                )?.name
              }
            </div>
          )}
          {event && (
            <div>
              <strong>Event:</strong> {event.name} ({event.event_type.replace('_', ' ')})
            </div>
          )}
        </div>
      );

      return (
        <Popover content={popoverContent} title="Special Date">
          <Badge 
            dot 
            color={holiday ? 'orange' : 'purple'} 
            offset={[-5, 5]}
          >
            {tagContent}
          </Badge>
        </Popover>
      );
    }

    return tagContent;
  };

  // Table columns
  const columns: ColumnsType<AttendanceRecord> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1,
      render: (date: string) => {
        const holiday = isHoliday(date);
        const event = getEventForDate(date);
        
        let dateDisplay = dayjs(date).format('MMM DD, YYYY');
        
        if (holiday || event) {
          const popoverContent = (
            <div>
              {holiday && (
                <div>
                  <strong>Holiday:</strong> {
                    schoolHolidays.find(h => 
                      dayjs(date).isBetween(h.start_date, h.end_date, null, '[]')
                    )?.name
                  }
                </div>
              )}
              {event && (
                <div>
                  <strong>Event:</strong> {event.name} ({event.event_type.replace('_', ' ')})
                </div>
              )}
            </div>
          );

          return (
            <Popover content={popoverContent} title="Special Date">
              <div className="flex items-center">
                {dateDisplay}
                <InfoCircleOutlined className="ml-1 text-orange-500" />
              </div>
            </Popover>
          );
        }
        
        return dateDisplay;
      },
    },
    {
      title: 'Student',
      key: 'student',
      render: (_, record) => {
        const student = students.find(s => s.user_id === record.student_id);
        return student ? `${student.first_name} ${student.last_name}` : 'Unknown';
      },
      sorter: (a, b) => {
        const studentA = students.find(s => s.user_id === a.student_id);
        const studentB = students.find(s => s.user_id === b.student_id);
        const nameA = studentA ? `${studentA.first_name} ${studentA.last_name}` : '';
        const nameB = studentB ? `${studentB.first_name} ${studentB.last_name}` : '';
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: 'Roll No',
      key: 'rollNo',
      render: (_, record) => {
        const student = students.find(s => s.user_id === record.student_id);
        return student?.roll_no || '-';
      },
    },
    {
      title: 'Class',
      key: 'class',
      render: (_, record) => {
        const classInfo = classes.find(c => c.id === record.class_id);
        return classInfo ? `${classInfo.name} (Grade ${classInfo.grade})` : 'Unknown';
      },
      sorter: (a, b) => {
        const classA = classes.find(c => c.id === a.class_id);
        const classB = classes.find(c => c.id === b.class_id);
        const nameA = classA ? classA.name : '';
        const nameB = classB ? classB.name : '';
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: AttendanceStatus, record) => renderStatusTag(status, record.date),
      filters: [
        { text: 'Present', value: 'Present' },
        { text: 'Absent', value: 'Absent' },
        { text: 'Late', value: 'Late' },
        { text: 'Excused', value: 'Excused' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason?: string) => reason || '-',
    },
    {
      title: 'Teacher',
      key: 'teacher',
      render: (_, record) => {
        const teacher = teachers.find(t => t.user_id === record.teacher_id);
        return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown';
      },
      sorter: (a, b) => {
        const teacherA = teachers.find(t => t.user_id === a.teacher_id);
        const teacherB = teachers.find(t => t.user_id === b.teacher_id);
        const nameA = teacherA ? `${teacherA.first_name} ${teacherA.last_name}` : '';
        const nameB = teacherB ? `${teacherB.first_name} ${teacherB.last_name}` : '';
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: 'Recorded At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY HH:mm'),
      sorter: (a, b) => dayjs(a.created_at).isBefore(dayjs(b.created_at)) ? -1 : 1,
    },
  ];

  // Enhanced Export to PDF function with term-based reporting
  const exportToPDF = async (termSpecific = false) => {
    try {
      setLoading(prev => ({ ...prev, export: true }));
      
      // Create a new jsPDF instance
      const doc = new jsPDF();
      
      // Helper function to add a new page if needed
      const checkPageSpace = (requiredSpace = 20) => {
        if (doc.internal.pageSize.height - (doc.lastAutoTable?.finalY || 0) < requiredSpace) {
          doc.addPage();
          return 20; // Reset Y position for new page
        }
        return (doc.lastAutoTable?.finalY || 0) + 10;
      };
      
      // Color scheme
      const colors = {
        primary: [41, 128, 185] as [number, number, number],
        success: [82, 196, 26] as [number, number, number],
        warning: [250, 173, 20] as [number, number, number],
        danger: [245, 34, 45] as [number, number, number],
        info: [24, 144, 255] as [number, number, number],
        gray: [128, 128, 128] as [number, number, number]
      };
      
      let yPosition = 20;
      
      // HEADER SECTION
      doc.setFontSize(20);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      
      if (termSpecific && currentTerm) {
        doc.text(`${currentTerm.name.toUpperCase()} ATTENDANCE REPORT`, 105, yPosition, { align: 'center' });
      } else {
        doc.text('ATTENDANCE ANALYTICS REPORT', 105, yPosition, { align: 'center' });
      }
      
      yPosition += 15;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Generated on: ${dayjs().format('MMMM DD, YYYY at HH:mm:ss')}`, 105, yPosition, { align: 'center' });
      
      yPosition += 20;
      
      // ACADEMIC PERIOD INFO
      if (currentAcademicYear) {
        doc.setFontSize(12);
        doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
        doc.text(
          `Academic Year: ${currentAcademicYear.name} (${dayjs(currentAcademicYear.start_date).format('MMM D, YYYY')} - ${dayjs(currentAcademicYear.end_date).format('MMM D, YYYY')})`, 
          14, 
          yPosition
        );
        
        if (currentTerm) {
          doc.text(
            `Current Term: ${currentTerm.name} (${dayjs(currentTerm.start_date).format('MMM D, YYYY')} - ${dayjs(currentTerm.end_date).format('MMM D, YYYY')})`, 
            14, 
            yPosition + 5
          );
        }
        
        yPosition += 15;
      }
      
      // FILTER SUMMARY SECTION
      doc.setFontSize(14);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text('APPLIED FILTERS', 14, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      // Date range or term filter
      if (termSpecific && currentTerm) {
        doc.text(`Term: ${currentTerm.name}`, 20, yPosition);
        yPosition += 6;
        doc.text(`Date Range: ${dayjs(currentTerm.start_date).format('MMM D, YYYY')} to ${dayjs(currentTerm.end_date).format('MMM D, YYYY')}`, 20, yPosition);
        yPosition += 6;
      } else if (dateRange) {
        const [start, end] = dateRange;
        doc.text(`Date Range: ${start.format('MMM DD, YYYY')} to ${end.format('MMM DD, YYYY')}`, 20, yPosition);
        yPosition += 6;
      } else {
        doc.text('Date Range: All available dates', 20, yPosition);
        yPosition += 6;
      }
      
      // Class filter
      if (selectedClass) {
        const classInfo = classes.find(c => c.id === selectedClass);
        doc.text(`Class: ${classInfo ? `${classInfo.name} (Grade ${classInfo.grade})` : selectedClass}`, 20, yPosition);
        yPosition += 6;
      } else {
        doc.text('Class: All classes', 20, yPosition);
        yPosition += 6;
      }
      
      // Teacher filter
      if (selectedTeacher) {
        const teacher = teachers.find(t => t.user_id === selectedTeacher);
        doc.text(`Teacher: ${teacher ? `${teacher.first_name} ${teacher.last_name}` : selectedTeacher}`, 20, yPosition);
        yPosition += 6;
      } else {
        doc.text('Teacher: All teachers', 20, yPosition);
        yPosition += 6;
      }
      
      // Status filter
      if (selectedStatus) {
        doc.text(`Status Filter: ${selectedStatus}`, 20, yPosition);
        yPosition += 6;
      } else {
        doc.text('Status Filter: All statuses', 20, yPosition);
        yPosition += 6;
      }
      
      // Search query
      if (searchQuery) {
        doc.text(`Search Query: "${searchQuery}"`, 20, yPosition);
        yPosition += 6;
      }
      
      yPosition += 15;
      
      // EXECUTIVE SUMMARY SECTION
      doc.setFontSize(14);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text('EXECUTIVE SUMMARY', 14, yPosition);
      yPosition += 10;
      
      // Summary statistics table
      const summaryData = [
        ['Total Records', stats.totalRecords.toString()],
        ['Present', `${stats.presentCount} (${stats.presentPercentage}%)`],
        ['Absent', `${stats.absentCount} (${stats.absentPercentage}%)`],
        ['Late', `${stats.lateCount} (${stats.latePercentage}%)`],
        ['Excused', `${stats.excusedCount} (${stats.excusedPercentage}%)`]
      ];
      
      autoTable(doc, {
        head: [['Metric', 'Value']],
        body: summaryData,
        startY: yPosition,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { 
          fillColor: colors.primary,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { cellWidth: 60 }
        },
        margin: { left: 14, right: 14 }
      });
      
      yPosition = checkPageSpace();
      
      // HOLIDAYS AND SPECIAL EVENTS SECTION
      if (!termSpecific) {
        doc.setFontSize(14);
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.text('HOLIDAYS & SPECIAL EVENTS', 14, yPosition);
        yPosition += 10;
        
        // Holidays during this period
        const filteredHolidays = schoolHolidays.filter(holiday => {
          if (!dateRange && !selectedTerm) return true;
          
          if (selectedTerm) {
            const term = academicTerms.find(t => t.id === selectedTerm);
            if (!term) return false;
            return dayjs(holiday.start_date).isBetween(term.start_date, term.end_date, null, '[]') ||
                   dayjs(holiday.end_date).isBetween(term.start_date, term.end_date, null, '[]');
          }
          
          if (dateRange) {
            const [start, end] = dateRange;
            return dayjs(holiday.start_date).isBetween(start, end, null, '[]') ||
                   dayjs(holiday.end_date).isBetween(start, end, null, '[]');
          }
          
          return false;
        });
        
        if (filteredHolidays.length > 0) {
          const holidaysData = filteredHolidays.map(holiday => [
            holiday.name,
            dayjs(holiday.start_date).format('MMM D, YYYY'),
            dayjs(holiday.end_date).format('MMM D, YYYY'),
            holiday.is_recurring ? 'Yes' : 'No',
            holiday.recurring_pattern || '-'
          ]);
          
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text('Holidays/Breaks:', 20, yPosition);
          yPosition += 6;
          
          autoTable(doc, {
            head: [['Name', 'Start Date', 'End Date', 'Recurring', 'Pattern']],
            body: holidaysData,
            startY: yPosition,
            theme: 'striped',
            styles: { fontSize: 9 },
            headStyles: { 
              fillColor: colors.warning,
              textColor: [255, 255, 255],
              fontStyle: 'bold'
            },
            columnStyles: {
              3: { cellWidth: 20 },
              4: { cellWidth: 30 }
            },
            margin: { left: 14, right: 14 }
          });
          
          yPosition = checkPageSpace();
        }
        
        // Events during this period
        const filteredEvents = schoolEvents.filter(event => {
          if (!dateRange && !selectedTerm) return true;
          
          if (selectedTerm) {
            const term = academicTerms.find(t => t.id === selectedTerm);
            if (!term) return false;
            return dayjs(event.event_date).isBetween(term.start_date, term.end_date, null, '[]');
          }
          
          if (dateRange) {
            const [start, end] = dateRange;
            return dayjs(event.event_date).isBetween(start, end, null, '[]');
          }
          
          return false;
        });
        
        if (filteredEvents.length > 0) {
          const eventsData = filteredEvents.map(event => [
            event.name,
            event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1).replace('_', ' '),
            dayjs(event.event_date).format('MMM D, YYYY'),
            event.affects_attendance ? 'Yes' : 'No'
          ]);
          
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text('Special Events:', 20, yPosition);
          yPosition += 6;
          
          autoTable(doc, {
            head: [['Name', 'Type', 'Date', 'Affects Attendance']],
            body: eventsData,
            startY: yPosition,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { 
              fillColor: colors.success,
              textColor: [255, 255, 255],
              fontStyle: 'bold'
            },
            columnStyles: {
              3: { cellWidth: 25 }
            },
            didParseCell: function(data) {
              if (data.column.index === 3 && data.cell.text[0] === 'Yes') {
                data.cell.styles.textColor = colors.danger;
                data.cell.styles.fontStyle = 'bold';
              }
            },
            margin: { left: 14, right: 14 }
          });
          
          yPosition = checkPageSpace();
        }
      }
      
      // ATTENDANCE TRENDS SECTION
      doc.setFontSize(14);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text('ATTENDANCE TRENDS', 14, yPosition);
      yPosition += 10;
      
      // Daily attendance summary (last 10 days with data)
      const recentTrends = lineChartData.slice(-10).map(day => [
        dayjs(day.date).format('MMM DD'),
        day.Present.toString(),
        day.Absent.toString(),
        day.Late.toString(),
        day.Excused.toString(),
        (day.Present + day.Absent + day.Late + day.Excused).toString(),
        day.isHoliday ? 'Yes' : 'No',
        day.event ? day.event.name : '-'
      ]);
      
      if (recentTrends.length > 0) {
        autoTable(doc, {
          head: [['Date', 'Present', 'Absent', 'Late', 'Excused', 'Total', 'Holiday', 'Event']],
          body: recentTrends,
          startY: yPosition,
          theme: 'striped',
          styles: { fontSize: 9, textColor: [0, 0, 0] },
          headStyles: { 
            fillColor: colors.info,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: { fillColor: [249, 249, 249] },
          columnStyles: {
            6: { cellWidth: 15 },
            7: { cellWidth: 30 }
          },
          didParseCell: function(data) {
            if (data.column.index === 6 && data.cell.text[0] === 'Yes') {
              data.cell.styles.textColor = colors.warning;
              data.cell.styles.fontStyle = 'bold';
            }
          },
          margin: { left: 14, right: 14 }
        });
        
        yPosition = checkPageSpace();
      }
      
      // CLASS PERFORMANCE SECTION
      if (classStats.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.text('CLASS PERFORMANCE ANALYSIS', 14, yPosition);
        yPosition += 10;
        
        const classPerformanceData = classStats.map(cls => [
          `${cls.className} (Grade ${cls.grade})`,
          cls.totalCount.toString(),
          cls.presentCount.toString(),
          `${cls.percentage}%`,
          cls.percentage >= 90 ? 'Excellent' : 
          cls.percentage >= 80 ? 'Good' : 
          cls.percentage >= 70 ? 'Average' : 'Needs Improvement'
        ]);
        
        autoTable(doc, {
          head: [['Class', 'Total Records', 'Present', 'Attendance Rate', 'Performance']],
          body: classPerformanceData,
          startY: yPosition,
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { 
            fillColor: colors.success,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          columnStyles: {
            3: { fontStyle: 'bold' },
            4: { fontStyle: 'bold' }
          },
          didParseCell: function(data) {
            if (data.column.index === 4 && data.section === 'body') {
              const performance = data.cell.text[0];
              if (performance === 'Excellent') data.cell.styles.textColor = colors.success;
              else if (performance === 'Good') data.cell.styles.textColor = colors.info;
              else if (performance === 'Average') data.cell.styles.textColor = colors.warning;
              else data.cell.styles.textColor = colors.danger;
            }
          },
          margin: { left: 14, right: 14 }
        });
        
        yPosition = checkPageSpace();
      }
      
      // DETAILED RECORDS SECTION
      doc.addPage();
      yPosition = 20;
      
      doc.setFontSize(14);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text('DETAILED ATTENDANCE RECORDS', 14, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Records: ${filteredData.length}`, 14, yPosition);
      yPosition += 10;
      
      // Prepare detailed table data with holiday/event indicators
      const tableData = filteredData.map(record => {
        const student = students.find(s => s.user_id === record.student_id);
        const classInfo = classes.find(c => c.id === record.class_id);
        const teacher = teachers.find(t => t.user_id === record.teacher_id);
        const holiday = isHoliday(record.date);
        const event = getEventForDate(record.date);
        
        return [
          dayjs(record.date).format('MM/DD/YY'),
          student ? `${student.first_name} ${student.last_name}` : 'Unknown',
          student?.roll_no || '-',
          classInfo ? `${classInfo.name}` : 'Unknown',
          record.status,
          record.reason || '-',
          teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown',
          holiday ? 'Yes' : 'No',
          event ? `${event.name} (${event.event_type.replace('_', ' ')})` : '-'
        ];
      });
      
      // Add detailed records table
      autoTable(doc, {
        head: [['Date', 'Student', 'Roll No', 'Class', 'Status', 'Reason', 'Teacher', 'Holiday', 'Event']],
        body: tableData,
        startY: yPosition,
        styles: { 
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: { 
          fillColor: colors.primary,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 30 },
          2: { cellWidth: 15 },
          3: { cellWidth: 20 },
          4: { cellWidth: 15 },
          5: { cellWidth: 25 },
          6: { cellWidth: 30 },
          7: { cellWidth: 15 },
          8: { cellWidth: 30 }
        },
        didParseCell: function(data) {
          // Color status cells
          if (data.column.index === 4 && data.section === 'body') {
            const status = data.cell.text[0].toLowerCase();
            if (status === 'present') data.cell.styles.textColor = colors.success;
            else if (status === 'absent') data.cell.styles.textColor = colors.danger;
            else if (status === 'late') data.cell.styles.textColor = colors.warning;
            else if (status === 'excused') data.cell.styles.textColor = colors.info;
          }
          
          // Highlight holiday cells
          if (data.column.index === 7 && data.cell.text[0] === 'Yes') {
            data.cell.styles.textColor = colors.warning;
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: 14, right: 14 },
        theme: 'striped',
        alternateRowStyles: { fillColor: [249, 249, 249] }
      });
      
      // FOOTER
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
        
        // Page number
        doc.text(`Page ${i} of ${totalPages}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
        
        // Footer text
        doc.text('Generated by School Management System', 14, doc.internal.pageSize.height - 10);
        doc.text(`Report Date: ${dayjs().format('MMM DD, YYYY')}`, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, { align: 'right' });
      }
      
      // Generate a more descriptive filename
      let filename;
      if (termSpecific && currentTerm) {
        filename = `Term_Attendance_Report_${currentTerm.name.replace(/ /g, '_')}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.pdf`;
      } else if (dateRange) {
        filename = `Attendance_Report_${dateRange[0].format('YYYY-MM-DD')}_to_${dateRange[1].format('YYYY-MM-DD')}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.pdf`;
      } else {
        filename = `Attendance_Report_All_Records_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.pdf`;
      }
      
      doc.save(filename);
      
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to export data: ' + (typeof err === 'object' && err !== null && 'message' in err ? (err as { message: string }).message : 'Unknown error'));
    } finally {
      setLoading(prev => ({ ...prev, export: false }));
    }
  };

  // Calendar management functions
  const handleOpenCalendarModal = (mode: 'year' | 'term' | 'holiday' | 'event', data?: any) => {
    setCalendarModalMode(mode);
    setCalendarFormData(data || {});
    setCalendarModalVisible(true);
  };

  const handleSaveCalendarItem = async () => {
    try {
      setLoading(prev => ({ ...prev, data: true }));
      
      let result;
      const baseData = {
        ...calendarFormData,
        school_id: schoolId,
        academic_year_id: calendarFormData.academic_year_id || currentAcademicYear?.id
      };

      switch (calendarModalMode) {
        case 'year':
          if (baseData.id) {
            result = await supabase
              .from('academic_years')
              .update(baseData)
              .eq('id', baseData.id);
          } else {
            result = await supabase
              .from('academic_years')
              .insert([baseData]);
          }
          break;
        case 'term':
          if (baseData.id) {
            result = await supabase
              .from('academic_terms')
              .update(baseData)
              .eq('id', baseData.id);
          } else {
            result = await supabase
              .from('academic_terms')
              .insert([baseData]);
          }
          break;
        case 'holiday':
          if (baseData.id) {
            result = await supabase
              .from('school_holidays')
              .update(baseData)
              .eq('id', baseData.id);
          } else {
            result = await supabase
              .from('school_holidays')
              .insert([baseData]);
          }
          break;
        case 'event':
          if (baseData.id) {
            result = await supabase
              .from('school_events')
              .update(baseData)
              .eq('id', baseData.id);
          } else {
            result = await supabase
              .from('school_events')
              .insert([baseData]);
          }
          break;
      }

      if (result.error) throw result.error;
      
      await fetchInitialData(); // Refresh all data
      setCalendarModalVisible(false);
    } catch (err) {
      console.error('Error saving calendar item:', err);
      setError('Failed to save calendar item. See console for details.');
    } finally {
      setLoading(prev => ({ ...prev, data: false }));
    }
  };

  const handleSetCurrentAcademicYear = async (yearId: string) => {
    try {
      setLoading(prev => ({ ...prev, data: true }));
      
      // First set all years to not current
      await supabase
        .from('academic_years')
        .update({ is_current: false })
        .eq('school_id', schoolId);
      
      // Then set the selected year as current
      const { error } = await supabase
        .from('academic_years')
        .update({ is_current: true })
        .eq('id', yearId);
      
      if (error) throw error;
      
      await fetchInitialData(); // Refresh data
    } catch (err) {
      console.error('Error setting current academic year:', err);
      setError('Failed to set current academic year');
    } finally {
      setLoading(prev => ({ ...prev, data: false }));
    }
  };

  const handleSetCurrentTerm = async (termId: string) => {
    try {
      setLoading(prev => ({ ...prev, data: true }));
      
      const term = academicTerms.find(t => t.id === termId);
      if (!term) throw new Error('Term not found');
      
      // First set all terms in the same academic year to not current
      await supabase
        .from('academic_terms')
        .update({ is_current: false })
        .eq('academic_year_id', term.academic_year_id);
      
      // Then set the selected term as current
      const { error } = await supabase
        .from('academic_terms')
        .update({ is_current: true })
        .eq('id', termId);
      
      if (error) throw error;
      
      await fetchInitialData(); // Refresh data
    } catch (err) {
      console.error('Error setting current term:', err);
      setError('Failed to set current term');
    } finally {
      setLoading(prev => ({ ...prev, data: false }));
    }
  };

  // Initialize component
  useEffect(() => {
    checkConnectionAndFetchData();
  }, [schoolId]);

  // Render calendar management dropdown
  const renderCalendarManagementDropdown = () => (
    <Dropdown
      menu={{
        items: [
          {
            key: 'manage_calendar',
            label: 'Manage School Calendar',
            icon: <CalendarOutlined />,
            children: [
              {
                key: 'add_year',
                label: 'Add Academic Year',
                icon: <PlusOutlined />,
                onClick: () => handleOpenCalendarModal('year')
              },
              {
                key: 'add_term',
                label: 'Add Term/Semester',
                icon: <PlusOutlined />,
                onClick: () => handleOpenCalendarModal('term'),
                disabled: !currentAcademicYear
              },
              {
                key: 'add_holiday',
                label: 'Add Holiday/Break',
                icon: <PlusOutlined />,
                onClick: () => handleOpenCalendarModal('holiday'),
                disabled: !currentAcademicYear
              },
              {
                key: 'add_event',
                label: 'Add School Event',
                icon: <PlusOutlined />,
                onClick: () => handleOpenCalendarModal('event'),
                disabled: !currentAcademicYear
              }
            ]
          },
          {
            key: 'current_year',
            label: 'Set Current Academic Year',
            icon: <CheckOutlined />,
            children: academicYears.map(year => ({
              key: `year_${year.id}`,
              label: year.name,
              icon: year.is_current ? <CheckOutlined /> : null,
              onClick: () => handleSetCurrentAcademicYear(year.id)
            }))
          },
          {
            key: 'current_term',
            label: 'Set Current Term',
            icon: <CheckOutlined />,
            disabled: !currentAcademicYear,
            children: currentAcademicYear ? 
              academicTerms
                .filter(term => term.academic_year_id === currentAcademicYear.id)
                .map(term => ({
                  key: `term_${term.id}`,
                  label: term.name,
                  icon: term.is_current ? <CheckOutlined /> : null,
                  onClick: () => handleSetCurrentTerm(term.id)
                })) : []
          }
        ]
      }}
    >
      <Button icon={<CalendarOutlined />}>
        Calendar Management
      </Button>
    </Dropdown>
  );

  // Render calendar modal
  const renderCalendarModal = () => (
    <Modal
      title={
        calendarModalMode === 'year' ? 'Academic Year' :
        calendarModalMode === 'term' ? 'Academic Term' :
        calendarModalMode === 'holiday' ? 'School Holiday' :
        'School Event'
      }
      open={calendarModalVisible}
      onOk={handleSaveCalendarItem}
      onCancel={() => setCalendarModalVisible(false)}
      confirmLoading={loading.data}
      width={600}
    >
      <Form layout="vertical">
        {calendarModalMode === 'year' && (
          <>
            <Form.Item label="Year Name">
              <Input
                value={calendarFormData.name || ''}
                onChange={e => setCalendarFormData({...calendarFormData, name: e.target.value})}
              />
            </Form.Item>
            <Form.Item label="Description">
              <Input.TextArea
                value={calendarFormData.description || ''}
                onChange={e => setCalendarFormData({...calendarFormData, description: e.target.value})}
              />
            </Form.Item>
            <Form.Item label="Start Date" required>
              <DatePicker
                value={calendarFormData.start_date ? dayjs(calendarFormData.start_date) : null}
                onChange={date => setCalendarFormData({
                  ...calendarFormData, 
                  start_date: date?.format('YYYY-MM-DD')
                })}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="End Date" required>
              <DatePicker
                value={calendarFormData.end_date ? dayjs(calendarFormData.end_date) : null}
                onChange={date => setCalendarFormData({
                  ...calendarFormData, 
                  end_date: date?.format('YYYY-MM-DD')
                })}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item>
              <Checkbox
                checked={!!calendarFormData.is_current}
                onChange={e => setCalendarFormData({
                  ...calendarFormData, 
                  is_current: e.target.checked
                })}
              >
                Set as current academic year
              </Checkbox>
            </Form.Item>
          </>
        )}
        
        {calendarModalMode === 'term' && (
          <>
            <Form.Item label="Academic Year" required>
              <Select
                value={calendarFormData.academic_year_id || currentAcademicYear?.id}
                onChange={value => setCalendarFormData({
                  ...calendarFormData, 
                  academic_year_id: value
                })}
                options={academicYears.map(year => ({
                  value: year.id,
                  label: year.name
                }))}
              />
            </Form.Item>
            <Form.Item label="Term Name">
              <Input
                value={calendarFormData.name || ''}
                onChange={e => setCalendarFormData({...calendarFormData, name: e.target.value})}
              />
            </Form.Item>
            <Form.Item label="Term Type">
              <Select
                value={calendarFormData.term_type || 'semester'}
                onChange={value => setCalendarFormData({
                  ...calendarFormData, 
                  term_type: value as any
                })}
                options={[
                  { value: 'semester', label: 'Semester' },
                  { value: 'trimester', label: 'Trimester' },
                  { value: 'quarter', label: 'Quarter' },
                  { value: 'term', label: 'Term' }
                ]}
              />
            </Form.Item>
            <Form.Item label="Start Date" required>
              <DatePicker
                value={calendarFormData.start_date ? dayjs(calendarFormData.start_date) : null}
                onChange={date => setCalendarFormData({
                  ...calendarFormData, 
                  start_date: date?.format('YYYY-MM-DD')
                })}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="End Date" required>
              <DatePicker
                value={calendarFormData.end_date ? dayjs(calendarFormData.end_date) : null}
                onChange={date => setCalendarFormData({
                  ...calendarFormData, 
                  end_date: date?.format('YYYY-MM-DD')
                })}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item>
              <Checkbox
                checked={!!calendarFormData.is_current}
                onChange={e => setCalendarFormData({
                  ...calendarFormData, 
                  is_current: e.target.checked
                })}
              >
                Set as current term
              </Checkbox>
            </Form.Item>
          </>
        )}
        
        {calendarModalMode === 'holiday' && (
          <>
            <Form.Item label="Academic Year" required>
              <Select
                value={calendarFormData.academic_year_id || currentAcademicYear?.id}
                onChange={value => setCalendarFormData({
                  ...calendarFormData, 
                  academic_year_id: value
                })}
                options={academicYears.map(year => ({
                  value: year.id,
                  label: year.name
                }))}
              />
            </Form.Item>
            <Form.Item label="Holiday Name">
              <Input
                value={calendarFormData.name || ''}
                onChange={e => setCalendarFormData({...calendarFormData, name: e.target.value})}
              />
            </Form.Item>
            <Form.Item label="Description">
              <Input.TextArea
                value={calendarFormData.description || ''}
                onChange={e => setCalendarFormData({...calendarFormData, description: e.target.value})}
              />
            </Form.Item>
            <Form.Item label="Start Date" required>
              <DatePicker
                value={calendarFormData.start_date ? dayjs(calendarFormData.start_date) : null}
                onChange={date => setCalendarFormData({
                  ...calendarFormData, 
                  start_date: date?.format('YYYY-MM-DD')
                })}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="End Date" required>
              <DatePicker
                value={calendarFormData.end_date ? dayjs(calendarFormData.end_date) : null}
                onChange={date => setCalendarFormData({
                  ...calendarFormData, 
                  end_date: date?.format('YYYY-MM-DD')
                })}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item>
              <Checkbox
                checked={!!calendarFormData.is_recurring}
                onChange={e => setCalendarFormData({
                  ...calendarFormData, 
                  is_recurring: e.target.checked
                })}
              >
                Recurring holiday
              </Checkbox>
            </Form.Item>
            {calendarFormData.is_recurring && (
              <Form.Item label="Recurring Pattern">
                <Input
                  value={calendarFormData.recurring_pattern || ''}
                  onChange={e => setCalendarFormData({
                    ...calendarFormData, 
                    recurring_pattern: e.target.value
                  })}
                  placeholder="e.g., 'Every year', 'Every last Monday of September'"
                />
              </Form.Item>
            )}
          </>
        )}
        
        {calendarModalMode === 'event' && (
          <>
            <Form.Item label="Academic Year" required>
              <Select
                value={calendarFormData.academic_year_id || currentAcademicYear?.id}
                onChange={value => setCalendarFormData({
                  ...calendarFormData, 
                  academic_year_id: value
                })}
                options={academicYears.map(year => ({
                  value: year.id,
                  label: year.name
                }))}
              />
            </Form.Item>
            <Form.Item label="Event Name">
              <Input
                value={calendarFormData.name || ''}
                onChange={e => setCalendarFormData({...calendarFormData, name: e.target.value})}
              />
            </Form.Item>
            <Form.Item label="Description">
              <Input.TextArea
                value={calendarFormData.description || ''}
                onChange={e => setCalendarFormData({...calendarFormData, description: e.target.value})}
              />
            </Form.Item>
            <Form.Item label="Event Date" required>
              <DatePicker
                value={calendarFormData.event_date ? dayjs(calendarFormData.event_date) : null}
                onChange={date => setCalendarFormData({
                  ...calendarFormData, 
                  event_date: date?.format('YYYY-MM-DD')
                })}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="Event Type">
              <Select
                value={calendarFormData.event_type || 'other'}
                onChange={value => setCalendarFormData({
                  ...calendarFormData, 
                  event_type: value as any
                })}
                options={[
                  { value: 'exam', label: 'Exam' },
                  { value: 'sports_day', label: 'Sports Day' },
                  { value: 'cultural_event', label: 'Cultural Event' },
                  { value: 'parent_meeting', label: 'Parent Meeting' },
                  { value: 'teacher_training', label: 'Teacher Training' },
                  { value: 'other', label: 'Other' }
                ]}
              />
            </Form.Item>
            <Form.Item>
              <Checkbox
                checked={!!calendarFormData.affects_attendance}
                onChange={e => setCalendarFormData({
                  ...calendarFormData, 
                  affects_attendance: e.target.checked
                })}
              >
                Affects attendance records
              </Checkbox>
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );

  // Render academic period info
  const renderAcademicPeriodInfo = () => (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-4">
        {currentAcademicYear && (
          <Tag color="blue" icon={<CalendarOutlined />}>
            Academic Year: {currentAcademicYear.name} (
              {dayjs(currentAcademicYear.start_date).format('MMM D, YYYY')} - 
              {dayjs(currentAcademicYear.end_date).format('MMM D, YYYY')}
            )
          </Tag>
        )}
        {currentTerm && (
          <Tag color="geekblue" icon={<CalendarOutlined />}>
            Current Term: {currentTerm.name} (
              {dayjs(currentTerm.start_date).format('MMM D, YYYY')} - 
              {dayjs(currentTerm.end_date).format('MMM D, YYYY')}
            )
          </Tag>
        )}
      </div>
    </div>
  );

  // Connection error UI
  if (connectionError) {
    return (
      <div className="admin-attendance-viewer">
        <Card>
          <Alert
            message="Connection Error"
            description="Unable to connect to the server. Please check your internet connection and try again."
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            action={
              <Button 
                type="primary" 
                onClick={checkConnectionAndFetchData}
                loading={loading.connection}
              >
                Retry Connection
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading.initial) {
    return (
      <div className="admin-attendance-viewer">
        <Card>
          <div className="flex justify-center items-center h-64">
            <Spin size="large" tip="Loading attendance data..." />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-attendance-viewer">
      {/* Add the calendar modal */}
      {renderCalendarModal()}
      
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CalendarOutlined className="mr-2 text-xl text-blue-500" />
              <span className="text-lg font-semibold">Attendance Analytics</span>
            </div>
            <div className="flex items-center space-x-2">
              {/* Add the calendar management dropdown */}
              {renderCalendarManagementDropdown()}
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'export_full',
                      label: 'Export Full Report',
                      icon: <FilePdfOutlined />,
                      onClick: () => exportToPDF(false)
                    },
                    {
                      key: 'export_term',
                      label: 'Export Term Report',
                      icon: <FilePdfOutlined />,
                      disabled: !currentTerm,
                      onClick: () => exportToPDF(true)
                    }
                  ]
                }}
              >
                <Button 
                  type="primary" 
                  icon={<FilePdfOutlined />} 
                  loading={loading.export}
                >
                  Export PDF
                </Button>
              </Dropdown>
            </div>
          </div>
        }
      >
        {error && (
          <Alert message={error} type="error" showIcon className="mb-4" />
        )}

        {/* Add academic period info */}
        {renderAcademicPeriodInfo()}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Date Range</label>
            <Space direction="vertical" style={{ width: '100%' }}>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(dates) => {
                  if (!dates || dates[0] === null || dates[1] === null) {
                    setDateRange(null);
                  } else {
                    setDateRange([dates[0], dates[1]]);
                    setSelectedTerm(null);
                  }
                }}
                disabledDate={(current) => current && current > dayjs().endOf('day')}
              />
              <Space>
                <Button 
                  size="small" 
                  onClick={() => handleDateRangeButtonClick('today')}
                  type={dateRange && dateRange[0].isSame(dayjs(), 'day') ? 'primary' : 'default'}
                >
                  Today
                </Button>
                <Button 
                  size="small" 
                  onClick={() => handleDateRangeButtonClick('week')}
                  type={dateRange && dateRange[0].isSame(dayjs().subtract(6, 'days'), 'day') ? 'primary' : 'default'}
                >
                  Last 7 Days
                </Button>
                <Button 
                  size="small" 
                  onClick={() => handleDateRangeButtonClick('month')}
                  type={dateRange && dateRange[0].isSame(dayjs().startOf('month'), 'day') ? 'primary' : 'default'}
                >
                  This Month
                </Button>
                <Button 
                  size="small" 
                  onClick={() => handleDateRangeButtonClick('term')}
                  type={selectedTerm === currentTerm?.id ? 'primary' : 'default'}
                  disabled={!currentTerm}
                >
                  Current Term
                </Button>
                <Button 
                  size="small" 
                  onClick={() => {
                    setDateRange(null);
                    setSelectedTerm(null);
                  }}
                  type={!dateRange && !selectedTerm ? 'primary' : 'default'}
                >
                  All Time
                </Button>
              </Space>
            </Space>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Class</label>
            <Select
              style={{ width: '100%' }}
              placeholder="All Classes"
              allowClear
              value={selectedClass}
              onChange={setSelectedClass}
              loading={loading.initial}
              disabled={loading.data}
              options={classes.map(cls => ({
                value: cls.id,
                label: `${cls.name} (Grade ${cls.grade})`
              }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Teacher</label>
            <Select
              style={{ width: '100%' }}
              placeholder="All Teachers"
              allowClear
              value={selectedTeacher}
              onChange={setSelectedTeacher}
              loading={loading.initial}
              disabled={loading.data}
              options={teachers.map(teacher => ({
                value: teacher.user_id,
                label: `${teacher.first_name} ${teacher.last_name}`
              }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <Input
              placeholder="Search students..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading.data}
              allowClear
            />
          </div>
        </div>
        
        {/* Term Filter (if current academic year has terms) */}
        {currentAcademicYear && academicTerms.filter(t => t.academic_year_id === currentAcademicYear.id).length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Filter by Term</label>
            <Select
              style={{ width: '100%' }}
              placeholder="All Terms"
              allowClear
              value={selectedTerm}
              onChange={(value) => {
                setSelectedTerm(value);
                setDateRange(null);
              }}
              loading={loading.initial}
              disabled={loading.data}
              options={[
                { value: null, label: 'All Terms' },
                ...academicTerms
                  .filter(t => t.academic_year_id === currentAcademicYear.id)
                  .map(term => ({
                    value: term.id,
                    label: `${term.name} (${dayjs(term.start_date).format('MMM D')} - ${dayjs(term.end_date).format('MMM D')})`
                  }))
              ]}
            />
          </div>
        )}
        
        {/* Status Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Filter by Status</label>
          <Select
            style={{ width: '100%' }}
            placeholder="All Statuses"
            allowClear
            value={selectedStatus}
            onChange={setSelectedStatus}
            loading={loading.initial}
            disabled={loading.data}
            options={[
              { value: 'Present', label: 'Present' },
              { value: 'Absent', label: 'Absent' },
              { value: 'Late', label: 'Late' },
              { value: 'Excused', label: 'Excused' }
            ]}
          />
        </div>
        
        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <Statistic
              title="Total Records"
              value={stats.totalRecords}
              prefix={<TeamOutlined />}
            />
          </Card>
          <Card>
            <Statistic
              title="Present"
              value={stats.presentCount}
              valueStyle={{ color: '#52c41a' }}
              suffix={`(${stats.presentPercentage}%)`}
            />
            <Progress 
              percent={stats.presentPercentage} 
              strokeColor="#52c41a" 
              showInfo={false} 
              size="small" 
            />
          </Card>
          <Card>
            <Statistic
              title="Absent"
              value={stats.absentCount}
              valueStyle={{ color: '#f5222d' }}
              suffix={`(${stats.absentPercentage}%)`}
            />
            <Progress 
              percent={stats.absentPercentage} 
              strokeColor="#f5222d" 
              showInfo={false} 
              size="small" 
            />
          </Card>
          <Card>
            <Statistic
              title="Late/Excused"
              value={stats.lateCount + stats.excusedCount}
              valueStyle={{ color: '#faad14' }}
              suffix={`(${stats.latePercentage + stats.excusedPercentage}%)`}
            />
            <Progress 
              percent={stats.latePercentage + stats.excusedPercentage} 
              strokeColor="#faad14" 
              showInfo={false} 
              size="small" 
            />
          </Card>
        </div>
        
        {/* View Mode Toggle */}
        <Tabs
          activeKey={viewMode}
          onChange={(activeKey) => setViewMode(activeKey as 'summary' | 'detailed')}
          items={[
            {
              key: 'summary',
              label: (
                <span>
                  <BarChartOutlined />
                  Summary View
                </span>
              ),
            },
            {
              key: 'detailed',
              label: (
                <span>
                  <FilterOutlined />
                  Detailed View
                </span>
              ),
            },
          ]}
          tabBarExtraContent={
            <div className="text-sm text-gray-500">
              {selectedTerm ? (
                <>
                  Showing {currentTerm?.name || 'selected term'}
                </>
              ) : dateRange ? (
                <>
                  Showing {dateRange[0].format('MMM DD')} to {dateRange[1].format('MMM DD')}
                </>
              ) : (
                'Showing all records'
              )}
            </div>
          }
          className="mb-4"
        />
        
        {viewMode === 'summary' ? (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card title="Daily Attendance Trends">
                <div style={{ height: '300px' }}>
                  {loading.data ? (
                    <div className="flex justify-center items-center h-full">
                      <Spin tip="Loading chart data..." />
                    </div>
                  ) : lineChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          content={({ payload }) => {
                            if (!payload || payload.length === 0) return null;
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-2 border border-gray-300 rounded shadow">
                                <p className="font-semibold">{dayjs(data.date).format('MMM D, YYYY')}</p>
                                <p>Present: {data.Present}</p>
                                <p>Absent: {data.Absent}</p>
                                <p>Late: {data.Late}</p>
                                <p>Excused: {data.Excused}</p>
                                {data.isHoliday && (
                                  <p className="text-orange-500">
                                    Holiday: {
                                      schoolHolidays.find(h => 
                                        dayjs(data.date).isBetween(h.start_date, h.end_date, null, '[]')
                                      )?.name
                                    }
                                  </p>
                                )}
                                {data.event && (
                                  <p className="text-purple-500">
                                    Event: {data.event.name} ({data.event.event_type.replace('_', ' ')})
                                  </p>
                                )}
                              </div>
                            );
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Present"
                          stroke="#52c41a"
                          strokeWidth={2}
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Absent"
                          stroke="#f5222d"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="Late"
                          stroke="#faad14"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="Excused"
                          stroke="#1890ff"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Empty description="No attendance data available for the selected period" />
                  )}
                </div>
              </Card>
              
              <Card title="Status Distribution">
                <div style={{ height: '300px' }}>
                  {loading.data ? (
                    <div className="flex justify-center items-center h-full">
                      <Spin tip="Loading chart data..." />
                    </div>
                  ) : barChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Empty description="No attendance data available" />
                  )}
                </div>
              </Card>
            </div>
            
            {/* Class-wise Attendance */}
            <Card title="Class-wise Attendance Statistics" className="mb-6">
              {loading.data ? (
                <div className="flex justify-center items-center h-32">
                  <Spin tip="Loading class statistics..." />
                </div>
              ) : classStats.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classStats.map(stat => (
                    <Card key={stat.classId} className="hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-lg">{stat.className}</h3>
                          <p className="text-gray-500">Grade {stat.grade}</p>
                          <div className="mt-2">
                            <span className="text-sm text-gray-600">
                              {stat.presentCount} present out of {stat.totalCount}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            count={`${stat.percentage}%`} 
                            style={{ 
                              backgroundColor: stat.percentage >= 90 ? '#52c41a' : 
                                            stat.percentage >= 75 ? '#faad14' : '#f5222d',
                              fontSize: '14px'
                            }} 
                          />
                          <Progress 
                            percent={stat.percentage} 
                            strokeColor={
                              stat.percentage >= 90 ? '#52c41a' : 
                              stat.percentage >= 75 ? '#faad14' : '#f5222d'
                            } 
                            showInfo={false} 
                            size="small" 
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description="No attendance data available for the selected filters"
                />
              )}
            </Card>
          </>
        ) : (
          /* Detailed View */
          <Card>
            {loading.data ? (
              <div className="flex justify-center items-center h-64">
                <Spin tip="Loading attendance records..." size="large" />
              </div>
            ) : filteredData.length === 0 ? (
              <Empty 
                description={
                  <span>
                    No attendance records found for the selected filters
                  </span>
                }
              />
            ) : (
              <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="id"
                loading={loading.data}
                scroll={{ x: true }}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} of ${total} records`,
                }}
              />
            )}
          </Card>
        )}
      </Card>
    </div>
  );
};

export default AdminAttendanceViewer;