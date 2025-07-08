import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Select, 
  Input, 
  Tag, 
  Tabs, 
  Badge, 
  Card, 
  Divider, 
  Space, 
  message, 
  Typography, 
  Row, 
  Col,
  Statistic,
  Menu,
  Spin
} from 'antd';
import { 
  DollarOutlined, 
  UserOutlined,
  CalendarOutlined,
  TeamOutlined,
  BarChartOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../supabase';

const { Option } = Select;
const { Title, Text } = Typography;

interface StudentFeeManagementPageProps {
  schoolId: string;
  adminId?: string;
  currentTerm: { id: number; name: string } | null;
}

interface Class {
  id: number;
  name: string;
  grade: string;
  studentCount?: number;
}

interface Student {
  id: number;
  rollNo: string;
  name: string;
  class_id: number;
  fees: Array<{
    id: number;
    type: string;
    amount: number;
    paid: number;
    dueDate: string;
    status: string;
    term: string;
    term_id: number;
    paymentDate: string;
  }>;
}

interface FeeType {
  id: number;
  name: string;
  amount: number;
  due_date: string;
  is_active: boolean;
  is_class_specific: boolean;
  fee_class_pricing?: {
    class_id: number;
    amount: number;
  }[];
  applicable_classes?: number[];
}

interface StudentHistory {
  term: string;
  term_id: number;
  payments: Array<{
    id: number;
    type: string;
    amount: number;
    paid: number;
    dueDate: string;
    status: string;
    term: string;
    term_id: number;
    paymentDate: string;
    admin_id?: string;
    admin_name?: string;
  }>;
}

const StudentFeeManagementPage: React.FC<StudentFeeManagementPageProps> = ({ schoolId, adminId, currentTerm }) => {
  // States
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [selectedTerm, setSelectedTerm] = useState(currentTerm);
  const [selectedTermName, setSelectedTermName] = useState(currentTerm?.name || '');  
  const [availableTerms, setAvailableTerms] = useState<{id: number, name: string}[]>([]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedFeeType, setSelectedFeeType] = useState(null);
  const [studentDetailsVisible, setStudentDetailsVisible] = useState(false);
  const [studentHistory, setStudentHistory] = useState<StudentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalFees: 0,
    totalCollected: 0,
    pendingAmount: 0,
    paymentRate: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch classes
      await fetchClasses(schoolId);

      // 2. Fetch fee types
      await fetchFeeTypes();
  
      // 3. Fetch students AFTER fee types are loaded
      await fetchStudentsForSchool(schoolId);
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId, currentTerm]);

  useEffect(() => {
    const fetchAvailableTerms = async () => {
      try {
        const { data, error } = await supabase
          .from('calendar_terms')
          .select(`
            id,
            name,
            start_date,
            end_date,
            is_current,
            school_calendar!calendar_terms_calendar_id_fkey(school_id)
          `)
          .eq('school_calendar.school_id', schoolId)
          .order('start_date', { ascending: false });

        if (error) throw error;
        
        // Map the data to include only the fields we need
        const terms = (data || []).map(term => ({
          id: term.id,
          name: term.name,
        }));
        
        setAvailableTerms(terms);

      } catch (error) {
        console.error('Error fetching available terms:', error);
        message.error('Failed to fetch available terms');
      }
    };

    if (schoolId) {
      fetchAvailableTerms();
    }
  }, [schoolId]);

  useEffect(() => {
    if (currentTerm) {
      setSelectedTerm(currentTerm);
      setSelectedTermName(currentTerm.name);
      students.filter(student => student.class_id === selectedClass?.id);
    }
  }, [currentTerm]);

  useEffect(() => {
    // Filter students by selected class
    if (selectedClass && students.length > 0) {
      const filtered = students.filter(student => student.class_id === selectedClass.id);
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  }, [selectedClass, students]);

  useEffect(() => {
    const updateFeesForTerm = async () => {
      if (students.length > 0) {
        const updatedStudents = await Promise.all(
          students.map(async (student) => {
            const fees = await fetchStudentFees(student.id, selectedTerm?.id || 0);

            return { ...student, fees };
          })
        );
        setStudents(updatedStudents);
      }
    };
  
      updateFeesForTerm();
  }, [selectedTerm]);

  // Fetch classes for the specific school
  const fetchClasses = async (schoolId: string) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', schoolId);

      if (error) throw error;

      // Sort classes alphanumerically by name
      const sortedClasses = (data || []).sort((a, b) => a.name.localeCompare(b.name));

      setClasses(sortedClasses);

      // Set the first class as default
      if (sortedClasses.length > 0) {
        setSelectedClass(sortedClasses[0]);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      message.error('Failed to fetch classes');
    }
  };

  useEffect(() => {
    const fetchStudentHistory = async () => {
      if (currentStudent) {
        try {
          const { data: feesData, error: feesError } = await supabase
            .from('student_fees')
            .select('*, fee_types(name, due_date), administrators!admin_id(first_name, last_name), calendar_terms!term_id(name)')
            .eq('student_id', currentStudent.id);

          if (feesError) throw feesError;

          const formattedData = (feesData || []).map(fee => ({
            ...fee,
            type: fee.fee_types?.name || 'Unknown',
            dueDate: fee.fee_types?.due_date || fee.due_date,
            admin_name: fee.administrators 
              ? `${fee.administrators.first_name} ${fee.administrators.last_name}`
              : 'System',
            paymentDate: fee.created_at
          }));

          const historyByTerm = formattedData.reduce((acc, fee) => {
            const term = fee.calendar_terms?.name || 'Unknown Term';
            const termId = fee.term_id;
            const key = `${termId}|${term}`;
            
            if (!acc[key]) acc[key] = { term, term_id: termId, payments: [] };
            acc[key].payments.push(fee);
            return acc;
          }, {});

          setStudentHistory(Object.values(historyByTerm));
        } catch (error) {
          console.error('Error fetching student history:', error);
          message.error('Failed to fetch payment history');
        }
      }
    };

    fetchStudentHistory();
  }, [currentStudent]);

  useEffect(() => {
    calculateStatistics();
  }, [filteredStudents, feeTypes]);

  // Fetch fee types from Supabase
  const fetchFeeTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_types')
        .select(`
          *,
          fee_class_pricing(class_id, amount)
        `)
        .eq('school_id', schoolId)
        .eq('is_active', true);
  
      if (error) throw error;
      setFeeTypes(data || []);
    } catch (error) {
      console.error('Error fetching fee types:', error);
      message.error('Failed to fetch fee types');
    }
  };

  const getFeeAmountForStudent = (student: Student | null, feeTypeId: number): number => {
    if (!student) return 0;
    
    const feeType = feeTypes.find(ft => ft.id === feeTypeId);
    if (!feeType) return 0;
  
    if (!feeType.is_class_specific) return feeType.amount || 0;
  
    if (!feeType.applicable_classes?.includes(student.class_id)) return 0;
  
    const classPricing = feeType.fee_class_pricing?.find(
      pricing => pricing.class_id === student.class_id
    );
  
    return classPricing?.amount || feeType.amount || 0;
  };

  const fetchStudentsForSchool = async (schoolId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId);
  
      if (error) throw error;
  
      // Map the database fields to the expected fields
      const studentsWithFees = await Promise.all(
        data.map(async (student) => {
          const fees = await fetchStudentFees(student.id, selectedTerm?.id || 0);
            return {
              id: student.id,
              rollNo: student.roll_no,
              name: `${student.first_name} ${student.last_name}`,
              class_id: student.class_id,
              fees: fees,
            } as Student; // Explicitly type as Student
          })
        );
  
      setStudents(studentsWithFees);
  
      // Filter students by the selected class
      if (selectedClass) {
        const filtered = studentsWithFees.filter(student => student.class_id === selectedClass.id);
        setFilteredStudents(filtered);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      message.error('Failed to fetch students');
    }
  };
  
  const fetchStudentFees = async (studentId: number, termId: number | null) => {
    try {
      let query = supabase
        .from('student_fees')
        .select(`
          *,
          fee_types(name, amount, due_date),
          administrators!admin_id(first_name, last_name)
        `)
        .eq('student_id', studentId);

      // Only add term filter if a specific term is selected
      if (termId) {
        query = query.eq('term_id', termId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Get term names for all fetched fees
      const termIds = [...new Set(data?.map(fee => fee.term_id) || [])];
      const { data: termsData } = await supabase
        .from('calendar_terms')
        .select('id, name')
        .in('id', termIds);

      const termNameMap = new Map(termsData?.map(term => [term.id, term.name]) || new Map());

      return (data || []).map(fee => ({
        id: fee.id,
        type: fee.fee_types?.name || 'Unknown',
        amount: fee.fee_types?.amount || 0,
        paid: fee.paid || 0,
        dueDate: fee.fee_types?.due_date || fee.due_date,
        status: fee.status || 'unpaid',
        term: termNameMap.get(fee.term_id) || 'Unknown Term',
        term_id: fee.term_id,
        paymentDate: fee.created_at,
        admin_id: fee.admin_id,
        admin_name: fee.administrators 
          ? `${fee.administrators.first_name} ${fee.administrators.last_name}`
          : 'System'
      }));
    } catch (error) {
      console.error('Error fetching student fees:', error);
      message.error('Failed to fetch student fees');
      return [];
    }
  };
 
  const recordPayment = async (
    studentId: number, 
    feeTypeId: number, 
    fullAmount: number, 
    paidAmount: number, 
    termId: number, 
    dueDate: string
  ) => {
    if (!adminId) {
      message.error('Admin ID not available');
      return null;
    }

    try {
      // First check if there are existing payments for this fee type
      const { data: existingPayments, error: fetchError } = await supabase
        .from('student_fees')
        .select('*')
        .eq('student_id', studentId)
        .eq('fee_type_id', feeTypeId)
        .eq('term_id', termId);

      if (fetchError) throw fetchError;

      const totalPaidSoFar = existingPayments?.reduce((sum, payment) => sum + (payment.paid || 0), 0) || 0;
      const newTotalPaid = totalPaidSoFar + paidAmount;

      // Record the new payment
      const { data, error } = await supabase
        .from('student_fees')
        .insert([
          {
            student_id: studentId,
            fee_type_id: feeTypeId,
            amount: fullAmount,
            paid: paidAmount,
            due_date: dueDate,
            status: newTotalPaid >= fullAmount ? 'paid' : 'partial',
            term_id: termId,
            admin_id: adminId,
            school_id: schoolId
          }
        ])
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error recording payment:', error);
      message.error('Failed to record payment');
      return null;
    }
  };
  
const handlePaymentSubmit = async () => {
    if (!selectedFeeType || paymentAmount <= 0) {
      message.error('Please fill all required fields');
      return;
    }

    // Find the selected fee type
    const feeType = feeTypes.find(type => type.id === selectedFeeType);
    if (!feeType) {
      message.error('Fee type not found');
      return;
    }

    // Get the correct amount for this student's class
    let fullAmount = feeType.amount;
    if (feeType.is_class_specific && currentStudent) {
      const classPricing = feeType.fee_class_pricing?.find(
        pricing => pricing.class_id === currentStudent.class_id
      );
      
      if (!feeType.applicable_classes?.includes(currentStudent.class_id)) {
        message.error('This fee is not applicable to the selected student');
        return;
      }

      fullAmount = classPricing?.amount || feeType.amount;
    }

    if (paymentAmount > fullAmount) {
      message.error(`Payment amount cannot exceed GH₵${fullAmount}`);
      return;
    }

    try {
      const paymentData = await recordPayment(
        currentStudent?.id || 0,
        selectedFeeType,
        fullAmount,
        paymentAmount,
        selectedTerm?.id || 0,
        feeType.due_date
      );

      if (paymentData) {
        message.success('Payment recorded successfully');
        setIsModalVisible(false);

        // Refresh student data
        if (currentStudent) {
          const updatedFees = await fetchStudentFees(currentStudent.id, selectedTerm?.id || 0); // Changed here
          setCurrentStudent(prev => prev ? { ...prev, fees: updatedFees } : null);
          setStudents(prevStudents =>
            prevStudents.map(student =>
              currentStudent && student.id === currentStudent.id 
                ? { ...student, fees: updatedFees } 
                : student
            )
          );
        }

        calculateStatistics();
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      message.error('Failed to record payment');
    }
  };

  // Calculate statistics
  const calculateStatistics = () => {
    if (!selectedClass || filteredStudents.length === 0) {
      setStatistics({
        totalFees: 0,
        totalCollected: 0,
        pendingAmount: 0,
        paymentRate: 0
      });
      return;
    }
  
    // 1. Calculate total fee types amount for the class
    const classFeeTypesTotal = feeTypes.reduce((sum, feeType) => sum + feeType.amount, 0);
    
    // 2. Total fees = (sum of all fee types) × number of students
    const totalFees = classFeeTypesTotal * filteredStudents.length;
    
    // 3. Total collected = sum of all payments from all students
    const totalCollected = filteredStudents.reduce((sum, student) => {
      return sum + (student.fees?.reduce((feeSum, fee) => feeSum + fee.paid, 0) || 0);
    }, 0);
    
    // 4. Pending amount
    const pendingAmount = totalFees - totalCollected;
    
    // 5. Payment rate (handle division by zero)
    const paymentRate = totalFees > 0 ? Math.round((totalCollected / totalFees) * 100) : 0;
    
    setStatistics({
      totalFees,
      totalCollected,
      pendingAmount,
      paymentRate
    });
  };

   const isAllFeesPaid = (student: Student) => {
    if (!student || !student.fees || student.fees.length === 0) {
      return false; // Treat students with no records as not fully paid
    }
    return student.fees.every(fee => fee.status === 'paid');
  };

  const getFeeStatus = (student: Student) => {
    if (!student || !student.fees || student.fees.length === 0) {
      return 'none'; // No fees recorded
    }
  
    // Group fees by type
    const feesByType = student.fees.reduce((acc, fee) => {
      if (!acc[fee.type]) {
        acc[fee.type] = { totalAmount: fee.amount, totalPaid: 0 };
      }
      acc[fee.type].totalPaid += fee.paid;
      return acc;
    }, {} as Record<string, { totalAmount: number; totalPaid: number }>);
  
    // Check if all fee types are fully paid
    const allFullyPaid = Object.values(feesByType).every(
      (fee: { totalAmount: number; totalPaid: number }) => fee.totalPaid >= fee.totalAmount
    );
  
    // Check if any fee type is partially paid
    const anyPartiallyPaid = Object.values(feesByType).some(
      (fee: { totalAmount: number; totalPaid: number }) => fee.totalPaid > 0 && fee.totalPaid < fee.totalAmount
    );
  
    if (allFullyPaid) {
      return 'full'; // All fees fully paid
    } else if (anyPartiallyPaid) {
      return 'partial'; // Some fees partially paid
    } else {
      return 'none'; // No payments made
    }
  };

  // Enhanced PDF generation function
  interface ReportOptions {
    title: string;
    subtitle?: string;
    headers: string[];
    data: any[]; // Replace `any[]` with a more specific type if possible
    summary?: Record<string, string | number>;
    styles?: {
      styles?: Record<string, any>;
      headStyles?: Record<string, any>;
      columnStyles?: Record<number, any>;
    };
    filename?: string;
  }

  const downloadReport = (options: ReportOptions) => {
    const {
      title,
      subtitle,
      headers,
      data,
      summary = null,
      styles = {},
      filename = 'report.pdf'
    } = options;

    const doc = new jsPDF();
    
    // Set document properties
    doc.setProperties({
      title: title,
      subject: subtitle,
      author: 'School Management System',
      creator: 'Fee Management Module'
    });

    // Add header with logo and title
    doc.setFillColor(114, 46, 209);
    doc.rect(0, 0, doc.internal.pageSize.width, 30, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 14, 15);
    
    // Add subtitle
    if (subtitle) {
      doc.setFontSize(12);
      doc.setTextColor(245, 245, 245);
      doc.text(subtitle, 14, 25);
    }
    
    // Add date
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.setFontSize(10);
    doc.text(`Generated on: ${dateStr}`, doc.internal.pageSize.width - 65, 25);

    // Add summary if provided
    let startY = 40;
    if (summary) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Summary', 14, startY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      
      startY += 10;
      
      Object.entries(summary).forEach(([key, value], index) => {
        const formattedKey = key.replace(/([A-Z])/g, ' GH₵1')
          .replace(/^./, str => str.toUpperCase())
          .replace(/_/g, ' ');
        
        const valueText = typeof value === 'number' && key.toLowerCase().includes('amount') 
          ? `GH₵${value.toFixed(2)}` 
          : value;
        
        doc.text(`${formattedKey}: ${valueText}`, 14, startY + (index * 7));
      });
      
      startY += (Object.keys(summary).length * 7) + 10;
      
      // Add line separator
      doc.setDrawColor(200, 200, 200);
      doc.line(14, startY - 5, doc.internal.pageSize.width - 14, startY - 5);
    }

    // Add table
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: startY,
      theme: 'grid',
      styles: { 
        fontSize: 9, 
        cellPadding: 3, 
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        ...styles.styles 
      },
      headStyles: { 
        fillColor: [114, 46, 209], 
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        ...styles.headStyles 
      },
      alternateRowStyles: {
        fillColor: [245, 245, 250]
      },
      columnStyles: styles.columnStyles || {},
      didDrawPage: function() {
        // Add page number at the bottom
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${doc.getNumberOfPages()}`, doc.internal.pageSize.width / 2, 
          doc.internal.pageSize.height - 10, { align: 'center' });
      }
    });

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('School Management System - Fee Report', 14, doc.internal.pageSize.height - 10);
    }

    doc.save(filename);
  };

  // Function to generate class fee report
  const generateClassFeeReport = (classInfo: Class, students: Student[]) => {
    if (!classInfo || !students) {
      message.error('No class or student data available');
      return;
    }

  // Calculate detailed statistics
  const totalPotentialFees = filteredStudents.reduce((sum, student) => {
    return sum + feeTypes.reduce((feeSum, feeType) => {
      return feeSum + getFeeAmountForStudent(student, feeType.id);
    }, 0);
  }, 0);
  const totalCollected = students.reduce((sum, student) => {
    return sum + (student.fees?.reduce((feeSum, fee) => feeSum + fee.paid, 0) || 0);
  }, 0);
  const pendingAmount = totalPotentialFees - totalCollected;
  const paymentRate = totalPotentialFees > 0 ? Math.round((totalCollected / totalPotentialFees) * 100) : 0;

  // Prepare comprehensive fee type analysis
  const feeTypeAnalysis = feeTypes.map(type => {
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let totalCollectedForType = 0;
    let totalPotentialForType = type.amount * students.length;

    students.forEach(student => {
      const fee = student.fees?.find(f => f.type === type.name);
      if (fee) {
        totalCollectedForType += fee.paid;
        if (fee.status === 'paid') paidCount++;
        else if (fee.status === 'partial') partialCount++;
      } else {
        unpaidCount++;
      }
    });

    return {
      name: type.name,
      amount: type.amount,
      dueDate: type.due_date,
      totalCollected: totalCollectedForType,
      pending: totalPotentialForType - totalCollectedForType,
      paymentRate: totalPotentialForType > 0 ? Math.round((totalCollectedForType / totalPotentialForType) * 100) : 0,
      paidCount,
      partialCount,
      unpaidCount
    };
  });

  // Prepare student data
  const studentsData = students.map(student => {
    const studentFees: Record<string, { amount: number; paid: number; status: string }> = {};
    let studentTotalPaid = 0;
    let studentTotalDue = 0;

    feeTypes.forEach(type => {
      studentFees[type.name] = {
        amount: type.amount,
        paid: 0,
        status: 'unpaid'
      };
      studentTotalDue += type.amount;
    });

    student.fees?.forEach(fee => {
      if (studentFees[fee.type]) {
        studentFees[fee.type].paid = fee.paid;
        studentFees[fee.type].status = fee.status;
        studentTotalPaid += fee.paid;
      }
    });

    return {
      rollNo: student.rollNo,
      name: student.name,
      totalDue: studentTotalDue,
      totalPaid: studentTotalPaid,
      balance: studentTotalDue - studentTotalPaid,
      paymentStatus: getFeeStatus(student),
      feeDetails: studentFees
    };
  });

  // Create PDF document
  const doc = new jsPDF();

  // Set document properties
  doc.setProperties({
    title: `Class Fee Report - ${classInfo.name}`,
    subject: `Fee collection report for ${classInfo.name} - ${selectedTermName}`,
    author: 'School Management System'
  });

  // Add header
  doc.setFontSize(18);
  doc.setTextColor(40, 53, 147);
  doc.text(`Class Fee Report - ${classInfo.name}`, 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(81, 81, 81);
  doc.text(`Term: ${selectedTermName} | Generated on: ${moment().format('MMMM Do YYYY')}`, 105, 28, { align: 'center' });

  // Add summary statistics
  doc.setFontSize(14);
  doc.text('Summary Statistics', 14, 40);
  
  const summary = {
    'Class': `${classInfo.name} - ${classInfo.grade}`,
    'Total Students': students.length,
    'Total Fee Types': feeTypes.length,
    'Total Potential Fees': `GH₵${totalPotentialFees.toFixed(2)}`,
    'Total Collected': `GH₵${totalCollected.toFixed(2)}`,
    'Total Pending': `GH₵${pendingAmount.toFixed(2)}`,
    'Collection Rate': `${paymentRate}%`
  };

  let yPosition = 50;
  Object.entries(summary).forEach(([key, value]) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${key}:`, 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(value.toString(), 70, yPosition);
    yPosition += 7;
  });

  // Add student details
  yPosition += 15;
  doc.setFontSize(14);
  doc.text('Student Fee Details', 14, yPosition);
  yPosition += 10;

  autoTable(doc, {
    head: [['Roll No', 'Student Name', 'Total Due', 'Total Paid', 'Balance', 'Status']],
    body: studentsData.map(student => [
      student.rollNo,
      student.name,
      `GH₵${student.totalDue.toFixed(2)}`,
      `GH₵${student.totalPaid.toFixed(2)}`,
      `GH₵${student.balance.toFixed(2)}`,
      student.paymentStatus.charAt(0).toUpperCase() + student.paymentStatus.slice(1)
    ]),
    startY: yPosition,
    theme: 'grid',
    headStyles: {
      fillColor: [40, 53, 147],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'center' }
    }
  });

  // Add fee type analysis on new page (moved to bottom)
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Fee Type Performance Analysis', 14, 20);

  autoTable(doc, {
    head: [
      ['Fee Type', 'Amount', 'Due Date', 'Paid', 'Partial', 'Unpaid', 'Collected', 'Pending', 'Rate']
    ],
    body: feeTypeAnalysis.map(type => [
      type.name,
      `GH₵${type.amount.toFixed(2)}`,
      moment(type.dueDate).format('MMM DD'),
      `${type.paidCount} (${Math.round((type.paidCount/students.length)*100)}%)`,
      `${type.partialCount} (${Math.round((type.partialCount/students.length)*100)}%)`,
      `${type.unpaidCount} (${Math.round((type.unpaidCount/students.length)*100)}%)`,
      `GH₵${type.totalCollected.toFixed(2)}`,
      `GH₵${type.pending.toFixed(2)}`,
      `${type.paymentRate}%`
    ]),
    startY: 30,
    theme: 'grid',
    headStyles: {
      fillColor: [40, 53, 147],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 25, halign: 'right' },
      8: { cellWidth: 15, halign: 'center' }
    }
  });

  // Add footer to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
    doc.text(`School Management System`, 200, doc.internal.pageSize.height - 10, { align: 'right' });
  }

  // Save the PDF
  doc.save(`Class_Fee_Report_${classInfo.name}_${selectedTermName.replace(/\s+/g, '_')}.pdf`);
};

  const showPaymentModal = (student: Student) => {
    setCurrentStudent(student);
    setIsModalVisible(true);
  };
  
  const viewStudentDetails = (student: Student) => {
    setCurrentStudent(student);
    setStudentDetailsVisible(true);
  };

  const getFilteredHistory = () => {
    if (!selectedTerm) {
      return studentHistory;
    }
    return studentHistory.filter(history => history.term_id === selectedTerm.id);
  };

  const generateTermOptions = () => {
    const options = [
      { key: 'current', label: 'Current Term' },
      { key: 'all', label: 'All Terms' }
    ];

    // Add fetched terms to options
    availableTerms.forEach(term => {
      options.push({
        key: term.id.toString(),
        label: term.name
      });
    });

    return options;
  };

  // Table columns
  const studentColumns = [
    {
      title: 'Roll No',
      dataIndex: 'rollNo',
      key: 'rollNo',
      width: 100,
      responsive: ['xs' as const]
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Fee Type',
      key: 'feeType',
      render: (_: unknown, student: Student) => {
        return (
          <div>
            {feeTypes.map(feeType => {
              const amount = getFeeAmountForStudent(student, feeType.id);
              if (amount <= 0) return null; // Skip fees not applicable to this student
              
              return (
                <div key={feeType.id} style={{ marginBottom: 8 }}>
                  <Text strong>{feeType.name}</Text>
                  {feeType.is_class_specific && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>Class-Specific</Tag>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
    },
    {
      title: 'Amount (Paid/Due)',
      key: 'amountCombined',
      render: (_: unknown, student: Student) => {
        return (
          <Space direction="vertical">
            {feeTypes.map(feeType => {
              const amountDue = getFeeAmountForStudent(student, feeType.id);
              if (amountDue <= 0) return null;
              
              // Calculate total paid for this fee type
              const studentFees = student.fees?.filter(f => f.type === feeType.name) || [];
              const totalPaid = studentFees.reduce((sum, fee) => sum + (fee.paid || 0), 0);
              const status = totalPaid >= amountDue ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
              
              return (
                <div key={feeType.id} style={{ marginBottom: 5 }}>
                  <Text 
                    strong 
                    style={{ 
                      color: status === 'paid' ? '#52c41a' : 
                             status === 'partial' ? '#faad14' : 
                             '#ff4d4f'
                    }}
                  >
                    GH₵{(totalPaid || 0).toFixed(2)}/GH₵{amountDue.toFixed(2)}
                  </Text>
                </div>
              );
            })}
          </Space>
        );
      }
    },
    {
      title: 'Balance',
      key: 'balance',
      render: (_: unknown, student: Student) => {
        return (
          <Space direction="vertical">
            {feeTypes.map(feeType => {
              const amount = getFeeAmountForStudent(student, feeType.id);
              if (amount <= 0) return null;
              
              const studentFees = student.fees?.filter(f => f.type === feeType.name) || [];
              const totalPaid = studentFees.reduce((sum, fee) => sum + (fee.paid || 0), 0);
              const balance = amount - totalPaid;
              
              return (
                <div key={feeType.id} style={{ marginBottom: 5 }}>
                  <Text 
                    strong 
                    style={{ 
                      color: balance <= 0 ? '#52c41a' : 
                             totalPaid > 0 ? '#faad14' : 
                             '#ff4d4f'
                    }}
                  >
                    GH₵{(balance || 0).toFixed(2)}
                  </Text>
                </div>
              );
            })}
          </Space>
        );
      }
    },
    {
      title: 'Due Date',
      key: 'dueDate',
      render: (_: unknown, student: Student) => {
        return (
          <Space direction="vertical">
            {feeTypes.map(feeType => {
              const amount = getFeeAmountForStudent(student, feeType.id);
              if (amount <= 0) return null;
              
              const studentFee = student.fees?.find(f => f.type === feeType.name);
              const dueDate = studentFee?.dueDate || feeType.due_date;
              const status = studentFee?.status || 'unpaid';
              const isOverdue = moment(dueDate).isBefore(moment()) && status !== 'paid';
              
              return (
                <div key={feeType.id} style={{ marginBottom: 5 }}>
                  <Text 
                    type={isOverdue ? 'danger' : 'secondary'}
                  >
                    {moment(dueDate).format('MMM DD, YYYY')}
                  </Text>
                </div>
              );
            })}
          </Space>
        );
      },
      responsive: ['xl' as const]
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, student: Student) => (
        <Space wrap>
          <Button 
            type="primary" 
            icon={<DollarOutlined />} 
            onClick={() => showPaymentModal(student)}
            style={{ background: '#1890ff', borderColor: '#1890ff' }}
          >
            Process Fee
          </Button>
          <Button 
            type="default" 
            icon={<UserOutlined />} 
            onClick={() => viewStudentDetails(student)}
            style={{ borderColor: '#1890ff', color: '#1890ff' }}
          >
            Details
          </Button>
        </Space>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '82vh' }}>
        <Spin size="large" tip="Loading data..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24} md={6} lg={6} xl={5}>
          <Card title="Class Selection" bordered={false} className="h-full">
            <Menu
              mode="inline"
              selectedKeys={[selectedClass?.id?.toString() || '']}
              className="border-r-0"
              onClick={({ key }) => setSelectedClass(classes.find(cls => cls.id.toString() === key) || null)}
            >
              {classes.map(cls => (
                <Menu.Item key={cls.id} icon={<TeamOutlined />} className="hover:bg-blue-50">
                  {cls.name} - {cls.grade}
                  <Badge count={cls.studentCount} className="ml-2" />
                </Menu.Item>
              ))}
            </Menu>
            
            <Divider className="my-4" />
            
            <Title level={4} className="mb-2">Academic Period</Title>

            <Menu
              mode="inline"
              selectedKeys={[selectedTerm?.id ? selectedTerm.id.toString() : 'current']}
              className="border-r-0"
              onClick={({ key }) => {
                if (key === 'current') {
                  setSelectedTerm(currentTerm);
                  setSelectedTermName(currentTerm?.name || '');
                } else if (key === 'all') {
                  setSelectedTerm(null);
                  setSelectedTermName('All Terms');
                } else {
                  const term = availableTerms.find(t => t.id.toString() === key);
                  if (term) {
                    setSelectedTerm(term);
                    setSelectedTermName(term.name);
                  }
                }
              }}
            >
              {generateTermOptions().map(item => (
                <Menu.Item 
                  key={item.key} 
                  icon={<CalendarOutlined />}
                  className={`${item.key === 'current' && currentTerm?.id === selectedTerm?.id ? 'font-bold bg-blue-50' : ''}`}
                >
                  {item.label}
                  {item.key === 'current' && currentTerm?.id === selectedTerm?.id && (
                    <Tag color="blue" className="ml-2">Current</Tag>
                  )}
                </Menu.Item>
              ))}
            </Menu>
          </Card>
        </Col>
        
        <Col xs={24} sm={24} md={18} lg={18} xl={19}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Card className="bg-blue-50 border-none">
                    <Statistic
                      title="Total Fees"
                      value={statistics.totalFees}
                      precision={2}
                      valueStyle={{ color: '#1890ff' }}
                      prefix="GH₵"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="bg-green-50 border-none">
                    <Statistic
                      title="Total Collected"
                      value={statistics.totalCollected}
                      precision={2}
                      valueStyle={{ color: '#52c41a' }}
                      prefix="GH₵"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="bg-orange-50 border-none">
                    <Statistic
                      title="Pending Amount"
                      value={statistics.pendingAmount}
                      precision={2}
                      valueStyle={{ color: '#fa8c16' }}
                      prefix="GH₵"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="bg-purple-50 border-none">
                    <Statistic
                      title="Payment Rate"
                      value={statistics.paymentRate}
                      precision={0}
                      valueStyle={{ color: '#722ed1' }}
                      suffix="%"
                    />
                  </Card>
                </Col>
              </Row>
            </Col>
            
            <Col span={24}>
              <Card 
                title={
                  <div className="flex justify-between items-center flex-wrap">
                    <div>
                      <Title level={4} className="m-0">
                        {selectedClass?.name} - {selectedClass?.grade}
                      </Title>
                      <Text type="secondary" className="flex items-center">
                        Term: {selectedTermName}
                        {selectedTerm?.id === currentTerm?.id && <Tag color="blue" className="ml-2">Current</Tag>}
                      </Text>
                    </div>
                    <Button 
                      type="primary" 
                      icon={<BarChartOutlined />}
                      onClick={() => {
                        if (selectedClass) {
                          generateClassFeeReport(selectedClass, filteredStudents);
                        } else {
                          message.error('Please select a class before generating the report');
                        }
                      }}
                      className="bg-purple-600 border-purple-600 hover:bg-purple-700"
                    >
                      Download Report
                    </Button>
                  </div>
                }
                bordered={false}
                className="shadow-md"
              >
                <Table 
                  dataSource={filteredStudents} 
                  columns={studentColumns} 
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  rowClassName={record => isAllFeesPaid(record) ? 'bg-green-50' : ''}
                  scroll={{ x: 'max-content' }}
                />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

{/* Payment Modal */}
<Modal
  title={
    <div className="text-lg font-bold text-blue-500">
      <DollarOutlined className="mr-2" />
      Process Fee Payment - {currentStudent?.name}
    </div>
  }
  open={isModalVisible}
  onCancel={() => setIsModalVisible(false)}
  footer={[
    <Button key="cancel" onClick={() => setIsModalVisible(false)}>
      Cancel
    </Button>,
    <Button 
      key="submit" 
      type="primary" 
      onClick={handlePaymentSubmit}
      className="bg-blue-500 border-blue-500 hover:bg-blue-600"
    >
      Record Payment
    </Button>
  ]}
  width={500}
>
  <Form layout="vertical">
    <Form.Item 
      label={<Text strong>Fee Type</Text>} 
      required 
    >
      <Select
        placeholder="Select fee type"
        style={{ width: '100%' }}
        value={selectedFeeType}
        onChange={(value) => {
          setSelectedFeeType(value);
          const feeType = feeTypes.find(type => type.id === value);
          if (feeType && currentStudent) {
            // Get the correct amount for this student's class
            let amount = feeType.amount;
            if (feeType.is_class_specific) {
              const classPricing = feeType.fee_class_pricing?.find(
                p => p.class_id === currentStudent.class_id
              );
              amount = classPricing?.amount || feeType.amount;
            }

            // Check if student has existing payment for this fee
            const studentFee = currentStudent.fees.find(
              fee => fee.type === feeType.name && fee.term_id === selectedTerm?.id
            );
            
            // Set payment amount (remaining balance or full amount)
            setPaymentAmount(studentFee ? amount - studentFee.paid : amount);
          }
        }}
        size="large"
      >
        {feeTypes.map(type => {
          // Only show fees that are applicable to the student's class
          if (type.is_class_specific && currentStudent && 
              !type.applicable_classes?.includes(currentStudent.class_id)) {
            return null;
          }
          
          // Calculate display amount
          let displayAmount = type.amount;
          if (type.is_class_specific && currentStudent) {
            const classPricing = type.fee_class_pricing?.find(
              p => p.class_id === currentStudent.class_id
            );
            displayAmount = classPricing?.amount || type.amount;
          }

          return (
            <Option key={type.id} value={type.id}>
              <div className="flex justify-between items-center">
                <span>
                  {type.name} - GH₵{displayAmount} 
                  {type.is_class_specific && (
                    <Tag color="blue" className="ml-2">Class-Specific</Tag>
                  )}
                </span>
                <span className="text-gray-500">
                  Due: {moment(type.due_date).format('MMM DD, YYYY')}
                </span>
              </div>
            </Option>
          );
        })}
      </Select>
    </Form.Item>

    <Form.Item 
      label={<Text strong>Payment Amount</Text>} 
      required
    >
      <Input
        type="number"
        prefix="GH₵"
        value={paymentAmount}
        onChange={(e) => {
          const value = parseFloat(e.target.value);
          setPaymentAmount(isNaN(value) ? 0 : value);
        }}
        size="large"
      />
    </Form.Item>
  </Form>
</Modal>

      {/* Student Details Modal */}
      <Modal
        title={
          <div className="text-lg font-bold text-blue-500">
            <UserOutlined className="mr-2" />
            Student Fee Details - {currentStudent?.name}
          </div>
        }
        visible={studentDetailsVisible}
        onCancel={() => setStudentDetailsVisible(false)}
        width={800}
        footer={[
          <Button 
            key="close" 
            type="primary" 
            onClick={() => setStudentDetailsVisible(false)}
          >
            Close
          </Button>,
          <Button 
            key="download" 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={() => {
              const feeReportOptions = {
                title: `Fee Report - ${currentStudent?.name} (${selectedTermName})`,
                subtitle: `Class: ${selectedClass?.name} - ${selectedClass?.grade}`,
                headers: ['Fee Type', 'Amount', 'Paid', 'Due Date', 'Status'],
                data: currentStudent?.fees.map(fee => [
                  fee.type,
                  `GH₵${fee.amount}`,
                  `GH₵${fee.paid}`,
                  moment(fee.dueDate).format('MMM DD, YYYY'),
                  fee.status
                ]),
                filename: `Fee_Report_${currentStudent?.name}_${selectedTermName.replace(/\s+/g, '_')}.pdf`
              };
              downloadReport({ ...feeReportOptions, data: feeReportOptions.data || [] });
            }}
            className="bg-purple-600 border-purple-600 hover:bg-purple-700"
          >
            Download PDF
          </Button>
        ]}
      >
<Tabs
  defaultActiveKey="current"
  type="card"
  items={[
    {
      key: 'current',
      label: (
        <span>
          <DollarOutlined />
          Current Fees ({selectedTermName})
        </span>
      ),
      children: (
        <Table 
          dataSource={currentStudent?.fees} 
          columns={[
            { 
              title: 'Fee Type', 
              dataIndex: 'type', 
              key: 'type',
              render: text => <Text strong>{text}</Text>
            },
            { 
              title: 'Amount', 
              dataIndex: 'amount', 
              key: 'amount', 
              render: (amount) => <Text strong>GH₵{amount}</Text> 
            },
            { 
              title: 'Paid', 
              dataIndex: 'paid', 
              key: 'paid', 
              render: (paid, record) => (
                <Text strong style={{ color: paid >= record.amount ? '#52c41a' : '#faad14' }}>
                  GH₵{paid}
                </Text>
              )
            },
            { 
              title: 'Payment Date', 
              dataIndex: 'paymentDate', 
              key: 'paymentDate',
              render: (date) => moment(date).format('MMM DD, YYYY HH:mm')
            },
            { 
              title: 'Due Date', 
              dataIndex: 'dueDate', 
              key: 'dueDate',
              render: (date) => moment(date).format('MMM DD, YYYY')
            },
          ]} 
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      )
    },
    {
      key: 'history',
      label: (
        <span>
          <CalendarOutlined />
          Payment History
        </span>
      ),
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Select 
              style={{ width: 200 }} 
              placeholder="Filter by term"
              value={selectedTerm?.name || 'all'}
              onChange={(value) => {
                if (value === 'all') {
                  setSelectedTerm(null);
                } else {
                  const term = availableTerms.find(t => t.id.toString() === value);
                  if (term) setSelectedTerm(term);
                }
              }}
              options={[
                { value: 'all', label: 'All Terms' },
                ...availableTerms.map(term => ({ 
                  value: term.id.toString(), 
                  label: term.id === currentTerm?.id ? `${term.name} (Current)` : term.name 
                }))
              ]}
            />
          </div>
          
          {getFilteredHistory().map(termData => (
            <div key={termData.term_id} style={{ marginBottom: 24 }}>
              <Divider orientation="left">
                <Text strong style={{ fontSize: '16px' }}>
                  {termData.term}
                </Text>
              </Divider>
              <Table 
                dataSource={termData.payments} 
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
                    render: (amount) => <Text strong>GH₵{amount}</Text>
                  },
                  {
                    title: 'Paid',
                    dataIndex: 'paid',
                    key: 'paid',
                    render: (paid) => <Text strong style={{ color: '#52c41a' }}>GH₵{paid}</Text>
                  },
                  {
                    title: 'Due Date',
                    dataIndex: 'dueDate',
                    key: 'dueDate',
                    render: (date) => moment(date).format('MMM DD, YYYY'),
                    responsive: ['md']
                  },
                  {
                    title: 'Payment Date',
                    dataIndex: 'paymentDate',
                    key: 'paymentDate',
                    render: (date) => moment(date).format('MMM DD, YYYY HH:mm'),
                    responsive: ['md']
                  },
                  {
                    title: 'Processed By',
                    key: 'admin',
                    render: (_, record) => (
                      <Text strong>{record.admin_name || 'System'}</Text>
                    ),
                    responsive: ['lg']
                  }
                ]} 
                rowKey="id"
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
            </div>
          ))}
        </>
      )
    }
  ]}
/>
</Modal>
    </div>
  );
};

export default StudentFeeManagementPage;