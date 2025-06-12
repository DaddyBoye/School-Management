import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Statistic, 
  Progress, 
  Tag, 
  Select, 
  Button, 
  Typography, 
  Row, 
  Col,
  Spin,
  Alert,
  Divider,
  Space,
  Tooltip as AntdTooltip
} from 'antd';
import { 
  DollarOutlined, 
  InfoCircleOutlined,
  ReloadOutlined} from '@ant-design/icons';
import moment from 'moment';
import { supabase } from '../supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const { Title, Text } = Typography;
const { Option } = Select;

interface DashboardFeeSummaryProps {
  schoolId: string;
  currentSemester: string;
}

interface Class {
  id: number;
  name: string;
  grade: string;
}

interface FeeStatistics {
  totalPotentialFees: number;
  totalCollected: number;
  pendingAmount: number;
  paymentRate: number;
  classPerformance: {
    classId: number;
    className: string;
    grade: string;
    paymentRate: number;
    changeFromLastPeriod?: number;
  }[];
  monthlyTrends: {
    month: string;
    collected: number;
    pending: number;
  }[];
}

const TIME_RANGE_OPTIONS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'semester', label: 'This Semester' }
];

const PAYMENT_RATE_THRESHOLDS = {
  good: 80,
  fair: 50,
  poor: 0
};

