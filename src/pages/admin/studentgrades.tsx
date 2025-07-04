import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Select, Button, Modal, Typography, 
  Row, Col, Tabs, Tag, message, Spin} from 'antd';
import { 
  FilePdfOutlined, DownloadOutlined, 
  BarChartOutlined, ProfileOutlined
} from '@ant-design/icons';
import { Document, Page, PDFViewer, Text as PdfText, View, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer';
import * as pdfjs from 'pdfjs-dist';
import moment from 'moment';
import { supabase } from '../../supabase';
import { useAuth } from '@/context/AuthContext';

// Initialize pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const { Option } = Select;
const { Text } = Typography;
const { TabPane } = Tabs;

// Extend jsPDF to include lastAutoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

// PDF Styles
const styles = StyleSheet.create({  
  // Student Info Section
  studentInfo: {
    flexDirection: 'row',
    padding: 3,
    fontSize: 8,
  },
  
  studentLeft: {
    width: '50%',
  },
  
  studentRight: {
    width: '50%',
  },
  
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  
  attendanceRow: {
    flexDirection: 'row',
    borderBottom: '1px solid black',
  },
  
  // Subject Performance Table
  subjectTable: {
    border: '1px solid black',
    marginTop: 5,
  },
  
  subjectHeader: {
    backgroundColor: '#000000',
    color: 'white',
    padding: 2,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  subjectCol: {
    width: '25%',
  },
  
  scoreCol: {
    width: '10%',
  },
  
  gradeCol: {
    width: '8%',
  },
  
  subjectTableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid black',
    minHeight: 12,
  },
  
  tableCell: {
    padding: 2,
    fontSize: 10,
    textAlign: 'center',
    borderRight: '1px solid black',
    justifyContent: 'center',
  },
  
  subjectName: {
    textAlign: 'left',
    paddingLeft: 3,
  },
  
  // Grading System Section
  gradingSection: {
    border: '1px solid black',
    marginTop: 5,
    flexDirection: 'row',
  },
  
  gradingLeft: {
    width: '50%',
    borderRight: '1px solid black',
  },
  
  gradingRight: {
    width: '50%',
  },
  
  gradingHeader: {
    backgroundColor: '#000000',
    color: 'white',
    padding: 2,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  gradingRow: {
    flexDirection: 'row',
    borderBottom: '1px solid black',
    minHeight: 10,
  },
  
  gradingCell: {
    flex: 1,
    padding: 2,
    fontSize: 7,
    textAlign: 'center',
    borderRight: '1px solid black',
    justifyContent: 'center',
  },
  
  commentsRow: {
    flexDirection: 'row',
    minHeight: 25,
  },
  
  commentsCell: {
    flex: 1,
    padding: 3,
    fontSize: 7,
    borderRight: '1px solid black',
  },
  
  signaturesRow: {
    flexDirection: 'row',
    minHeight: 40,
  },
  
  signatureCell: {
    flex: 1,
    padding: 10,
    textAlign: 'center',
    borderRight: '1px solid black',
    justifyContent: 'flex-end',
  },
  
  signatureLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    marginTop: 20,
  },

  // General Styles
  header: {
    marginBottom: 10,
    textAlign: 'center'
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 3
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  statItem: {
    width: '30%',
    border: '1px solid #f0f0f0',
    padding: 5
  },
  statTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3
  },
  statValue: {
    fontSize: 10
  },
  table: {
    border: '1px solid #f0f0f0',
    marginTop: 10
  },
  pdfTableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #f0f0f0'
  },
  tableColHeader: {
    padding: 5,
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    fontSize: 10,
    borderRight: '1px solid #f0f0f0'
  },
  tableCol: {
    padding: 5,
    fontSize: 10,
    borderRight: '1px solid #f0f0f0'
  },
  headerText: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  cellText: {
    fontSize: 10
  },
  landscapePage: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 20,
    backgroundColor: '#ffffff'
  },
  
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 15,
    backgroundColor: '#ffffff',
    lineHeight: 1.1,
  },
  
  // Header Section (removed topHeader)
  headerSection: {
    border: '2px solid #000000',
    marginBottom: 6,
  },
  
  schoolInfo: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    borderBottom: '2px solid #000000',
  },
  
  logoSection: {
    width: '15%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  logoImage: {
    width: 50,
    height: 50,
    objectFit: 'contain',
    border: '2px solid #000000',
  },
  
  logoPlaceholder: {
    width: 50,
    height: 50,
    border: '2px solid #000000',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
  },
  
  logoText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  
  schoolDetails: {
    width: '70%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  
  schoolName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8, // Increased spacing between name and slogan
    color: '#000000',
  },
  
  schoolSlogan: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  
  schoolAddress: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 2,
    fontWeight: 'bold',
    color: '#000000',
  },
  
  photoSection: {
    width: '15%',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #000000',
    height: 60,
    overflow: 'hidden',
  },
  
  studentPhoto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  
  photoText: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#666666',
  },
  
  department: {
    backgroundColor: '#000000',
    padding: 5,
    textAlign: 'center',
  },
  
  departmentText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Progress Report Header
  progressReportHeader: {
    backgroundColor: '#000000',
    padding: 5,
    textAlign: 'center',
    marginBottom: 4,
  },
  
  progressReportText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Student Information Section
  studentInfoSection: {
    border: '2px solid #000000',
    marginBottom: 6,
  },
  
  studentInfoRow: {
    flexDirection: 'row',
    padding: 8,
  },
  
  studentInfoLeft: {
    width: '50%',
    paddingRight: 8,
  },
  
  studentInfoRight: {
    width: '50%',
    paddingLeft: 8,
  },
  
  infoItem: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'center',
  },
  
  infoLabel: {
    width: '55%',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
  },
  
  infoValue: {
    width: '45%',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
  },
  
  // Attendance Section with improved column headers
  attendanceSection: {
    border: '2px solid #000000',
    marginBottom: 6,
  },
  
  attendanceHeader: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    minHeight: 24,
    alignItems: 'center',
  },
  
  attendanceHeaderText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  attendanceDataRow: {
    flexDirection: 'row',
    minHeight: 24,
    alignItems: 'center',
  },
  
  attendanceCell: {
    flex: 1,
    padding: 4,
    textAlign: 'center',
    borderRight: '2px solid #000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  attendanceCellLast: {
    flex: 1,
    padding: 4,
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  attendanceValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  
  // Performance Section
  performanceSection: {
    border: '2px solid #000000',
    marginBottom: 6,
  },
  
  performanceHeader: {
    backgroundColor: '#000000',
    padding: 5,
    textAlign: 'center',
  },
  
  performanceHeaderText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    minHeight: 22,
    alignItems: 'center',
    borderBottom: '2px solid #000000',
  },
  
  tableHeaderCell: {
    padding: 4,
    borderRight: '2px solid #000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  
  subjectColumn: {
    width: '28%',
  },
  
  scoreColumn: {
    width: '12%',
  },
  
  gradeColumn: {
    width: '10%',
  },
  
  performanceColumn: {
    width: '26%',
  },
  
  tableDataRow: {
    flexDirection: 'row',
    minHeight: 20,
    alignItems: 'center',
    borderBottom: '1px solid #000000',
  },
  
  tableDataCell: {
    padding: 4,
    borderRight: '2px solid #000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  subjectText: {
    fontSize: 8,
    color: '#000000',
    textAlign: 'left',
    paddingLeft: 3,
    fontWeight: 'bold',
  },
  
  scoreText: {
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  
  gradeText: {
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  
  performanceText: {
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  
  // Grading System Section
  gradingSystemSection: {
    border: '2px solid #000000',
    marginBottom: 6,
  },
  
  gradingSystemHeader: {
    backgroundColor: '#000000',
    padding: 5,
    textAlign: 'center',
  },
  
  gradingSystemHeaderText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  gradingSystemContent: {
    padding: 0,
  },
  
  gradingTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    minHeight: 20,
    alignItems: 'center',
    borderBottom: '2px solid #000000',
  },
  
  gradingHeaderCell: {
    flex: 1,
    padding: 4,
    borderRight: '2px solid #000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  gradingHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  
  gradingTableRow: {
    flexDirection: 'row',
    minHeight: 18,
    alignItems: 'center',
    borderBottom: '1px solid #000000',
  },
  
  gradingDataCell: {
    flex: 1,
    padding: 4,
    borderRight: '2px solid #000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  gradingDataText: {
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  
  // Comments Section
  commentsSection: {
    border: '2px solid #000000',
    marginBottom: 6,
  },
  
  commentsHeader: {
    backgroundColor: '#000000',
    padding: 5,
    textAlign: 'center',
  },
  
  commentsHeaderText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  commentsContent: {
    flexDirection: 'row',
    minHeight: 32,
  },
  
  commentBox: {
    flex: 1,
    padding: 6,
    borderRight: '2px solid #000000',
    justifyContent: 'flex-start',
  },
  
  commentTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 3,
  },
  
  commentText: {
    fontSize: 9,
    color: '#000000',
    lineHeight: 1.2,
    fontWeight: 'normal',
  },
  
  // Signatures Section
  signaturesSection: {
    border: '2px solid #000000',
    marginBottom: 4,
  },
  
  signaturesHeader: {
    backgroundColor: '#000000',
    padding: 5,
    textAlign: 'center',
  },
  
  signaturesHeaderText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  signaturesContent: {
    flexDirection: 'row',
    minHeight: 45,
  },
  
  signatureBox: {
    flex: 1,
    padding: 8,
    borderRight: '2px solid #000000',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  
  signatureTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  
  signatureName: {
    fontSize: 7,
    color: '#000000',
    borderTop: '1px solid #000000',
    paddingTop: 3,
    textAlign: 'center',
    minWidth: 80,
    fontWeight: 'bold',
  },
  
  // Footer
  footer: {
    textAlign: 'center',
    marginTop: 4,
    borderTop: '2px solid #000000',
    paddingTop: 4,
    backgroundColor: '#000000',
    padding: 4,
  },
  
  footerText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  
  footerDate: {
    fontSize: 7,
    color: '#ffffff',
    marginTop: 2,
  },
});

interface StudentGradesProps {
  schoolId: string;
  currentSemester?: string;
}

interface Class {
  id: string;
  name: string;
  grade: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Student {
  image_url: string | null;
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  roll_no: string;
  class_id: string;
  totalScore: number | null;
  letterGrade: string;
  gender: string;
  grades?: Grade[];
  rank?: number;
}

interface Grade {
  student_id: string;
  subject_id: string;
  score: number;
  max_score: number;
  category_id: string;
  teacher_id: string;
}

interface GradeScale {
  id: number;
  school_id: string;
  name: string;
  scale: Record<string, number>;
  is_default: boolean;
  created_at: string;
}

interface ComprehensiveStats {
  studentOverallScores: Record<string, {
    overallScore: number | null;
    overallLetterGrade: string;
    rank: number;
    subjectCount: number;
  }>;
  classAverage: number | null;
  topStudent: {
    student: { id: string; first_name: string; last_name: string };
    overallScore: number;
  } | null;
  subjectCount: number;
  studentCount: number;
  gradedStudentCount: number;
}

interface CalendarTerm {
  id: number;
  calendar_id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_break: boolean;
}

interface Holiday {
  id: number;
  calendar_id: number;
  name: string;
  date: string;
}

const StudentGrades: React.FC<StudentGradesProps> = ({ schoolId, currentSemester }) => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [gradeScale, setGradeScale] = useState<GradeScale | null>(null);
  const [selectedSemester, setSelectedSemester] = useState(currentSemester || moment().format('YYYY [Spring]'));
  const [studentSubjectGrades, setStudentSubjectGrades] = useState<Record<string, Record<string, { score: number | null; letterGrade: string; subject: string; subjectCode: string }>>>({});
  const [comprehensiveStats, setComprehensiveStats] = useState<ComprehensiveStats | null>(null);
  const [classRankings, setClassRankings] = useState<{ student: Student; overallScore: number | null; overallLetterGrade: string; subjectCount: number; rank: number }[]>([]);
  // Report states
  const [subjectReportVisible, setSubjectReportVisible] = useState(false);
  const [classReportVisible, setClassReportVisible] = useState(false);
  const [individualReportVisible, setIndividualReportVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  // Calendar data
  const [calendarTerms, setCalendarTerms] = useState<CalendarTerm[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<number | null>(null);

  const { school } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await fetchClasses();
        await fetchSchoolCalendars();
        await Promise.all([
          fetchSubjects(),
          fetchGradeScale()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
        message.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [schoolId]);

  useEffect(() => {
    if (selectedCalendar) {
      fetchCalendarTerms(selectedCalendar);
      fetchHolidays(selectedCalendar);
    }
  }, [selectedCalendar]);

  useEffect(() => {
    if (classes.length > 0 && subjects.length > 0 && selectedClass && students.length === 0) {
      fetchStudentsWithGrades();
    }
  }, [classes, subjects, selectedClass, students.length]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsWithGrades();
    }
  }, [selectedClass, selectedSubject, selectedSemester]);

  const fetchSchoolCalendars = async () => {
    const { data, error } = await supabase
      .from('school_calendar')
      .select('*')
      .eq('school_id', schoolId)
      .order('start_date', { ascending: true });

    if (error) throw error;
    
    // Set the first active calendar as selected by default
    const activeCalendar = data?.find(c => c.is_active);
    if (activeCalendar) {
      setSelectedCalendar(activeCalendar.id);
    }
  };

  const fetchCalendarTerms = async (calendarId: number) => {
    const { data, error } = await supabase
      .from('calendar_terms')
      .select('*')
      .eq('calendar_id', calendarId)
      .order('start_date', { ascending: true });

    if (error) throw error;
    setCalendarTerms(data || []);
  };

  const fetchHolidays = async (calendarId: number) => {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('calendar_id', calendarId)
      .order('date', { ascending: true });

    if (error) throw error;
    setHolidays(data || []);
  };

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    if (error) throw error;
    setClasses(data);
    if (data.length > 0) setSelectedClass(data[0]);
  };

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_id', schoolId);

    if (error) throw error;
    setSubjects(data || []);
  };

  const fetchGradeScale = async () => {
    try {
      const { data } = await supabase
        .from('grade_scales')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_default', true)
        .maybeSingle();

      if (data) {
        setGradeScale(data);
        return;
      }

      const { data: anyScaleData } = await supabase
        .from('grade_scales')
        .select('*')
        .eq('school_id', schoolId)
        .order('is_default', { ascending: false })
        .limit(1);

      if (anyScaleData && anyScaleData.length > 0) {
        setGradeScale(anyScaleData[0]);
        return;
      }

      setGradeScale({
        id: -1,
        school_id: schoolId,
        name: 'Default Scale',
        scale: { A: 90, B: 80, C: 70, D: 60, F: 0 },
        is_default: true,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching grade scale:', error);
      setGradeScale({
        id: -1,
        school_id: schoolId,
        name: 'Default Scale (Fallback)',
        scale: { A: 90, B: 80, C: 70, D: 60, F: 0 },
        is_default: true,
        created_at: new Date().toISOString()
      });
    }
  };

  const fetchStudentsWithGrades = async () => {
    if (!selectedClass) return;
  
    setLoading(true);
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, user_id, first_name, last_name, roll_no, class_id, image_url, gender')
        .eq('class_id', selectedClass.id);
  
      if (studentsError) throw studentsError;
      if (!studentsData || studentsData.length === 0) {
        setStudents([]);
        return;
      }
  
      let gradesQuery = supabase
        .from('grades')
        .select('*')
        .in('student_id', studentsData.map(s => s.user_id))
        .eq('semester', selectedSemester);
  
      if (selectedSubject) {
        gradesQuery = gradesQuery.eq('subject_id', selectedSubject.id);
      }
  
      const { data: gradesData, error: gradesError } = await gradesQuery;
      if (gradesError) throw gradesError;
  
      const subjectIds = selectedSubject 
        ? [selectedSubject.id] 
        : Array.from(new Set(gradesData?.map(g => g.subject_id) || []));
  
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('grade_categories')
        .select('*')
        .in('subject_id', subjectIds);
  
      if (categoriesError) throw categoriesError;
  
      const studentsWithGrades = studentsData.map(student => {
        const studentGrades = gradesData?.filter(g => g.student_id === student.user_id) || [];
        
        let totalScore = null;
        if (selectedSubject) {
          totalScore = calculateTotalScore(studentGrades, categoriesData.filter(c => c.subject_id === selectedSubject.id));
        } else if (gradesData && gradesData.length > 0) {
          const subjectScores = [];
          const subjectsWithGrades = Array.from(new Set(gradesData.filter(g => g.student_id === student.user_id).map(g => g.subject_id)));
          
          for (const subjectId of subjectsWithGrades) {
            const subjectGrades = gradesData.filter(g => 
              g.student_id === student.user_id && g.subject_id === subjectId
            );
            const subjectCategories = categoriesData.filter(c => c.subject_id === subjectId);
            const subjectScore = calculateTotalScore(subjectGrades, subjectCategories);
            if (subjectScore !== null) subjectScores.push(subjectScore);
          }
          
          totalScore = subjectScores.length > 0 
            ? subjectScores.reduce((sum, score) => sum + score, 0) / subjectScores.length 
            : null;
        }
  
        return {
          ...student,
          grades: studentGrades,
          totalScore,
          letterGrade: getLetterGrade(totalScore ?? 0) ?? 'N/A'
        };
      });
  
      setStudents(studentsWithGrades);
  
      if (!selectedSubject) {
        await fetchComprehensiveGrades(studentsWithGrades);
      }
    } catch (error) {
      console.error('Error loading student grades:', error);
      message.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const fetchComprehensiveGrades = async (studentsData: Student[]) => {
    try {
      const { data: allSubjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId);
  
      const studentSubjectScores: Record<string, Record<string, {
        score: number | null;
        letterGrade: string;
        subject: string;
        subjectCode: string;
      }>> = {};
      
      const studentOverallScores: Record<string, {
        student: Student;
        overallScore: number | null;
        overallLetterGrade: string;
        subjectCount: number;
        rank: number;
      }> = {};
  
      studentsData.forEach(student => {
        studentSubjectScores[student.id] = {};
        studentOverallScores[student.id] = {
          student,
          overallScore: null,
          overallLetterGrade: 'N/A',
          subjectCount: 0,
          rank: 0
        };
      });
  
      if (!allSubjects) return;
      await Promise.all(allSubjects.map(async subject => {
        const { data: subjectCategories } = await supabase
          .from('grade_categories')
          .select('*')
          .eq('subject_id', subject.id);
  
        if (!subjectCategories || subjectCategories.length === 0) return;
  
        const { data: subjectGrades } = await supabase
          .from('grades')
          .select('*')
          .in('student_id', studentsData.map(s => s.user_id))
          .eq('subject_id', subject.id)
          .eq('semester', selectedSemester);
  
        studentsData.forEach(student => {
          const grades = subjectGrades?.filter(g => g.student_id === student.user_id) || [];
          const score = grades.length > 0 ? 
            calculateTotalScore(grades, subjectCategories) : 
            null;
  
          studentSubjectScores[student.id][subject.id] = {
            score,
            letterGrade: score ? getLetterGrade(score) ?? 'N/A' : 'N/A',
            subject: subject.name,
            subjectCode: subject.code
          };
        });
      }));
  
      studentsData.forEach(student => {
        const subjectScores = Object.values(studentSubjectScores[student.id] || {})
          .map(subject => subject.score)
          .filter(score => score !== null) as number[];
  
        const overallScore = subjectScores.length > 0 ? 
          subjectScores.reduce((sum, score) => sum + score, 0) / subjectScores.length : 
          null;
  
        studentOverallScores[student.id] = {
          student,
          overallScore,
          overallLetterGrade: overallScore ? (getLetterGrade(overallScore) ?? 'N/A') : 'N/A',
          subjectCount: subjectScores.length,
          rank: 0
        };
      });
  
      const rankedStudents = Object.values(studentOverallScores)
        .filter(s => s.overallScore !== null)
        .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))
        .map((student, index) => ({
          ...student,
          rank: index + 1
        }));
  
      rankedStudents.forEach(student => {
        studentOverallScores[student.student.id].rank = student.rank;
      });
  
      setStudentSubjectGrades(studentSubjectScores);
      setComprehensiveStats({
        studentOverallScores,
        classAverage: calculateClassAverage(studentOverallScores),
        topStudent: rankedStudents[0] ? {
          student: rankedStudents[0].student,
          overallScore: rankedStudents[0].overallScore || 0
        } : null,
        subjectCount: allSubjects.length,
        studentCount: studentsData.length,
        gradedStudentCount: rankedStudents.length
      });
  
      setClassRankings(rankedStudents);
    } catch (error) {
      console.error('Error in fetchComprehensiveGrades:', error);
      message.error('Failed to load comprehensive grade data');
    }
  };

  const calculateClassAverage = (studentOverallScores: Record<string, { overallScore: number | null }>) => {
    let totalScore = 0;
    let validStudents = 0;
    
    Object.values(studentOverallScores).forEach(student => {
      if (student.overallScore !== null) {
        totalScore += student.overallScore;
        validStudents++;
      }
    });
    
    return validStudents > 0 ? totalScore / validStudents : null;
  };

  const calculateTotalScore = (studentGrades: Grade[], categories: { id: string; weight: number }[]) => {
    if (!studentGrades || studentGrades.length === 0) return null;
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    categories.forEach(category => {
      const categoryGrades = studentGrades.filter(g => g.category_id === category.id);
      if (categoryGrades.length > 0) {
        const categoryAvg = categoryGrades.reduce((sum, g) => sum + (g.score / g.max_score), 0) / categoryGrades.length;
        weightedSum += categoryAvg * category.weight;
        totalWeight += category.weight;
      }
    });
    
    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  };

  const getLetterGrade = (score: number | null) => {
    if (score === null) return 'N/A';
    if (!gradeScale) {
      if (score >= 90) return 'A+';
      if (score >= 85) return 'A';
      if (score >= 80) return 'A-';
      if (score >= 75) return 'B+';
      if (score >= 70) return 'B';
      if (score >= 65) return 'B-';
      if (score >= 60) return 'C+';
      if (score >= 55) return 'C';
      if (score >= 50) return 'C-';
      return 'F';
    }
  };

  const getCurrentTermAndVacationDates = () => {
    if (!calendarTerms.length) return { currentTerm: 'N/A', vacationDate: 'N/A', reopenDate: 'N/A' };
    
    const now = moment();
    let currentTerm = 'N/A';
    let vacationDate = 'N/A';
    let reopenDate = 'N/A';
    
    // Find current term
    const currentTermObj = calendarTerms.find(term => 
      moment(term.start_date).isSameOrBefore(now) && 
      moment(term.end_date).isSameOrAfter(now) &&
      !term.is_break
    );
    
    if (currentTermObj) {
      currentTerm = currentTermObj.name;
      vacationDate = moment(currentTermObj.end_date).format('DD/MM/YYYY');
      
      // Find next term (reopen date)
      const nextTerm = calendarTerms.find(term => 
        moment(term.start_date).isAfter(currentTermObj.end_date) &&
        !term.is_break
      );
      
      if (nextTerm) {
        reopenDate = moment(nextTerm.start_date).format('DD/MM/YYYY');
      }
    }
    
    return { currentTerm, vacationDate, reopenDate };
  };

  const calculateSchoolDays = () => {
    if (!calendarTerms.length || !holidays.length) return { daysOpen: 0, daysPresent: 0 };
    
    const { currentTerm } = getCurrentTermAndVacationDates();
    const term = calendarTerms.find(t => t.name === currentTerm && !t.is_break);
    
    if (!term) return { daysOpen: 0, daysPresent: 0 };
    
    const startDate = moment(term.start_date);
    const endDate = moment(term.end_date);
    
    // Calculate total days in term (excluding weekends)
    let totalDays = 0;
    let currentDate = startDate.clone();
    
    while (currentDate.isSameOrBefore(endDate)) {
      if (currentDate.day() !== 0 && currentDate.day() !== 6) { // Skip weekends
        totalDays++;
      }
      currentDate.add(1, 'day');
    }
    
    // Subtract holidays
    const termHolidays = holidays.filter(h => 
      moment(h.date).isSameOrAfter(startDate) && 
      moment(h.date).isSameOrBefore(endDate) &&
      moment(h.date).day() !== 0 && 
      moment(h.date).day() !== 6
    );
    
    const daysOpen = totalDays - termHolidays.length;
    
    // For demo purposes, assume 95% attendance
    const daysPresent = Math.round(daysOpen * 0.95);
    
    return { daysOpen, daysPresent };
  };

  const logoUrl = school?.logo_url || null;
  const schoolName = school?.name || 'School Name';
  const schoolAddress = school?.address || 'School Address';
  const schoolSlogan = school?.slogan || 'School Slogan';
  const schoolContact = school?.contact || 'School Contact';

  const gradingScale = [
    { grade: 'A', range: '80-100', points: '4.0', remark: 'Excellent' },
    { grade: 'B', range: '70-79', points: '3.0', remark: 'Good' },
    { grade: 'C', range: '60-69', points: '2.0', remark: 'Satisfactory' },
    { grade: 'D', range: '50-59', points: '1.0', remark: 'Pass' },
    { grade: 'F', range: '0-49', points: '0.0', remark: 'Fail' },
  ];

  const getPerformanceText = (score: number) => {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'VERY GOOD';
    if (score >= 70) return 'GOOD';
    if (score >= 60) return 'SATISFACTORY';
    if (score >= 50) return 'PASS';
    return 'FAIL';
  };

  const getScoreColor = (score: number | null): string => {
    if (!score) return '#8c8c8c';
    if (score >= 90) return '#52c41a';
    if (score >= 80) return '#73d13d';
    if (score >= 70) return '#faad14';
    if (score >= 60) return '#ff7a45';
    return '#ff4d4f';
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A': return 'green';
      case 'B': return 'blue';
      case 'C': return 'orange';
      case 'D': return 'volcano';
      case 'F': return 'red';
      default: return 'gray';
    }
  };

  const viewStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setIndividualReportVisible(true);
  };

  const viewComprehensiveReport = () => {
    setClassReportVisible(true);
  };

  const subjectColumns = [
    {
      title: 'Roll No',
      dataIndex: 'roll_no',
      key: 'roll_no',
      width: 100,
      sorter: (a: Student, b: Student) => a.roll_no.localeCompare(b.roll_no)
    },
    {
      title: 'Student Name',
      key: 'name',
      render: (_: unknown, record: Student) => `${record.first_name} ${record.last_name}`,
      sorter: (a: Student, b: Student) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    },
    {
      title: selectedSubject ? 'Subject Score' : 'Overall Average',
      key: 'totalScore',
      render: (_: unknown, record: Student) => (
        <Text strong style={{ color: getScoreColor(record.totalScore) }}>
          {record.totalScore ? `${record.totalScore.toFixed(2)}%` : 'N/A'}
        </Text>
      ),
      sorter: (a: Student, b: Student) => (a.totalScore || 0) - (b.totalScore || 0)
    },
    {
      title: 'Letter Grade',
      key: 'letterGrade',
      render: (_: unknown, record: Student) => (
        <Tag color={getGradeColor(record.letterGrade)}>
          {record.letterGrade || 'N/A'}
        </Tag>
      ),
      sorter: (a: Student, b: Student) => (a.letterGrade || '').localeCompare(b.letterGrade || '')
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Student) => (
        <Button 
          type="link" 
          onClick={() => viewStudentDetails(record)}
          icon={<ProfileOutlined />}
        >
          Details
        </Button>
      )
    }
  ];

  const comprehensiveColumns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      sorter: (a: Student, b: Student) => (a.rank || 0) - (b.rank || 0)
    },
    {
      title: 'Roll No',
      dataIndex: 'roll_no',
      key: 'roll_no',
      width: 100,
      sorter: (a: Student, b: Student) => a.roll_no.localeCompare(b.roll_no)
    },
    {
      title: 'Student Name',
      key: 'name',
      render: (_: unknown, record: Student) => `${record.first_name} ${record.last_name}`,
      sorter: (a: Student, b: Student) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    },
    {
      title: 'Average Score',
      key: 'overallScore',
      render: (_: unknown, record: Student) => {
        const studentData = comprehensiveStats?.studentOverallScores[record.id];
        return (
          <Text strong style={{ color: getScoreColor(studentData?.overallScore ?? null) }}>
            {studentData?.overallScore ? `${studentData.overallScore.toFixed(2)}%` : 'N/A'}
          </Text>
        );
      },
      sorter: (a: Student, b: Student) => {
        const aScore = comprehensiveStats?.studentOverallScores[a.id]?.overallScore || 0;
        const bScore = comprehensiveStats?.studentOverallScores[b.id]?.overallScore || 0;
        return aScore - bScore;
      }
    },
    {
      title: 'Letter Grade',
      key: 'overallLetterGrade',
      render: (_: unknown, record: Student) => {
        const studentData = comprehensiveStats?.studentOverallScores[record.id];
        return (
          <Tag color={getGradeColor(studentData?.overallLetterGrade || 'N/A')}>
            {studentData?.overallLetterGrade || 'N/A'}
          </Tag>
        );
      },
      sorter: (a: Student, b: Student) => {
        const aGrade = comprehensiveStats?.studentOverallScores[a.id]?.overallLetterGrade || '';
        const bGrade = comprehensiveStats?.studentOverallScores[b.id]?.overallLetterGrade || '';
        return aGrade.localeCompare(bGrade);
      }
    },
    {
      title: 'Percentile',
      key: 'percentile',
      render: (_: unknown, record: Student) => {
        if (!comprehensiveStats) return 'N/A';
        const studentData = comprehensiveStats.studentOverallScores[record.id];
        if (!studentData?.rank) return 'N/A';
        return `${((comprehensiveStats.gradedStudentCount - studentData.rank + 1) / comprehensiveStats.gradedStudentCount * 100).toFixed(1)}%`;
      },
      sorter: (a: Student, b: Student) => {
        const aRank = comprehensiveStats?.studentOverallScores[a.id]?.rank || (comprehensiveStats?.gradedStudentCount ?? 0) + 1;
        const bRank = comprehensiveStats?.studentOverallScores[b.id]?.rank || (comprehensiveStats?.gradedStudentCount ?? 0) + 1;
        return aRank - bRank;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Student) => (
        <Button 
          type="link" 
          onClick={() => viewStudentDetails(record)}
          icon={<ProfileOutlined />}
        >
          Details
        </Button>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '82vh' }}>
        <Spin size="large" tip="Loading grade data..." />
      </div>
    );
  }

  const StudentReportPdf = ({ 
    student, 
    selectedClass, 
    studentOverall, 
    subjectGrades,
    studentImageUrl  
  }: {
    student: any;
    selectedClass: any;
    selectedSemester: string;
    studentOverall: any;
    subjectGrades: any;
    studentImageUrl: string | null;
    calendarTerms: CalendarTerm[];
    holidays: Holiday[];
  }) => {
    const { currentTerm, vacationDate, reopenDate } = getCurrentTermAndVacationDates();
    const { daysOpen, daysPresent } = calculateSchoolDays();
    const classSize = students.filter(s => s.class_id === student.class_id).length;

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.schoolInfo}>
              <View style={styles.logoSection}>
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    style={styles.logoImage}
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <PdfText style={styles.logoText}>LOGO</PdfText>
                  </View>
                )}
              </View>
              
              <View style={styles.schoolDetails}>
                <PdfText style={styles.schoolName}>{schoolName}</PdfText>
                <PdfText style={styles.schoolSlogan}>{schoolSlogan}</PdfText>
                <PdfText style={styles.schoolAddress}>ADDRESS: {schoolAddress}</PdfText>
                <PdfText style={styles.schoolAddress}>TELEPHONE: {schoolContact}</PdfText>
              </View>
              
              <View style={styles.photoSection}>
                {studentImageUrl ? (
                  <Image
                    src={studentImageUrl}
                    style={styles.studentPhoto}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <PdfText style={styles.photoText}>STUDENT PHOTO</PdfText>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.department}>
              <PdfText style={styles.departmentText}>PRIMARY DEPARTMENT</PdfText>
            </View>
          </View>

          {/* Student Progress Report Header */}
          <View style={styles.progressReportHeader}>
            <PdfText style={styles.progressReportText}>STUDENT PROGRESS REPORT</PdfText>
          </View>

          {/* Student Information */}
          <View style={styles.studentInfoSection}>
            <View style={styles.studentInfoRow}>
              <View style={styles.studentInfoLeft}>
                <View style={styles.infoItem}>
                  <PdfText style={styles.infoLabel}>STUDENT ID NO:</PdfText>
                  <PdfText style={styles.infoValue}>SJ{student.roll_no || 'N/A'}</PdfText>
                </View>
                <View style={styles.infoItem}>
                  <PdfText style={styles.infoLabel}>NAME:</PdfText>
                  <PdfText style={styles.infoValue}>{student.first_name} {student.last_name}</PdfText>
                </View>
                <View style={styles.infoItem}>
                  <PdfText style={styles.infoLabel}>GRADE:</PdfText>
                  <PdfText style={styles.infoValue}>{selectedClass?.name || 'N/A'}</PdfText>
                </View>
                <View style={styles.infoItem}>
                  <PdfText style={styles.infoLabel}>YEAR:</PdfText>
                  <PdfText style={styles.infoValue}>{new Date().getFullYear()}</PdfText>
                </View>
              </View>
              <View style={styles.studentInfoRight}>
                <View style={styles.infoItem}>
                  <PdfText style={styles.infoLabel}>TERM:</PdfText>
                  <PdfText style={styles.infoValue}>{currentTerm}</PdfText>
                </View>
                <View style={styles.infoItem}>
                  <PdfText style={styles.infoLabel}>GENDER:</PdfText>
                  <PdfText style={styles.infoValue}>{student.gender || 'N/A'}</PdfText>
                </View>
                <View style={styles.infoItem}>
                  <PdfText style={styles.infoLabel}>AGE:</PdfText>
                  <PdfText style={styles.infoValue}>{student.age || 'N/A'}</PdfText>
                </View>
                <View style={styles.infoItem}>
                  <PdfText style={styles.infoLabel}>NUMBER ON ROLL:</PdfText>
                  <PdfText style={styles.infoValue}>{classSize}</PdfText>
                </View>
              </View>
            </View>
          </View>

          {/* Attendance Section */}
          <View style={styles.attendanceSection}>
            <View style={styles.attendanceHeader}>
              <View style={styles.attendanceCell}>
                <PdfText style={styles.attendanceHeaderText}>NO. DAYS OPEN</PdfText>
              </View>
              <View style={styles.attendanceCell}>
                <PdfText style={styles.attendanceHeaderText}>ATTENDANCE</PdfText>
              </View>
              <View style={styles.attendanceCell}>
                <PdfText style={styles.attendanceHeaderText}>LEARNER AVERAGE</PdfText>
              </View>
              <View style={styles.attendanceCell}>
                <PdfText style={styles.attendanceHeaderText}>VACATION DATE</PdfText>
              </View>
              <View style={styles.attendanceCellLast}>
                <PdfText style={styles.attendanceHeaderText}>NEXT TERM BEGINS</PdfText>
              </View>
            </View>
            <View style={styles.attendanceDataRow}>
              <View style={styles.attendanceCell}>
                <PdfText style={styles.attendanceValue}>{daysOpen}</PdfText>
              </View>
              <View style={styles.attendanceCell}>
                <PdfText style={styles.attendanceValue}>{daysPresent}</PdfText>
              </View>
              <View style={styles.attendanceCell}>
                <PdfText style={styles.attendanceValue}>{studentOverall.overallScore ? studentOverall.overallScore.toFixed(1) : 'N/A'}</PdfText>
              </View>
              <View style={styles.attendanceCell}>
                <PdfText style={styles.attendanceValue}>{vacationDate}</PdfText>
              </View>
              <View style={styles.attendanceCellLast}>
                <PdfText style={styles.attendanceValue}>{reopenDate}</PdfText>
              </View>
            </View>
          </View>

          {/* Subject Performance Table */}
          <View style={styles.performanceSection}>
            <View style={styles.performanceHeader}>
              <PdfText style={styles.performanceHeaderText}>PERFORMANCE BREAKDOWN</PdfText>
            </View>
            
            <View style={styles.tableHeaderRow}>
              <View style={[styles.tableHeaderCell, styles.subjectColumn]}>
                <PdfText style={styles.tableHeaderText}>SUBJECT</PdfText>
              </View>
              <View style={[styles.tableHeaderCell, styles.scoreColumn]}>
                <PdfText style={styles.tableHeaderText}>CLASS</PdfText>
              </View>
              <View style={[styles.tableHeaderCell, styles.scoreColumn]}>
                <PdfText style={styles.tableHeaderText}>EXAM</PdfText>
              </View>
              <View style={[styles.tableHeaderCell, styles.scoreColumn]}>
                <PdfText style={styles.tableHeaderText}>TOTAL</PdfText>
              </View>
              <View style={[styles.tableHeaderCell, styles.gradeColumn]}>
                <PdfText style={styles.tableHeaderText}>GRADE</PdfText>
              </View>
              <View style={[styles.tableHeaderCell, styles.performanceColumn]}>
                <PdfText style={styles.tableHeaderText}>PERFORMANCE</PdfText>
              </View>
            </View>

            {Object.values(subjectGrades).map((subject: any, index: number) => (
              <View style={styles.tableDataRow} key={subject.subjectCode || index}>
                <View style={[styles.tableDataCell, styles.subjectColumn]}>
                  <PdfText style={styles.subjectText}>{subject.subject || 'N/A'}</PdfText>
                </View>
                <View style={[styles.tableDataCell, styles.scoreColumn]}>
                  <PdfText style={styles.scoreText}>{subject.classScore || '0.0'}</PdfText>
                </View>
                <View style={[styles.tableDataCell, styles.scoreColumn]}>
                  <PdfText style={styles.scoreText}>{subject.examScore || '0.0'}</PdfText>
                </View>
                <View style={[styles.tableDataCell, styles.scoreColumn]}>
                  <PdfText style={styles.scoreText}>{subject.score ? subject.score.toFixed(1) : '0.0'}</PdfText>
                </View>
                <View style={[styles.tableDataCell, styles.gradeColumn]}>
                  <PdfText style={styles.gradeText}>{subject.letterGrade || getLetterGrade(subject.score || 0)}</PdfText>
                </View>
                <View style={[styles.tableDataCell, styles.performanceColumn]}>
                  <PdfText style={styles.performanceText}>{getPerformanceText(subject.score || 0)}</PdfText>
                </View>
              </View>
            ))}
          </View>

          {/* Grading System */}
          <View style={styles.gradingSystemSection}>
            <View style={styles.gradingSystemHeader}>
              <PdfText style={styles.gradingSystemHeaderText}>GRADING SYSTEM</PdfText>
            </View>
            <View style={styles.gradingSystemContent}>
              <View style={styles.gradingTableHeader}>
                <View style={styles.gradingHeaderCell}>
                  <PdfText style={styles.gradingHeaderText}>GRADE</PdfText>
                </View>
                <View style={styles.gradingHeaderCell}>
                  <PdfText style={styles.gradingHeaderText}>MARKS</PdfText>
                </View>
                <View style={styles.gradingHeaderCell}>
                  <PdfText style={styles.gradingHeaderText}>POINTS</PdfText>
                </View>
                <View style={styles.gradingHeaderCell}>
                  <PdfText style={styles.gradingHeaderText}>REMARK</PdfText>
                </View>
              </View>
              {gradingScale.map((grade, index) => (
                <View style={styles.gradingTableRow} key={index}>
                  <View style={styles.gradingDataCell}>
                    <PdfText style={styles.gradingDataText}>{grade.grade}</PdfText>
                  </View>
                  <View style={styles.gradingDataCell}>
                    <PdfText style={styles.gradingDataText}>{grade.range}</PdfText>
                  </View>
                  <View style={styles.gradingDataCell}>
                    <PdfText style={styles.gradingDataText}>{grade.points}</PdfText>
                  </View>
                  <View style={styles.gradingDataCell}>
                    <PdfText style={styles.gradingDataText}>{grade.remark}</PdfText>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <PdfText style={styles.commentsHeaderText}>TEACHER COMMENTS</PdfText>
            </View>
            <View style={styles.commentsContent}>
              <View style={styles.commentBox}>
                <PdfText style={styles.commentTitle}>CONDUCT</PdfText>
                <PdfText style={styles.commentText}>Good behavior and participation in class activities.</PdfText>
              </View>
              <View style={styles.commentBox}>
                <PdfText style={styles.commentTitle}>STUDENT INTEREST</PdfText>
                <PdfText style={styles.commentText}>Shows keen interest in learning and asks relevant questions.</PdfText>
              </View>
              <View style={styles.commentBox}>
                <PdfText style={styles.commentTitle}>GENERAL CLASS TEACHER REMARKS</PdfText>
                <PdfText style={styles.commentText}>
                  {studentOverall.overallScore >= 80 
                    ? "Excellent performance. Keep up the good work!" 
                    : studentOverall.overallScore >= 60 
                    ? "Good effort. Room for improvement in some areas."
                    : "Needs more attention and practice in most subjects."}
                </PdfText>
              </View>
            </View>
          </View>

          {/* Signatures Section */}
          <View style={styles.signaturesSection}>
            <View style={styles.signaturesHeader}>
              <PdfText style={styles.signaturesHeaderText}>SIGNATURES</PdfText>
            </View>
            <View style={styles.signaturesContent}>
              <View style={styles.signatureBox}>
                <PdfText style={styles.signatureTitle}>ACADEMIC HEAD</PdfText>
                <PdfText style={styles.signatureName}>BAAFOUR ADUAMOAH</PdfText>
              </View>
              <View style={styles.signatureBox}>
                <PdfText style={styles.signatureTitle}>CLASS FACILITATOR</PdfText>
                <PdfText style={styles.signatureName}>N/A</PdfText>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <PdfText style={styles.footerText}>ST. JOBA LEARNING CENTRE</PdfText>
            <PdfText style={styles.footerDate}>Generated on: {moment().format('MMMM Do YYYY')}</PdfText>
          </View>
        </Page>
      </Document>
    );
  };

  const SubjectReportPdf = ({
    selectedClass,
    selectedSubject,
    selectedSemester,
    students
  }: {
    selectedClass: Class | null;
    selectedSubject: Subject | null;
    selectedSemester: string;
    students: Student[];
  }) => {
    const subjectAverage = students.reduce((sum, student) => sum + (student.totalScore || 0), 0) / 
      students.filter(s => s.totalScore !== null).length;

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <PdfText style={styles.title}>Subject Grade Report</PdfText>
            <PdfText style={styles.subtitle}>
              {selectedClass?.name || 'N/A'} - {selectedSubject?.name || 'N/A'}
            </PdfText>
            <PdfText style={styles.subtitle}>
              {selectedSemester}
            </PdfText>
            <PdfText style={styles.subtitle}>
              Generated on: {moment().format('MMMM Do YYYY')}
            </PdfText>
          </View>

          {/* Subject Statistics */}
          <PdfText style={styles.sectionTitle}>Subject Statistics</PdfText>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <PdfText style={styles.statTitle}>Subject Average</PdfText>
              <PdfText style={styles.statValue}>
                {subjectAverage.toFixed(2)}%
              </PdfText>
            </View>
            <View style={styles.statItem}>
              <PdfText style={styles.statTitle}>Letter Grade</PdfText>
              <PdfText style={styles.statValue}>
                {getLetterGrade(subjectAverage)}
              </PdfText>
            </View>
            <View style={styles.statItem}>
              <PdfText style={styles.statTitle}>Students Assessed</PdfText>
              <PdfText style={styles.statValue}>
                {students.filter(s => s.totalScore !== null).length}/{students.length}
              </PdfText>
            </View>
          </View>

          {/* Student Grades */}
          <PdfText style={styles.sectionTitle}>Student Grades</PdfText>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.pdfTableRow}>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Roll No</PdfText>
              </View>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Student Name</PdfText>
              </View>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Score</PdfText>
              </View>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Grade</PdfText>
              </View>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Performance</PdfText>
              </View>
            </View>
            
            {/* Table Rows */}
            {students.map((student) => (
              <View style={styles.pdfTableRow} key={student.id}>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>SJ{student.roll_no}</PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>
                    {student.first_name} {student.last_name}
                  </PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>
                    {student.totalScore ? student.totalScore.toFixed(2) + '%' : 'N/A'}
                  </PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>
                    {getLetterGrade(student.totalScore ?? 0) || 'N/A'}
                  </PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.performanceText}>
                    {getPerformanceText(student.totalScore ?? 0)}
                  </PdfText>
                </View>
              </View>
            ))}
          </View>
        </Page>
      </Document>
    );
  };

  const ClassReportPdf = ({
    selectedClass,
    selectedSemester,
    comprehensiveStats,
    classRankings
  }: {
    selectedClass: Class | null;
    selectedSemester: string;
    comprehensiveStats: ComprehensiveStats | null;
    classRankings: { student: Student; overallScore: number | null; overallLetterGrade: string; subjectCount: number; rank: number }[];
  }) => {
    const gradeDistribution = {
      A: 0, B: 0, C: 0, D: 0, F: 0, NA: 0
    };
    
    Object.values(comprehensiveStats?.studentOverallScores || {}).forEach((student: any) => {
      if (!student.overallScore) {
        gradeDistribution.NA++;
      } else if (student.overallLetterGrade === 'A') {
        gradeDistribution.A++;
      } else if (student.overallLetterGrade === 'B') {
        gradeDistribution.B++;
      } else if (student.overallLetterGrade === 'C') {
        gradeDistribution.C++;
      } else if (student.overallLetterGrade === 'D') {
        gradeDistribution.D++;
      } else if (student.overallLetterGrade === 'F') {
        gradeDistribution.F++;
      }
    });

    const totalStudents = comprehensiveStats?.gradedStudentCount || 0;

    return (
      <Document>
        <Page size="A4" orientation="landscape" style={styles.landscapePage}>
          {/* Header */}
          <View style={styles.header}>
            <PdfText style={styles.title}>Comprehensive Class Report</PdfText>
            <PdfText style={styles.subtitle}>
              {selectedClass?.name} - {selectedSemester}
            </PdfText>
            <PdfText style={styles.subtitle}>
              Generated on: {moment().format('MMMM Do YYYY')}
            </PdfText>
          </View>

          {/* Class Statistics */}
          <PdfText style={styles.sectionTitle}>Class Statistics</PdfText>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <PdfText style={styles.statTitle}>Total Students</PdfText>
              <PdfText style={styles.statValue}>
                {comprehensiveStats?.studentCount || 0}
              </PdfText>
            </View>
            <View style={styles.statItem}>
              <PdfText style={styles.statTitle}>Students with Grades</PdfText>
              <PdfText style={styles.statValue}>
                {comprehensiveStats?.gradedStudentCount || 0}
              </PdfText>
            </View>
            <View style={styles.statItem}>
              <PdfText style={styles.statTitle}>Class Average</PdfText>
              <PdfText style={styles.statValue}>
                {comprehensiveStats?.classAverage ? comprehensiveStats.classAverage.toFixed(2) + '%' : 'N/A'}
              </PdfText>
            </View>
            <View style={styles.statItem}>
              <PdfText style={styles.statTitle}>Top Student</PdfText>
              <PdfText style={styles.statValue}>
                {comprehensiveStats?.topStudent ? 
                  `${comprehensiveStats.topStudent.student.first_name} ${comprehensiveStats.topStudent.student.last_name}` : 
                  'N/A'}
              </PdfText>
            </View>
          </View>

          {/* Grade Distribution */}
          <PdfText style={styles.sectionTitle}>Grade Distribution</PdfText>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.pdfTableRow}>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Grade</PdfText>
              </View>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Count</PdfText>
              </View>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Percentage</PdfText>
              </View>
            </View>
            
            {/* Table Rows */}
            {Object.entries(gradeDistribution).map(([grade, count]) => (
              <View style={styles.pdfTableRow} key={grade}>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>{grade}</PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>{count}</PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>
                    {totalStudents > 0 ? ((count / totalStudents) * 100).toFixed(1) + '%' : '0%'}
                  </PdfText>
                </View>
              </View>
            ))}
          </View>

          {/* Student Rankings */}
          <PdfText style={styles.sectionTitle}>Student Rankings</PdfText>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.pdfTableRow}>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Rank</PdfText>
              </View>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Student</PdfText>
              </View>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Average</PdfText>
              </View>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Grade</PdfText>
              </View>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Percentile</PdfText>
              </View>
            </View>
            
            {/* Table Rows */}
            {classRankings.map((student, index) => (
              <View style={styles.pdfTableRow} key={student.student.id}>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>{index + 1}</PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>
                    {student.student.first_name} {student.student.last_name}
                  </PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>
                    {student.overallScore !== null ? student.overallScore.toFixed(2) + '%' : 'N/A'}
                  </PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>
                    {student.overallLetterGrade}
                  </PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>
                    {((comprehensiveStats?.gradedStudentCount || 0 - index) / (comprehensiveStats?.gradedStudentCount || 1) * 100).toFixed(1)}%
                  </PdfText>
                </View>
              </View>
            ))}
          </View>
        </Page>
      </Document>
    );
  };

  return (
    <div className="p-4 min-h-screen">
      <Card 
        title={
          <div className="flex justify-between items-center">
            <span>Student Grades Management</span>
            <div>
              <Button 
                type="primary" 
                onClick={viewComprehensiveReport}
                icon={<BarChartOutlined />}
                className="mr-2"
              >
                Class Overview
              </Button>
              <PDFDownloadLink 
                document={
                  <ClassReportPdf
                    selectedClass={selectedClass}
                    selectedSemester={selectedSemester}
                    comprehensiveStats={comprehensiveStats}
                    classRankings={classRankings}
                  />
                } 
                fileName={`Class_Report_${selectedClass?.name}_${selectedSemester}.pdf`}
              >
                {({ loading }) => (
                  <Button 
                    type="primary" 
                    icon={<FilePdfOutlined />}
                    loading={loading}
                  >
                    Download Class Report
                  </Button>
                )}
              </PDFDownloadLink>
            </div>
          </div>
        } 
        bordered={false}
      >
        <Row gutter={16} className="mb-4">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              className="w-full"
              placeholder="Select Class"
              value={selectedClass?.id}
              onChange={(value) => {
                setSelectedClass(classes.find(c => c.id === value) || null);
                setStudents([]);
              }}
            >
              {classes.map(cls => (
                <Option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.grade}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              className="w-full"
              placeholder="Select Subject"
              value={selectedSubject ? selectedSubject.id : 'all'}
              onChange={(value) => {
                setSelectedSubject(value === 'all' ? null : subjects.find(s => s.id === value) || null);
              }}
            >
              <Option key="all" value="all">
                <div className="font-semibold">All Subjects</div>
              </Option>
              {subjects.map(sub => (
                <Option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              className="w-full"
              placeholder="Select Semester"
              value={selectedSemester}
              onChange={(value) => {
                setSelectedSemester(value);
                setStudents([]);
              }}
            >
              <Option value={`${moment().year()} Spring`}>Spring {moment().year()}</Option>
              <Option value={`${moment().year()} Fall`}>Fall {moment().year()}</Option>
              <Option value={`${moment().year() - 1} Spring`}>Spring {moment().year() - 1}</Option>
              <Option value={`${moment().year() - 1} Fall`}>Fall {moment().year() - 1}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            {selectedSubject ? (
              <PDFDownloadLink 
                document={
                  <SubjectReportPdf
                    selectedClass={selectedClass}
                    selectedSubject={selectedSubject}
                    selectedSemester={selectedSemester}
                    students={students}
                  />
                } 
                fileName={`Subject_Report_${selectedClass?.name}_${selectedSubject?.code}_${selectedSemester}.pdf`}
              >
                {({ loading }) => (
                  <Button 
                    type="primary" 
                    className="w-full"
                    icon={<FilePdfOutlined />}
                    loading={loading}
                  >
                    Download Subject Report
                  </Button>
                )}
              </PDFDownloadLink>
            ) : (
              <PDFDownloadLink 
                document={
                  <ClassReportPdf
                    selectedClass={selectedClass}
                    selectedSemester={selectedSemester}
                    comprehensiveStats={comprehensiveStats}
                    classRankings={classRankings}
                  />
                } 
                fileName={`Class_Report_${selectedClass?.name}_${selectedSemester}.pdf`}
              >
                {({ loading }) => (
                  <Button 
                    type="primary" 
                    className="w-full"
                    icon={<FilePdfOutlined />}
                    loading={loading}
                  >
                    Download Class Report
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </Col>
        </Row>

        <Tabs defaultActiveKey="subjectView">
          <TabPane tab="Subject Grades" key="subjectView">
            <Table
              columns={subjectColumns}
              dataSource={students}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              bordered
            />
          </TabPane>
          <TabPane tab="Class Rankings" key="comprehensiveView">
            <Table
              columns={comprehensiveColumns}
              dataSource={classRankings.map(item => item.student)}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              bordered
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Class Report Modal */}
      <Modal
        title={`Class Comprehensive Report - ${selectedClass?.name}`}
        visible={classReportVisible}
        onCancel={() => setClassReportVisible(false)}
        width={1000}
        footer={null}
      >
        <div style={{ height: '80vh' }}>
          <PDFViewer width="100%" height="100%">
            <ClassReportPdf
              selectedClass={selectedClass}
              selectedSemester={selectedSemester}
              comprehensiveStats={comprehensiveStats}
              classRankings={classRankings}
            />
          </PDFViewer>
          
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <PDFDownloadLink 
              document={
                <ClassReportPdf
                  selectedClass={selectedClass}
                  selectedSemester={selectedSemester}
                  comprehensiveStats={comprehensiveStats}
                  classRankings={classRankings}
                />
              } 
              fileName={`Class_Report_${selectedClass?.name}_${selectedSemester}.pdf`}
            >
              {({ loading }) => (
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                  loading={loading}
                >
                  {loading ? 'Preparing document...' : 'Download Report'}
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        </div>
      </Modal>

      {/* Subject Report Modal */}
      <Modal
        title={`Subject Report - ${selectedSubject?.name || 'All Subjects'}`}
        visible={subjectReportVisible}
        onCancel={() => setSubjectReportVisible(false)}
        width={1000}
        footer={null}
      >
        <div style={{ height: '80vh' }}>
          <PDFViewer width="100%" height="100%">
            <SubjectReportPdf
              selectedClass={selectedClass}
              selectedSubject={selectedSubject}
              selectedSemester={selectedSemester}
              students={students}
            />
          </PDFViewer>
          
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <PDFDownloadLink 
              document={
                <SubjectReportPdf
                  selectedClass={selectedClass}
                  selectedSubject={selectedSubject}
                  selectedSemester={selectedSemester}
                  students={students}
                />
              } 
              fileName={`Subject_Report_${selectedClass?.name}_${selectedSubject?.code || 'All'}_${selectedSemester}.pdf`}
            >
              {({ loading }) => (
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                  loading={loading}
                >
                  {loading ? 'Preparing document...' : 'Download Report'}
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        </div>
      </Modal>

      {/* Individual Report Modal */}
      <Modal
        title={`Student Report - ${selectedStudent?.first_name} ${selectedStudent?.last_name}`}
        visible={individualReportVisible}
        onCancel={() => setIndividualReportVisible(false)}
        width={1000}
        footer={null}
      >
        <div style={{ height: '80vh' }}>
          {selectedStudent && (
            <>
              <PDFViewer width="100%" height="100%">
                <StudentReportPdf 
                  student={selectedStudent}
                  selectedClass={selectedClass}
                  selectedSemester={selectedSemester}
                  studentOverall={comprehensiveStats?.studentOverallScores[selectedStudent.id] || {}}
                  subjectGrades={studentSubjectGrades[selectedStudent.id] || {}}
                  studentImageUrl={selectedStudent.image_url}
                  calendarTerms={calendarTerms}
                  holidays={holidays}
                />
              </PDFViewer>
              
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <PDFDownloadLink 
                  document={
                    <StudentReportPdf 
                      student={selectedStudent}
                      selectedClass={selectedClass}
                      selectedSemester={selectedSemester}
                      studentOverall={comprehensiveStats?.studentOverallScores[selectedStudent.id] || {}}
                      subjectGrades={studentSubjectGrades[selectedStudent.id] || {}} 
                      studentImageUrl={selectedStudent.image_url}
                      calendarTerms={calendarTerms}
                      holidays={holidays}              
                    />
                  } 
                  fileName={`Student_Report_${selectedStudent.first_name}_${selectedStudent.last_name}_${selectedSemester}.pdf`}
                >
                  {({ loading }) => (
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />}
                      loading={loading}
                    >
                      {loading ? 'Preparing document...' : 'Download Report'}
                    </Button>
                  )}
                </PDFDownloadLink>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default StudentGrades;