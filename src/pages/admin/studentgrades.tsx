import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Select, Button, Modal, Typography, 
  Row, Col, Tabs, Tag, message, Spin} from 'antd';
import { 
  FilePdfOutlined, DownloadOutlined, 
  BarChartOutlined, ProfileOutlined
} from '@ant-design/icons';
import { Document, Page, PDFViewer, Text as PdfText, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
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
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    paddingTop: 20,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  
  // Header Section
  headerSection: {
    border: '2px solid black',
    marginBottom: 5,
  },
  
  topHeader: {
    backgroundColor: '#000000',
    color: 'white',
    padding: 2,
    textAlign: 'center',
  },
  
  schoolInfo: {
    flexDirection: 'row',
    padding: 5,
    borderBottom: '1px solid black',
  },
  
  logoSection: {
    width: '15%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  schoolDetails: {
    width: '70%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  photoSection: {
    width: '15%',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid black',
    height: 60,
  },
  
  schoolName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  
  schoolSlogan: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#1890ff',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: 1,
  },

  schoolAddress: {
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 1,
  },
  
  department: {
    backgroundColor: '#000000',
    color: 'white',
    padding: 2,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 'bold',
  },
  
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
  
  infoLabel: {
    width: '40%',
    fontWeight: 'bold',
  },
  
  infoValue: {
    width: '60%',
  },
  
  // Performance Section Header
  performanceHeader: {
    backgroundColor: '#000000',
    color: 'white',
    padding: 3,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 5,
  },
  
  // Days and Attendance Section
  attendanceSection: {
    border: '1px solid black',
    marginTop: 2,
  },
  
  attendanceHeader: {
    backgroundColor: '#000000',
    color: 'white',
    padding: 2,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  attendanceRow: {
    flexDirection: 'row',
    borderBottom: '1px solid black',
  },
  
  attendanceCell: {
    flex: 1,
    padding: 2,
    textAlign: 'center',
    fontSize: 7,
    borderRight: '1px solid black',
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
  
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid black',
  },
  
  tableHeaderCell: {
    padding: 2,
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    borderRight: '1px solid black',
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
    fontSize: 7,
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
  
  // Comments Section
  commentsSection: {
    border: '1px solid black',
    marginTop: 5,
  },
  
  commentsHeader: {
    backgroundColor: '#000000',
    color: 'white',
    padding: 2,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
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
  
  // Signatures Section
  signaturesSection: {
    border: '1px solid black',
    marginTop: 5,
  },
  
  signaturesHeader: {
    backgroundColor: '#000000',
    color: 'white',
    padding: 2,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
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
  
  // Footer
  footer: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 6,
    color: '#666666',
  },

    // PDF styles:
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
  performanceText: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  landscapePage: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 20,
    backgroundColor: '#ffffff'
  }
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
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  roll_no: string;
  class_id: string;
  totalScore: number | null;
  letterGrade: string;
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

  const { school } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await fetchClasses();
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
    if (classes.length > 0 && subjects.length > 0 && selectedClass && students.length === 0) {
      fetchStudentsWithGrades();
    }
  }, [classes, subjects, selectedClass, students.length]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsWithGrades();
    }
  }, [selectedClass, selectedSubject, selectedSemester]);

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
        .select('id, user_id, first_name, last_name, roll_no, class_id')
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

  const logoUrl = school?.logo_url || null;
  const schoolName = school?.name || 'School Name';
  const schoolAddress = school?.address || 'School Address';
  const schoolSlogan = school?.slogan || 'School Slogan';
  const schoolContact = school?.contact || 'School Contact';

  const gradingScale = [
    { grade: 'A+', range: '90-100', points: '4.0', remark: 'EXCELLENT' },
    { grade: 'A', range: '85-89', points: '3.7', remark: 'VERY GOOD' },
    { grade: 'A-', range: '80-84', points: '3.3', remark: 'GOOD' },
    { grade: 'B+', range: '75-79', points: '3.0', remark: 'SATISFACTORY' },
    { grade: 'B', range: '70-74', points: '2.7', remark: 'PASS' },
    { grade: 'B-', range: '65-69', points: '2.3', remark: 'PASS' },
    { grade: 'C+', range: '60-64', points: '2.0', remark: 'PASS' },
    { grade: 'C', range: '55-59', points: '1.7', remark: 'PASS' },
    { grade: 'C-', range: '50-54', points: '1.3', remark: 'PASS' },
    { grade: 'F', range: '0-49', points: '0.0', remark: 'FAIL' },
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
    selectedSemester, 
    studentOverall, 
    subjectGrades 
  }: {
    student: any;
    selectedClass: any;
    selectedSemester: string;
    studentOverall: any;
    subjectGrades: any;
  }) => {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.topHeader}>
              <PdfText>#UNKNOWN#</PdfText>
            </View>
            
            <View style={styles.schoolInfo}>
                <View style={styles.logoSection}>
                {/* School Logo */}
                {logoUrl ? (
                  // @ts-ignore: Image is available in @react-pdf/renderer
                  <Image
                  src={logoUrl}
                  style={{ width: 40, height: 40, objectFit: 'contain', border: '1px solid black' }}
                  />
                ) : (
                  <View style={{ width: 40, height: 40, border: '1px solid black', alignItems: 'center', justifyContent: 'center' }}>
                  <PdfText style={{ fontSize: 6 }}>LOGO</PdfText>
                  </View>
                )}
                </View>
              
                <View style={styles.schoolDetails}>
                <PdfText style={styles.schoolName}>{schoolName}</PdfText>
                <PdfText style={{
                  fontSize: 9,
                  fontStyle: 'italic',
                  color: '#1890ff',
                  textAlign: 'center',
                  marginBottom: 2,
                  letterSpacing: 1,
                }}>
                  {schoolSlogan}
                </PdfText>
                <PdfText style={styles.schoolAddress}>ADDRESS: {schoolAddress}</PdfText>
                <PdfText style={styles.schoolAddress}>TELEPHONE: {schoolContact}</PdfText>
                </View>
              
              <View style={styles.photoSection}>
                <PdfText style={{ fontSize: 6 }}>STUDENT PHOTO</PdfText>
              </View>
            </View>
            
            <View style={styles.department}>
              <PdfText>PRIMARY DEPARTMENT</PdfText>
            </View>
          </View>

          {/* Student Progress Report Header */}
          <View style={styles.performanceHeader}>
            <PdfText>STUDENT PROGRESS REPORT</PdfText>
          </View>

          {/* Student Information */}
          <View style={styles.studentInfo}>
            <View style={styles.studentLeft}>
              <View style={styles.infoRow}>
                <PdfText style={styles.infoLabel}>STUDENT ID #:</PdfText>
                <PdfText style={styles.infoValue}>{student.roll_no || 'N/A'}</PdfText>
              </View>
              <View style={styles.infoRow}>
                <PdfText style={styles.infoLabel}>NAME:</PdfText>
                <PdfText style={styles.infoValue}>{student.first_name} {student.last_name}</PdfText>
              </View>
              <View style={styles.infoRow}>
                <PdfText style={styles.infoLabel}>GRADE:</PdfText>
                <PdfText style={styles.infoValue}>{selectedClass?.name || 'N/A'}</PdfText>
              </View>
            </View>
            <View style={styles.studentRight}>
              <View style={styles.infoRow}>
                <PdfText style={styles.infoLabel}>TERM:</PdfText>
                <PdfText style={styles.infoValue}>{selectedSemester}</PdfText>
              </View>
              <View style={styles.infoRow}>
                <PdfText style={styles.infoLabel}>GENDER:</PdfText>
                <PdfText style={styles.infoValue}>{student.gender || 'N/A'}</PdfText>
              </View>
              <View style={styles.infoRow}>
                <PdfText style={styles.infoLabel}>HOUSE/COLOUR:</PdfText>
                <PdfText style={styles.infoValue}>N/A</PdfText>
              </View>
            </View>
          </View>

          {/* Attendance Section */}
          <View style={styles.attendanceSection}>
            <View style={styles.attendanceHeader}>
              <PdfText>NO. DAYS OPEN | ATTENDANCE | NAME AVERAGE | VACATION DATE | NEXT TERM BEGINS</PdfText>
            </View>
            <View style={styles.attendanceRow}>
              <View style={styles.attendanceCell}>
                <PdfText>95</PdfText>
              </View>
              <View style={styles.attendanceCell}>
                <PdfText>92</PdfText>
              </View>
              <View style={styles.attendanceCell}>
                <PdfText>{studentOverall.overallScore ? studentOverall.overallScore.toFixed(1) : 'N/A'}</PdfText>
              </View>
              <View style={styles.attendanceCell}>
                <PdfText>19/12/2025</PdfText>
              </View>
              <View style={styles.attendanceCell}>
                <PdfText>06/01/2026</PdfText>
              </View>
            </View>
          </View>

          {/* Subject Performance Table */}
          <View style={styles.subjectTable}>
            <View style={styles.subjectHeader}>
              <PdfText>PERFORMANCE BREAKDOWN</PdfText>
            </View>
            
            <View style={styles.tableHeaderRow}>
              <View style={[styles.tableHeaderCell, styles.subjectCol]}>
                <PdfText>SUBJECT</PdfText>
              </View>
              <View style={[styles.tableHeaderCell, styles.scoreCol]}>
                <PdfText>CLASS SCORE</PdfText>
              </View>
              <View style={[styles.tableHeaderCell, styles.scoreCol]}>
                <PdfText>EXAM SCORE</PdfText>
              </View>
              <View style={[styles.tableHeaderCell, styles.scoreCol]}>
                <PdfText>TOTAL SCORE</PdfText>
              </View>
              <View style={[styles.tableHeaderCell, styles.gradeCol]}>
                <PdfText>GRADE</PdfText>
              </View>
              <View style={[styles.tableHeaderCell, { width: '15%' }]}>
                <PdfText>PERFORMANCE</PdfText>
              </View>
              <View style={[styles.tableHeaderCell, styles.gradeCol]}>
                <PdfText>POSITION</PdfText>
              </View>
              <View style={[styles.tableHeaderCell, { width: '12%' }]}>
                <PdfText>TEACHER INITIALS</PdfText>
              </View>
            </View>

            {Object.values(subjectGrades).map((subject: any, index: number) => (
              <View style={styles.subjectTableRow} key={subject.subjectCode || index}>
                <View style={[styles.tableCell, styles.subjectCol, styles.subjectName]}>
                  <PdfText>{subject.subject || 'N/A'}</PdfText>
                </View>
                <View style={[styles.tableCell, styles.scoreCol]}>
                  <PdfText>{subject.classScore || '0.0'}</PdfText>
                </View>
                <View style={[styles.tableCell, styles.scoreCol]}>
                  <PdfText>{subject.examScore || '0.0'}</PdfText>
                </View>
                <View style={[styles.tableCell, styles.scoreCol]}>
                  <PdfText>{subject.score ? subject.score.toFixed(1) : '0.0'}</PdfText>
                </View>
                <View style={[styles.tableCell, styles.gradeCol]}>
                  <PdfText>{subject.letterGrade || getLetterGrade(subject.score || 0)}</PdfText>
                </View>
                <View style={[styles.tableCell, { width: '15%' }]}>
                  <PdfText>{getPerformanceText(subject.score || 0)}</PdfText>
                </View>
                <View style={[styles.tableCell, styles.gradeCol]}>
                  <PdfText>{subject.position || 'N/A'}</PdfText>
                </View>
                <View style={[styles.tableCell, { width: '12%' }]}>
                  <PdfText>{subject.teacherInitials || ''}</PdfText>
                </View>
              </View>
            ))}
          </View>

          {/* Grading System */}
          <View style={styles.gradingSection}>
            <View style={styles.gradingLeft}>
              <View style={styles.gradingHeader}>
                <PdfText>GRADING SYSTEM</PdfText>
              </View>
              <View style={styles.gradingRow}>
                <View style={styles.gradingCell}>
                  <PdfText>GRADE</PdfText>
                </View>
                <View style={styles.gradingCell}>
                  <PdfText>MARKS</PdfText>
                </View>
                <View style={styles.gradingCell}>
                  <PdfText>POINTS</PdfText>
                </View>
                <View style={styles.gradingCell}>
                  <PdfText>REMARK</PdfText>
                </View>
              </View>
              {gradingScale.slice(0, 5).map((grade, index) => (
                <View style={styles.gradingRow} key={index}>
                  <View style={styles.gradingCell}>
                    <PdfText>{grade.grade}</PdfText>
                  </View>
                  <View style={styles.gradingCell}>
                    <PdfText>{grade.range}</PdfText>
                  </View>
                  <View style={styles.gradingCell}>
                    <PdfText>{grade.points}</PdfText>
                  </View>
                  <View style={styles.gradingCell}>
                    <PdfText>{grade.remark}</PdfText>
                  </View>
                </View>
              ))}
            </View>
            
            <View style={styles.gradingRight}>
              <View style={styles.gradingHeader}>
                <PdfText>PROFICIENCY LEVELS</PdfText>
              </View>
              <View style={styles.gradingRow}>
                <View style={styles.gradingCell}>
                  <PdfText>GRADE</PdfText>
                </View>
                <View style={styles.gradingCell}>
                  <PdfText>MARKS</PdfText>
                </View>
                <View style={styles.gradingCell}>
                  <PdfText>POINTS</PdfText>
                </View>
                <View style={styles.gradingCell}>
                  <PdfText>REMARK</PdfText>
                </View>
              </View>
              {gradingScale.slice(5).map((grade, index) => (
                <View style={styles.gradingRow} key={index}>
                  <View style={styles.gradingCell}>
                    <PdfText>{grade.grade}</PdfText>
                  </View>
                  <View style={styles.gradingCell}>
                    <PdfText>{grade.range}</PdfText>
                  </View>
                  <View style={styles.gradingCell}>
                    <PdfText>{grade.points}</PdfText>
                  </View>
                  <View style={styles.gradingCell}>
                    <PdfText>{grade.remark}</PdfText>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <PdfText>TEACHER COMMENTS</PdfText>
            </View>
            <View style={styles.commentsRow}>
              <View style={styles.commentsCell}>
                <PdfText style={{ fontWeight: 'bold' }}>CONDUCT</PdfText>
                <PdfText style={{ marginTop: 5 }}>Good behavior and participation in class activities.</PdfText>
              </View>
              <View style={styles.commentsCell}>
                <PdfText style={{ fontWeight: 'bold' }}>STUDENT INTEREST</PdfText>
                <PdfText style={{ marginTop: 5 }}>Shows keen interest in learning and asks relevant questions.</PdfText>
              </View>
              <View style={styles.commentsCell}>
                <PdfText style={{ fontWeight: 'bold' }}>GENERAL CLASS TEACHER REMARKS</PdfText>
                <PdfText style={{ marginTop: 5 }}>
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
              <PdfText>SIGNATURES</PdfText>
            </View>
            <View style={styles.signaturesRow}>
              <View style={styles.signatureCell}>
                <PdfText style={styles.signatureLabel}>ACADEMIC HEAD</PdfText>
                <PdfText style={{ fontSize: 6, marginTop: 2 }}>BAAFOUR ADUAMOA</PdfText>
              </View>
              <View style={styles.signatureCell}>
                <PdfText style={styles.signatureLabel}>CLASS FACILITATOR</PdfText>
                <PdfText style={{ fontSize: 6, marginTop: 2 }}>N/A</PdfText>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <PdfText>#UNKNOWN#</PdfText>
            <PdfText style={{ marginTop: 2 }}>Generated on: {moment().format('MMMM Do YYYY')}</PdfText>
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
                  <PdfText style={styles.cellText}>{student.roll_no}</PdfText>
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