import { 
  Card, 
  Statistic, 
  Progress, 
  Spin, 
  Alert, 
  Select, 
  DatePicker, 
  Button,
  Divider,
  Tooltip,
  Row,
  Col,
  Badge
} from 'antd';
import { 
  TeamOutlined, 
  FilterOutlined,
  CalendarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import dayjs from 'dayjs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
const { RangePicker } = DatePicker;
const { Option } = Select;

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  presentPercentage: number;
  absentPercentage: number;
  latePercentage: number;
  excusedPercentage: number;
  dailyTrends: { date: string; present: number; absent: number; late: number; excused: number }[];
}

interface ClassStats {
  classId: string;
  className: string;
  grade: string;
  presentCount: number;
  totalCount: number;
  percentage: number;
  changeFromLastWeek?: number;
}

interface Teacher {
  user_id: string;
  first_name: string;
  last_name: string;
}

const DashboardAttendanceSummary = ({ schoolId }: { schoolId: string }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    presentPercentage: 0,
    absentPercentage: 0,
    latePercentage: 0,
    excusedPercentage: 0,
    dailyTrends: []
  });
  const [worstClass, setWorstClass] = useState<ClassStats | null>(null);
  const [bestClass, setBestClass] = useState<ClassStats | null>(null);
  const [classes, setClasses] = useState<{id: string; name: string; grade: string}[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('week'),
    dayjs().endOf('week')
  ]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'custom'>('week');

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Format dates for query
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      // Base query
      let query = supabase
        .from('attendance_records')
        .select('*')
        .eq('school_id', schoolId)
        .gte('date', startDate)
        .lte('date', endDate);

      // Apply class filter if selected
      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }

      // Apply teacher filter if selected
      if (selectedTeacher) {
        query = query.eq('teacher_id', selectedTeacher);
      }

      // Execute query
      const { data: attendanceData, error: attendanceError } = await query;

      if (attendanceError) throw attendanceError;

      // Fetch classes if not already loaded
      if (classes.length === 0) {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, name, grade')
          .eq('school_id', schoolId);

        if (classesError) throw classesError;
        setClasses(classesData || []);
      }

      // Fetch teachers if not already loaded
      if (teachers.length === 0) {
        const { data: teachersData, error: teachersError } = await supabase
          .from('teachers')
          .select('user_id, first_name, last_name')
          .eq('school_id', schoolId);

        if (teachersError) throw teachersError;
        setTeachers(teachersData || []);
      }

      // Calculate stats
      const totalRecords = attendanceData?.length || 0;
      const presentCount = attendanceData?.filter(r => r.status === 'Present').length || 0;
      const absentCount = attendanceData?.filter(r => r.status === 'Absent').length || 0;
      const lateCount = attendanceData?.filter(r => r.status === 'Late').length || 0;
      const excusedCount = attendanceData?.filter(r => r.status === 'Excused').length || 0;

      // Calculate daily trends
      const dailyTrendsMap: Record<string, {present: number; absent: number; late: number; excused: number}> = {};
      attendanceData?.forEach(record => {
        if (!dailyTrendsMap[record.date]) {
          dailyTrendsMap[record.date] = { present: 0, absent: 0, late: 0, excused: 0 };
        }
        dailyTrendsMap[record.date][record.status.toLowerCase() as keyof typeof dailyTrendsMap[string]]++;
      });

      const dailyTrends = Object.entries(dailyTrendsMap)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1);

      const newStats: AttendanceStats = {
        total: totalRecords,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
        presentPercentage: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0,
        absentPercentage: totalRecords > 0 ? Math.round((absentCount / totalRecords) * 100) : 0,
        latePercentage: totalRecords > 0 ? Math.round((lateCount / totalRecords) * 100) : 0,
        excusedPercentage: totalRecords > 0 ? Math.round((excusedCount / totalRecords) * 100) : 0,
        dailyTrends
      };

      setStats(newStats);

      // Calculate class stats if we have data and no class filter is applied
      if (classes.length > 0 && attendanceData?.length && !selectedClass) {
        const classStats = classes.map(cls => {
          const classRecords = attendanceData.filter(record => record.class_id === cls.id);
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
        }).filter(stat => stat.totalCount > 0);

        if (classStats.length > 0) {
          // Sort by percentage to find best and worst
          const sorted = [...classStats].sort((a, b) => a.percentage - b.percentage);
          setWorstClass(sorted[0]);
          setBestClass(sorted[sorted.length - 1]);

          // If we have data from last week, calculate changes
          if (timeRange === 'week') {
            const lastWeekStart = dayjs().subtract(1, 'week').startOf('week').format('YYYY-MM-DD');
            const lastWeekEnd = dayjs().subtract(1, 'week').endOf('week').format('YYYY-MM-DD');
            
            const { data: lastWeekData } = await supabase
              .from('attendance_records')
              .select('*')
              .eq('school_id', schoolId)
              .gte('date', lastWeekStart)
              .lte('date', lastWeekEnd);

            if (lastWeekData) {
              const lastWeekClassStats = classes.map(cls => {
                const classRecords = lastWeekData.filter(record => record.class_id === cls.id);
                const presentCount = classRecords.filter(r => r.status === 'Present').length;
                const totalCount = classRecords.length;
                const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
                return { classId: cls.id, percentage };
              });

              // Update best and worst with change data
              setBestClass(prev => {
                if (!prev) return null;
                const lastWeekStat = lastWeekClassStats.find(s => s.classId === prev.classId);
                const change = lastWeekStat ? prev.percentage - lastWeekStat.percentage : undefined;
                return { ...prev, changeFromLastWeek: change };
              });

              setWorstClass(prev => {
                if (!prev) return null;
                const lastWeekStat = lastWeekClassStats.find(s => s.classId === prev.classId);
                const change = lastWeekStat ? prev.percentage - lastWeekStat.percentage : undefined;
                return { ...prev, changeFromLastWeek: change };
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError('Failed to load attendance data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [dateRange, selectedClass, selectedTeacher]);

  const handleTimeRangeChange = (range: 'week' | 'month' | 'custom') => {
    setTimeRange(range);
    if (range === 'week') {
      setDateRange([dayjs().startOf('week'), dayjs().endOf('week')]);
    } else if (range === 'month') {
      setDateRange([dayjs().startOf('month'), dayjs().endOf('month')]);
    }
    // For 'custom', the user will use the date picker
  };

  const renderChangeIndicator = (change?: number) => {
    if (change === undefined) return null;
    
    const isPositive = change >= 0;
    const icon = isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />;
    const color = isPositive ? '#52c41a' : '#f5222d';
    
    return (
      <span style={{ color, marginLeft: 8 }}>
        {icon} {Math.abs(change)}%
      </span>
    );
  };

  const dailyChartData = useMemo(() => {
    return stats.dailyTrends.map(day => ({
      date: dayjs(day.date).format('MMM DD'),
      Present: day.present,
      Absent: day.absent,
      Late: day.late,
      Excused: day.excused
    }));
  }, [stats.dailyTrends]);

  return (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <CalendarOutlined className="mr-2 text-blue-500" />
            Attendance Analytics
          </span>
          <div className="flex items-center space-x-2">
            <Button 
              type={timeRange === 'week' ? 'primary' : 'default'} 
              size="small"
              onClick={() => handleTimeRangeChange('week')}
            >
              This Week
            </Button>
            <Button 
              type={timeRange === 'month' ? 'primary' : 'default'} 
              size="small"
              onClick={() => handleTimeRangeChange('month')}
            >
              This Month
            </Button>
            <Button 
              type={timeRange === 'custom' ? 'primary' : 'default'} 
              size="small"
              onClick={() => handleTimeRangeChange('custom')}
              icon={<FilterOutlined />}
            >
              Custom
            </Button>
          </div>
        </div>
      }
      className="h-full"
      extra={
        timeRange === 'custom' && (
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]]);
              }
            }}
            disabledDate={(current) => current && current > dayjs().endOf('day')}
            size="small"
          />
        )
      }
    >
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Spin tip="Loading attendance data..." />
        </div>
      ) : error ? (
        <Alert message={error} type="error" showIcon />
      ) : (
        <>
          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Select
              placeholder="Filter by Class"
              allowClear
              style={{ width: '100%' }}
              value={selectedClass}
              onChange={setSelectedClass}
              loading={loading}
              disabled={loading}
            >
              {classes.map(cls => (
                <Option key={cls.id} value={cls.id}>
                  {cls.name} (Grade {cls.grade})
                </Option>
              ))}
            </Select>

            <Select
              placeholder="Filter by Teacher"
              allowClear
              style={{ width: '100%' }}
              value={selectedTeacher}
              onChange={setSelectedTeacher}
              loading={loading}
              disabled={loading}
            >
              {teachers.map(teacher => (
                <Option key={teacher.user_id} value={teacher.user_id}>
                  {teacher.first_name} {teacher.last_name}
                </Option>
              ))}
            </Select>

            <div className="flex items-center">
              <Tooltip title="Date range being analyzed">
                <span className="text-gray-500 mr-2">
                  <CalendarOutlined /> {dateRange[0].format('MMM DD')} - {dateRange[1].format('MMM DD')}
                </span>
              </Tooltip>
              <Badge 
                count={`${stats.total} records`} 
                style={{ backgroundColor: '#1890ff' }} 
              />
            </div>
          </div>

          {/* Summary Statistics */}
          <Row gutter={16} className="mb-6">
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Total Records"
                  value={stats.total}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Present"
                  value={stats.present}
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
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Absent"
                  value={stats.absent}
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
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Late/Excused"
                  value={stats.late + stats.excused}
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
            </Col>
          </Row>

          {/* Main Content */}
          <Row gutter={16}>
            <Col xs={24} lg={16}>
              {/* Daily Trends Chart */}
              <Card 
                title="Daily Attendance Trends" 
                size="small"
                className="mb-4"
                extra={
                  <Tooltip title="Shows daily attendance patterns over the selected period">
                    <InfoCircleOutlined className="text-gray-400" />
                  </Tooltip>
                }
              >
                <div style={{ height: 250 }}>
                  {stats.dailyTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="Present" stackId="a" fill="#52c41a" name="Present" />
                        <Bar dataKey="Late" stackId="a" fill="#faad14" name="Late" />
                        <Bar dataKey="Excused" stackId="a" fill="#1890ff" name="Excused" />
                        <Bar dataKey="Absent" stackId="a" fill="#f5222d" name="Absent" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full text-gray-400">
                      No attendance data for selected period
                    </div>
                  )}
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              {/* Overall Attendance */}
              <Card 
                title="Overall Attendance Rate" 
                size="small"
                className="mb-4"
              >
                <Progress 
                  percent={stats.presentPercentage} 
                  strokeColor={
                    stats.presentPercentage >= 90 ? '#52c41a' : 
                    stats.presentPercentage >= 75 ? '#faad14' : '#f5222d'
                  } 
                  status="active"
                  format={percent => (
                    <div className="text-center">
                      <div className="text-2xl font-bold">{percent}%</div>
                      <div className="text-gray-500">Attendance Rate</div>
                    </div>
                  )}
                  style={{ marginBottom: 16 }}
                />
                <div className="text-sm text-gray-500 text-center">
                  {stats.present} present out of {stats.total} records
                </div>
              </Card>

              {/* Class Performance */}
              {(!selectedClass && (bestClass || worstClass)) && (
                <Card 
                  title="Class Performance" 
                  size="small"
                >
                  {bestClass && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">Top Class</span>
                        <span className="font-bold">
                          {bestClass.percentage}%
                          {renderChangeIndicator(bestClass.changeFromLastWeek)}
                        </span>
                      </div>
                      <div className="text-gray-500 text-sm mb-1">
                        {bestClass.className} (Grade {bestClass.grade})
                      </div>
                      <Progress 
                        percent={bestClass.percentage} 
                        strokeColor="#52c41a" 
                        showInfo={false} 
                        size="small" 
                      />
                    </div>
                  )}

                  {worstClass && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">Needs Improvement</span>
                        <span className="font-bold">
                          {worstClass.percentage}%
                          {renderChangeIndicator(worstClass.changeFromLastWeek)}
                        </span>
                      </div>
                      <div className="text-gray-500 text-sm mb-1">
                        {worstClass.className} (Grade {worstClass.grade})
                      </div>
                      <Progress 
                        percent={worstClass.percentage} 
                        strokeColor="#f5222d" 
                        showInfo={false} 
                        size="small" 
                      />
                    </div>
                  )}
                </Card>
              )}

              {/* Selected Class Details */}
              {selectedClass && (
                <Card 
                  title="Class Details" 
                  size="small"
                >
                  <div className="mb-2">
                    <span className="font-medium">Class: </span>
                    <span>{classes.find(c => c.id === selectedClass)?.name}</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">Grade: </span>
                    <span>{classes.find(c => c.id === selectedClass)?.grade}</span>
                  </div>
                  <Divider className="my-3" />
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-1">{stats.presentPercentage}%</div>
                    <div className="text-gray-500">Attendance Rate</div>
                  </div>
                </Card>
              )}
            </Col>
          </Row>
        </>
      )}
    </Card>
  );
};

export default DashboardAttendanceSummary;