const DashboardFeeSummary: React.FC<DashboardFeeSummaryProps> = ({ schoolId, currentSemester }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<FeeStatistics>({
    totalPotentialFees: 0,
    totalCollected: 0,
    pendingAmount: 0,
    paymentRate: 0,
    classPerformance: [],
    monthlyTrends: []
  });
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'semester'>('semester');
  const [classes, setClasses] = useState<Class[]>([]);
  const [isClassPerformanceLoading] = useState(false);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      await Promise.race([
        (async () => {
          const loadedClasses = await fetchClassList();
          await fetchFeeStatistics(loadedClasses); // pass directly
        })(),
        timeoutPromise
      ]);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to load fee data. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClassList = async () => {
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('grade', { ascending: true });

    if (classesError) throw classesError;

    setClasses(classesData || []);
    return classesData || [];
  };

  const fetchFeeStatistics = async (classesToUse: Class[]) => {
    try {
      const { startDate, endDate } = getDateRangeForPeriod(timeRange);

      const [
        potentialFees,
        collectedFees,
        classPerformance,
        monthlyTrends
      ] = await Promise.all([
        calculatePotentialFees(),
        fetchCollectedFees(startDate, endDate),
        calculateClassPerformance(classesToUse), // <- pass it here
        calculateMonthlyTrends()
      ]);

      const paymentRate = potentialFees > 0 
        ? Math.round((collectedFees / potentialFees) * 100) 
        : 0;

      setStatistics({
        totalPotentialFees: potentialFees,
        totalCollected: collectedFees,
        pendingAmount: potentialFees - collectedFees,
        paymentRate,
        classPerformance,
        monthlyTrends
      });
    } catch (err) {
      console.error('Error fetching fee statistics:', err);
      throw err;
    }
  };

  const getDateRangeForPeriod = (period: typeof timeRange) => {
    const now = moment();
    
    switch (period) {
      case 'week':
        return {
          startDate: now.startOf('week').format('YYYY-MM-DD'),
          endDate: now.endOf('week').format('YYYY-MM-DD')
        };
      case 'month':
        return {
          startDate: now.startOf('month').format('YYYY-MM-DD'),
          endDate: now.endOf('month').format('YYYY-MM-DD')
        };
      case 'semester':
      default:
        const [year, season] = currentSemester.split(' ');
        return {
          startDate: season === 'Spring' 
            ? moment(`${year}-01-01`).format('YYYY-MM-DD')
            : moment(`${year}-07-01`).format('YYYY-MM-DD'),
          endDate: season === 'Spring'
            ? moment(`${year}-06-30`).format('YYYY-MM-DD')
            : moment(`${year}-12-31`).format('YYYY-MM-DD')
        };
    }
  };

  const fetchCollectedFees = async (startDate: string, endDate: string) => {
    let query = supabase
      .from('student_fees')
      .select('paid, students!inner(class_id)')
      .eq('school_id', schoolId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (selectedClassId) {
      query = query.eq('students.class_id', selectedClassId);
    }

    const { data: feesData, error: feesError } = await query;
    if (feesError) throw feesError;

    return feesData?.reduce((sum, fee) => sum + (fee.paid || 0), 0) || 0;
  };

  const calculatePotentialFees = async () => {
    try {
      // Get all active fee types with their pricing
      const { data: feeTypes, error: feeTypesError } = await supabase
        .from('fee_types')
        .select('*, fee_class_pricing(class_id, amount)')
        .eq('school_id', schoolId)
        .eq('is_active', true);

      if (feeTypesError) throw feeTypesError;

      // Get relevant student count
      const studentCount = await fetchStudentCount();

      // Calculate total potential fees
      return feeTypes?.reduce((sum, feeType) => {
        if (feeType.is_class_specific) {
          return sum + (feeType.fee_class_pricing?.reduce((classSum: number, pricing: { class_id: number; amount: number }) => {
            if (!selectedClassId || pricing.class_id === selectedClassId) {
              return classSum + pricing.amount;
            }
            return classSum;
          }, 0) || 0);
        } else {
          return sum + (feeType.amount * studentCount);
        }
      }, 0) || 0;
    } catch (err) {
      console.error('Error calculating potential fees:', err);
      return 0;
    }
  };

  const fetchStudentCount = async () => {
    let query = supabase
      .from('students')
      .select('count', { count: 'exact' })
      .eq('school_id', schoolId);

    if (selectedClassId) {
      query = query.eq('class_id', selectedClassId);
    }

    const { count, error } = await query;
    if (error) throw error;

    return count || 0;
  };

  const calculateClassPerformance = async (classesToUse: Class[]) => {
    try {
      if (selectedClassId) return [];

      if (!classesToUse || classesToUse.length === 0) {
        return [];
      }

      const performanceData = await Promise.all(
        classesToUse.map(async (cls) => {
          try {
            const [collected, potential] = await Promise.all([
              fetchCollectedFeesForClass(cls.id),
              calculatePotentialFeesForClass(cls.id)
            ]);

            const paymentRate = potential > 0 ? Math.round((collected / potential) * 100) : 0;

            return {
              classId: cls.id,
              className: cls.name,
              grade: cls.grade,
              paymentRate,
              changeFromLastPeriod: undefined
            };
          } catch (error) {
            console.error(`Error calculating performance for class ${cls.id}:`, error);
            return {
              classId: cls.id,
              className: cls.name,
              grade: cls.grade,
              paymentRate: 0,
              changeFromLastPeriod: undefined
            };
          }
        })
      );

      return performanceData;
    } catch (error) {
      console.error('Error in calculateClassPerformance:', error);
      return [];
    }
  };

  const fetchCollectedFeesForClass = async (classId: number) => {
    const { data, error } = await supabase
      .from('student_fees')
      .select('paid, students!inner(class_id)')
      .eq('school_id', schoolId)
      .eq('students.class_id', classId);

    if (error) throw error;
    return data?.reduce((sum, fee) => sum + (fee.paid || 0), 0) || 0;
  };

  const calculatePotentialFeesForClass = async (classId: number) => {
    const studentCount = await fetchStudentCountForClass(classId);
    
    const { data: feeTypes, error } = await supabase
      .from('fee_types')
      .select('*, fee_class_pricing(class_id, amount)')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    if (error) throw error;

    return feeTypes?.reduce((sum, feeType) => {
      if (feeType.is_class_specific) {
        const classPricing = feeType.fee_class_pricing?.find((p: { class_id: number; amount: number }) => p.class_id === classId);
        return sum + (classPricing?.amount || 0);
      } else {
        return sum + (feeType.amount * studentCount);
      }
    }, 0) || 0;
  };

  const fetchStudentCountForClass = async (classId: number) => {
    const { count, error } = await supabase
      .from('students')
      .select('count', { count: 'exact' })
      .eq('school_id', schoolId)
      .eq('class_id', classId);

    if (error) throw error;
    return count || 0;
  };

  const calculateMonthlyTrends = async () => {
    try {
      const monthsToShow = timeRange === 'week' ? 1 : timeRange === 'month' ? 3 : 6;
      const now = moment();
      const monthlyData = [];
      
      // Calculate potential fees once outside the loop
      const basePotentialFees = await calculatePotentialFees();

      for (let i = monthsToShow - 1; i >= 0; i--) {
        const monthStart = now.clone().subtract(i, 'months').startOf('month');
        const monthEnd = now.clone().subtract(i, 'months').endOf('month');

        try {
          const collected = await fetchCollectedFees(
            monthStart.format('YYYY-MM-DD'),
            monthEnd.format('YYYY-MM-DD')
          );

          monthlyData.push({
            month: monthStart.format('MMM YYYY'),
            collected,
            pending: Math.max(0, basePotentialFees - collected) // Ensure no negative values
          });
        } catch (error) {
          console.error(`Error fetching data for month ${monthStart.format('MMM YYYY')}:`, error);
          // Add default entry for failed month
          monthlyData.push({
            month: monthStart.format('MMM YYYY'),
            collected: 0,
            pending: 0
          });
        }
      }

      return monthlyData;
    } catch (error) {
      console.error('Error in calculateMonthlyTrends:', error);
      return []; // Return empty array on error
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [schoolId, currentSemester, selectedClassId, timeRange]);

  const getPaymentRateColor = (rate: number) => {
    if (rate >= PAYMENT_RATE_THRESHOLDS.good) return '#52c41a';
    if (rate >= PAYMENT_RATE_THRESHOLDS.fair) return '#faad14';
    return '#f5222d';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="Loading fee summary data..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert 
          message="Fee Summary Error" 
          description={error}
          type="error" 
          showIcon 
        />
        <Button 
          type="primary" 
          onClick={fetchInitialData}
          icon={<ReloadOutlined />}
          className="mt-4"
        >
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Space align="center">
            <DollarOutlined className="text-xl text-green-500" />
            <Title level={4} className="m-0">Fee Collection Dashboard</Title>
            <AntdTooltip title="Shows fee collection statistics for the selected time period and class">
              <InfoCircleOutlined className="text-gray-400" />
            </AntdTooltip>
          </Space>
          
          <Space size="middle">
            <Select
              value={timeRange}
              onChange={setTimeRange}
              size="middle"
              className="min-w-32"
              options={TIME_RANGE_OPTIONS}
            />
            <Select
              value={selectedClassId}
              onChange={setSelectedClassId}
              placeholder="All Classes"
              allowClear
              size="middle"
              className="min-w-48"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) => {
                const children = option?.children;
                const label = typeof children === 'string' ? children : '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {classes.map(cls => (
                <Option key={cls.id} value={cls.id}>
                  {cls.grade} - {cls.name}
                </Option>
              ))}
            </Select>
          </Space>
        </div>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Potential Fees"
          value={statistics.totalPotentialFees}
          prefix="$"
          color="#1890ff"
          tooltip="Sum of all fees that should have been collected"
        />
        <SummaryCard
          title="Collected Amount"
          value={statistics.totalCollected}
          prefix="$"
          color="#52c41a"
          tooltip="Amount actually collected from students"
        />
        <SummaryCard
          title="Pending Amount"
          value={statistics.pendingAmount}
          prefix="$"
          color="#faad14"
          tooltip="Difference between potential and collected fees"
        />
        <SummaryCard
          title="Payment Rate"
          value={statistics.paymentRate}
          suffix="%"
          color={getPaymentRateColor(statistics.paymentRate)}
          tooltip="Percentage of potential fees that have been collected"
          progress
        />
      </div>

      <Divider />

      {/* Charts and Performance */}
      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} md={16}>
          <Card 
            title="Monthly Collection Trends" 
            extra={
              <Text type="secondary">
                {selectedClassId 
                  ? `Showing data for selected class only`
                  : `Showing data for all classes`}
              </Text>
            }
          >
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statistics.monthlyTrends}>
                  <XAxis dataKey="month" />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value).replace('$', '')}
                  />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="collected" 
                    name="Collected" 
                    fill="#52c41a" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="pending" 
                    name="Pending" 
                    fill="#faad14" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={8}>
          <ClassPerformanceCard 
            performanceData={statistics.classPerformance}
            selectedClassId={selectedClassId}
            isLoading={isClassPerformanceLoading}
          />
        </Col>
      </Row>
    </Card>
  );
};

