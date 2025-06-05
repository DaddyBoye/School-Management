import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Tag, 
  Typography, 
  Button, 
  Divider, 
  Select, 
  Statistic, 
  Row, 
  Col,
  Spin,
  Tabs,
  message
} from 'antd';
import { 
  DollarOutlined, 
  HistoryOutlined, 
  CalendarOutlined,
  FilePdfOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../supabase';

const { Title, Text } = Typography;
const { Option } = Select;

interface StudentFeeViewProps {
  studentId: string;
  schoolId: string;
}

interface FeeRecord {
  id: number;
  type: string;
  amount: number;
  paid: number;
  dueDate: string;
  status: string;
  semester: string;
  paymentDate: string;
  collector?: string;
  allPayments?: any[];
}

interface SemesterHistory {
  semester: string;
  payments: FeeRecord[];
}

const StudentFeeView: React.FC<StudentFeeViewProps> = ({ studentId, schoolId }) => {
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [history, setHistory] = useState<SemesterHistory[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedHistorySemester, setSelectedHistorySemester] = useState<string>('All');
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [classInfo, setClassInfo] = useState<any>(null);

  // Fetch all necessary data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch student info
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', studentId)
          .single();

        if (studentError) throw studentError;
        setStudentInfo(studentData);

        // 2. Fetch class info
        if (studentData?.class_id) {
          const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('*')
            .eq('id', studentData.class_id)
            .single();

          if (classError) throw classError;
          setClassInfo(classData);
        }

        // 3. Determine current semester (you might want to fetch this from your system)
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const currentSemester = currentMonth < 6 ? `${currentYear} Spring` : `${currentYear} Fall`;
        setSelectedSemester(currentSemester);

        // 4. Fetch current fees
        await fetchStudentFees(studentId, currentSemester);

        // 5. Fetch all payment history
        await fetchPaymentHistory(studentId);

      } catch (error) {
        console.error('Error loading data:', error);
        message.error('Failed to load fee data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId, schoolId]);

  // Fetch student fees for a specific semester
  const fetchStudentFees = async (studentId: string, semester: string) => {
    try {
      const { data, error } = await supabase
        .from('student_fees')
        .select('*, fee_types(name, amount, due_date), collector_type, collector_id')
        .eq('student_id', studentId)
        .eq('semester', semester);

      if (error) throw error;

      // Process the fee data
      const processedFees = processFeeData(data || []);
      setFees(processedFees);
    } catch (error) {
      console.error('Error fetching student fees:', error);
      message.error('Failed to fetch fee information');
    }
  };

  // Fetch all payment history
  const fetchPaymentHistory = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_fees')
        .select('*, fee_types(name, amount, due_date), collector_type, collector_id')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the history data
      const processedHistory = processHistoryData(data || []);
      setHistory(processedHistory);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      message.error('Failed to fetch payment history');
    }
  };

  // Process raw fee data from the database
  const processFeeData = (feeData: any[]): FeeRecord[] => {
    // First group fees by type
    const feesByType = feeData.reduce((acc: Record<string, FeeRecord>, fee) => {
      const feeType = fee.fee_types?.name || 'Unknown';
      
      if (!acc[feeType]) {
        acc[feeType] = {
          id: fee.id,
          type: feeType,
          amount: fee.fee_types?.amount || 0,
          paid: 0,
          dueDate: fee.fee_types?.due_date || fee.due_date,
          status: 'unpaid',
          semester: fee.semester,
          paymentDate: fee.created_at,
          collector: 'Unknown',
          allPayments: []
        };
      }
      
      // Sum up payments for this fee type
      acc[feeType].paid += fee.paid || 0;
      acc[feeType].allPayments?.push(fee);
      
      // Determine status
      acc[feeType].status = acc[feeType].paid >= acc[feeType].amount ? 'paid' : 
                           acc[feeType].paid > 0 ? 'partial' : 'unpaid';
      
      // Update payment date to most recent
      if (!acc[feeType].paymentDate || moment(fee.created_at).isAfter(acc[feeType].paymentDate)) {
        acc[feeType].paymentDate = fee.created_at;
      }
      
      return acc;
    }, {});

    return Object.values(feesByType);
  };

  // Process history data grouped by semester
  const processHistoryData = (historyData: any[]): SemesterHistory[] => {
    // Group by semester
    const bySemester = historyData.reduce((acc: Record<string, any[]>, payment) => {
      const semester = payment.semester;
      if (!acc[semester]) {
        acc[semester] = [];
      }
      acc[semester].push(payment);
      return acc;
    }, {});

    // Convert to array format and process each payment
    return Object.keys(bySemester).map(semester => ({
      semester,
      payments: bySemester[semester].map((payment: any) => ({
        id: payment.id,
        type: payment.fee_types?.name || 'Unknown',
        amount: payment.fee_types?.amount || payment.amount || 0,
        paid: payment.paid || 0,
        dueDate: payment.fee_types?.due_date || payment.due_date,
        status: payment.status || 'unpaid',
        semester: payment.semester,
        paymentDate: payment.created_at,
        collector: payment.collector_type && payment.collector_id 
          ? `${payment.collector_type} ${payment.collector_id}` 
          : 'Unknown'
      }))
    }));
  };

  // Generate semester options for the dropdown
  const generateSemesterOptions = () => {
    const currentYear = parseInt(moment().format('YYYY'));
    const semesters = [];
    
    // Generate options for current year and previous/next year
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      semesters.push({ key: `${year} Spring`, label: `Spring ${year}` });
      semesters.push({ key: `${year} Fall`, label: `Fall ${year}` });
    }
    
    return semesters;
  };

  // Calculate fee summary statistics
  const calculateSummary = () => {
    const totalDue = fees.reduce((sum, fee) => sum + fee.amount, 0);
    const totalPaid = fees.reduce((sum, fee) => sum + fee.paid, 0);
    const balance = totalDue - totalPaid;
    const paymentPercentage = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

    return {
      totalDue,
      totalPaid,
      balance,
      paymentPercentage,
      paidFees: fees.filter(fee => fee.status === 'paid').length,
      partialFees: fees.filter(fee => fee.status === 'partial').length,
      unpaidFees: fees.filter(fee => fee.status === 'unpaid').length
    };
  };

  const summary = calculateSummary();

  // Generate PDF report
  const generatePdfReport = () => {
    const doc = new jsPDF();
    
    // Set document properties
    doc.setProperties({
      title: `Fee Report - ${studentInfo?.first_name} ${studentInfo?.last_name}`,
      subject: `Fee details for ${selectedSemester}`,
      author: 'School Management System'
    });

    // Add header
    doc.setFontSize(18);
    doc.setTextColor(40, 53, 147);
    doc.text(`Fee Report - ${studentInfo?.first_name} ${studentInfo?.last_name}`, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(81, 81, 81);
    doc.text(`Class: ${classInfo?.name} - ${classInfo?.grade} | Roll No: ${studentInfo?.roll_no}`, 105, 28, { align: 'center' });
    doc.text(`Semester: ${selectedSemester} | Generated: ${moment().format('MMMM Do YYYY')}`, 105, 35, { align: 'center' });

    // Add summary section
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Fee Summary', 14, 50);
    
    doc.setFontSize(10);
    const summaryData = [
      ['Total Fees Due', `$${summary.totalDue.toFixed(2)}`],
      ['Total Paid', `$${summary.totalPaid.toFixed(2)}`],
      ['Balance', `$${summary.balance.toFixed(2)}`],
      ['Payment Completion', `${summary.paymentPercentage}%`],
      ['Fully Paid Fees', summary.paidFees],
      ['Partially Paid Fees', summary.partialFees],
      ['Unpaid Fees', summary.unpaidFees]
    ];
    
    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [40, 53, 147],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' }
      }
    });

    // Add fee details
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Fee Details', 14, 20);
    
    const feeDetails = fees.map(fee => [
      fee.type,
      `$${fee.amount.toFixed(2)}`,
      `$${fee.paid.toFixed(2)}`,
      `$${(fee.amount - fee.paid).toFixed(2)}`,
      moment(fee.dueDate).format('MMM DD, YYYY'),
      fee.status.charAt(0).toUpperCase() + fee.status.slice(1)
    ]);
    
    autoTable(doc, {
      startY: 30,
      head: [['Fee Type', 'Amount', 'Paid', 'Balance', 'Due Date', 'Status']],
      body: feeDetails,
      theme: 'grid',
      headStyles: {
        fillColor: [40, 53, 147],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        5: { halign: 'center' }
      },
      styles: {
        cellPadding: 3,
        fontSize: 9
      }
    });

    // Add payment history if needed
    if (history.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Payment History', 14, 20);
      
      let historyData: any[] = [];
      history.forEach(semester => {
        semester.payments.forEach(payment => {
          historyData.push([
            semester.semester,
            payment.type,
            `$${payment.paid.toFixed(2)}`,
            moment(payment.paymentDate).format('MMM DD, YYYY'),
            payment.collector
          ]);
        });
      });
      
      autoTable(doc, {
        startY: 30,
        head: [['Semester', 'Fee Type', 'Amount', 'Date', 'Collected By']],
        body: historyData,
        theme: 'grid',
        headStyles: {
          fillColor: [40, 53, 147],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          2: { halign: 'right' }
        },
        styles: {
          cellPadding: 3,
          fontSize: 9
        }
      });
    }

    // Add footer to all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`Fee_Report_${studentInfo?.first_name}_${studentInfo?.last_name}_${selectedSemester}.pdf`);
  };

  // Filter history based on selected semester
  const getFilteredHistory = () => {
    if (selectedHistorySemester === 'All') {
      return history;
    }
    return history.filter(item => item.semester === selectedHistorySemester);
  };

  // Format semester for display
  const formatSemester = (semester: string) => {
    const [year, season] = semester.split(' ');
    return `${season} ${year}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Spin size="large" tip="Loading fee information..." />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card 
        title={
          <div className="flex justify-between items-center flex-wrap">
            <div>
              <Title level={4} className="m-0">
                <DollarOutlined className="mr-2" />
                My Fee Information
              </Title>
              <Text type="secondary">
                {classInfo?.name} - Roll No: {studentInfo?.roll_no}
              </Text>
            </div>
            <div>
              <Select
                value={selectedSemester}
                onChange={(value) => {
                  setSelectedSemester(value);
                  fetchStudentFees(studentId, value);
                }}
                style={{ width: 200 }}
              >
                {generateSemesterOptions().map(semester => (
                  <Option key={semester.key} value={semester.key}>
                    {semester.label}
                  </Option>
                ))}
              </Select>
              <Button 
                type="primary" 
                icon={<FilePdfOutlined />} 
                onClick={generatePdfReport}
                className="ml-2 bg-blue-600 border-blue-600"
              >
                Download PDF
              </Button>
            </div>
          </div>
        }
        bordered={false}
        className="shadow-sm mb-4"
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-blue-50 border-none">
              <Statistic
                title="Total Fees Due"
                value={summary.totalDue}
                precision={2}
                valueStyle={{ color: '#1890ff' }}
                prefix="$"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-green-50 border-none">
              <Statistic
                title="Total Paid"
                value={summary.totalPaid}
                precision={2}
                valueStyle={{ color: '#52c41a' }}
                prefix="$"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className={summary.balance > 0 ? "bg-red-50 border-none" : "bg-green-50 border-none"}>
              <Statistic
                title="Balance"
                value={summary.balance}
                precision={2}
                valueStyle={{ color: summary.balance > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix="$"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-purple-50 border-none">
              <Statistic
                title="Payment Completion"
                value={summary.paymentPercentage}
                precision={0}
                valueStyle={{ color: '#722ed1' }}
                suffix="%"
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="current" type="card">
        <Tabs.TabPane 
          tab={
            <span>
              <DollarOutlined />
              Current Fees
            </span>
          } 
          key="current"
        >
          <Table
            dataSource={fees}
            columns={[
              {
                title: 'Fee Type',
                dataIndex: 'type',
                key: 'type',
                render: (text) => <Text strong>{text}</Text>
              },
              {
                title: 'Amount',
                dataIndex: 'amount',
                key: 'amount',
                render: (amount) => <Text strong>${amount.toFixed(2)}</Text>
              },
              {
                title: 'Paid',
                dataIndex: 'paid',
                key: 'paid',
                render: (paid, record) => (
                  <Text 
                    strong 
                    style={{ 
                      color: paid >= record.amount ? '#52c41a' : 
                             paid > 0 ? '#faad14' : 
                             '#ff4d4f'
                    }}
                  >
                    ${paid.toFixed(2)}
                  </Text>
                )
              },
              {
                title: 'Balance',
                key: 'balance',
                render: (_, record) => (
                  <Text 
                    strong 
                    style={{ 
                      color: (record.amount - record.paid) <= 0 ? '#52c41a' : 
                             record.paid > 0 ? '#faad14' : 
                             '#ff4d4f'
                    }}
                  >
                    ${(record.amount - record.paid).toFixed(2)}
                  </Text>
                )
              },
              {
                title: 'Due Date',
                dataIndex: 'dueDate',
                key: 'dueDate',
                render: (date) => (
                  <Text type={moment(date).isBefore(moment()) ? 'danger' : undefined}>
                    {moment(date).format('MMM DD, YYYY')}
                  </Text>
                )
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (status) => {
                  let color = '';
                  let text = '';
                  switch (status) {
                    case 'paid':
                      color = 'green';
                      text = 'Paid';
                      break;
                    case 'partial':
                      color = 'orange';
                      text = 'Partial';
                      break;
                    default:
                      color = 'red';
                      text = 'Unpaid';
                  }
                  return <Tag color={color}>{text}</Tag>;
                }
              }
            ]}
            rowKey="id"
            pagination={false}
          />
        </Tabs.TabPane>

        <Tabs.TabPane 
          tab={
            <span>
              <HistoryOutlined />
              Payment History
            </span>
          } 
          key="history"
        >
          <div className="mb-4">
            <Select
              value={selectedHistorySemester}
              onChange={setSelectedHistorySemester}
              style={{ width: 200 }}
            >
              <Option value="All">All Semesters</Option>
              {generateSemesterOptions().map(semester => (
                <Option key={semester.key} value={semester.key}>
                  {semester.label}
                </Option>
              ))}
            </Select>
          </div>

          {getFilteredHistory().length > 0 ? (
            getFilteredHistory().map(semester => (
              <div key={semester.semester} className="mb-6">
                <Divider orientation="left">
                  <Text strong>
                    <CalendarOutlined className="mr-2" />
                    {formatSemester(semester.semester)}
                  </Text>
                </Divider>
                <Table
                  dataSource={semester.payments}
                  columns={[
                    {
                      title: 'Fee Type',
                      dataIndex: 'type',
                      key: 'type',
                      render: (text) => <Text strong>{text}</Text>
                    },
                    {
                      title: 'Amount',
                      dataIndex: 'paid',
                      key: 'paid',
                      render: (amount) => <Text strong style={{ color: '#52c41a' }}>${amount.toFixed(2)}</Text>
                    },
                    {
                      title: 'Payment Date',
                      dataIndex: 'paymentDate',
                      key: 'paymentDate',
                      render: (date) => moment(date).format('MMM DD, YYYY HH:mm')
                    },
                    {
                      title: 'Collected By',
                      dataIndex: 'collector',
                      key: 'collector',
                      render: (text) => <Text>{text}</Text>
                    }
                  ]}
                  rowKey="id"
                  pagination={false}
                />
              </div>
            ))
          ) : (
            <Card>
              <Text type="secondary">No payment history found</Text>
            </Card>
          )}
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default StudentFeeView;