// Helper Components
interface SummaryCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  color: string;
  tooltip?: string;
  progress?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  value, 
  prefix, 
  suffix, 
  color, 
  tooltip,
  progress = false 
}) => (
  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <Text type="secondary" className="flex items-center">
        {title}
        {tooltip && (
          <AntdTooltip title={tooltip}>
            <InfoCircleOutlined className="ml-1 text-xs text-gray-400" />
          </AntdTooltip>
        )}
      </Text>
    </div>
    <Statistic
      value={value}
      precision={0}
      valueStyle={{ color }}
      prefix={prefix}
      suffix={suffix}
      className="mt-2"
    />
    {progress && (
      <Progress 
        percent={value} 
        strokeColor={color}
        showInfo={false} 
        size="small" 
        className="mt-2"
      />
    )}
  </Card>
);

interface ClassPerformanceCardProps {
  performanceData: FeeStatistics['classPerformance'];
  selectedClassId: number | null;
  isLoading?: boolean;
}

const ClassPerformanceCard: React.FC<ClassPerformanceCardProps> = ({ 
  performanceData, 
  selectedClassId,
  isLoading = false
}) => {
  const getPaymentRateColor = (rate: number) => {
    if (rate >= 80) return '#52c41a';
    if (rate >= 50) return '#faad14';
    return '#f5222d';
  };

  if (isLoading) {
    return (
      <Card title="Class Performance">
        <div className="flex justify-center items-center h-32">
          <Spin tip="Loading class performance..." />
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <div className="flex justify-between items-center">
          <span>Class Performance</span>
          <Tag color={selectedClassId ? "blue" : "green"}>
            {selectedClassId ? 'Single Class' : 'All Classes'}
          </Tag>
        </div>
      }
    >
      {performanceData.length > 0 ? (
        <div className="space-y-4">
          {performanceData
            .sort((a, b) => b.paymentRate - a.paymentRate)
            .slice(0, 5)
            .map((classStat) => (
              <div key={classStat.classId}>
                <div className="flex justify-between items-center mb-1">
                  <Text ellipsis style={{ maxWidth: '60%' }}>
                    {classStat.grade} - {classStat.className}
                  </Text>
                  <Text strong style={{ color: getPaymentRateColor(classStat.paymentRate) }}>
                    {classStat.paymentRate}%
                  </Text>
                </div>
                <Progress 
                  percent={classStat.paymentRate} 
                  strokeColor={getPaymentRateColor(classStat.paymentRate)}
                  showInfo={false} 
                  size="small" 
                />
              </div>
            ))}
          {performanceData.length > 5 && (
            <Text type="secondary" className="block text-right">
              +{performanceData.length - 5} more classes
            </Text>
          )}
        </div>
      ) : selectedClassId ? (
        <div className="text-center py-8">
          <Text type="secondary">Showing detailed data for selected class</Text>
        </div>
      ) : (
        <div className="text-center py-8">
          <Text type="secondary">No class performance data available</Text>
        </div>
      )}
    </Card>
  );
};

export default DashboardFeeSummary;