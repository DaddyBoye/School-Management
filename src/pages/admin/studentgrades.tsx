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
    padding: 30,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 20,
    textAlign: 'center'
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
    color: '#283593'
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 5
  },
  section: {
    marginBottom: 10,
    fontSize: 14
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 10,
    color: '#283593'
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 15
  },
  tableRow: {
    flexDirection: 'row'
  },
  tableColHeader: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#283593',
    padding: 5
  },
  tableCol: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5
  },
  headerText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  cellText: {
    fontSize: 10
  },
  performanceText: {
    fontSize: 10,
    textAlign: 'center'
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  statItem: {
    width: '30%',
    padding: 10,
    border: '1px solid #f0f0f0',
    borderRadius: 4
  },
  statTitle: {
    fontSize: 10,
    marginBottom: 5
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  recommendationItem: {
    fontSize: 10,
    marginBottom: 5
  },
  landscapePage: {
    padding: 30,
    fontFamily: 'Helvetica'
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
          letterGrade: getLetterGrade(totalScore)
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
            letterGrade: score ? getLetterGrade(score) : 'N/A',
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
          overallLetterGrade: overallScore ? getLetterGrade(overallScore) : 'N/A',
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

  const getLetterGrade = (percentage: number | null): string => {
    if (percentage === null || percentage === undefined) return 'N/A';
    const scale = gradeScale?.scale || { A: 90, B: 80, C: 70, D: 60, F: 0 };
    if (percentage >= scale.A) return 'A';
    if (percentage >= scale.B) return 'B';
    if (percentage >= scale.C) return 'C';
    if (percentage >= scale.D) return 'D';
    return 'F';
  };

  const getPerformanceText = (score: number | null): string => {
    if (score === null) return 'N/A';
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Satisfactory';
    if (score >= 60) return 'Needs Improvement';
    return 'Concerning';
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

  const calculateStrengths = (subjectGrades: Record<string, { score: number | null; letterGrade: string; subject: string; subjectCode: string }>) => {
    const strengths = [];
    const sortedSubjects = Object.values(subjectGrades)
      .filter(subject => subject.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    
    const highPerformingSubjects = sortedSubjects.filter(subject => (subject.score ?? 0) >= 80);
    const topSubjects = highPerformingSubjects.length > 0 ? 
      highPerformingSubjects.slice(0, Math.min(3, highPerformingSubjects.length)) : 
      sortedSubjects.slice(0, 1);
    
    topSubjects.forEach(subject => {
      strengths.push(`${subject.subject}: ${(subject.score ?? 0).toFixed(1)}% (${subject.letterGrade})`);
    });
    
    if (strengths.length === 0) {
      strengths.push('No subject data available for analysis');
    }
    
    return strengths;
  };

  const calculateImprovements = (subjectGrades: Record<string, { score: number | null; letterGrade: string; subject: string; subjectCode: string }>) => {
    const improvements: string[] = [];
    const sortedSubjects = Object.values(subjectGrades)
      .filter((subject) => subject.score !== null)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
    
    const lowPerformingSubjects = sortedSubjects.filter(subject => (subject.score ?? 0) < 80);
    const bottomSubjects = lowPerformingSubjects.length > 0 ? 
      lowPerformingSubjects.slice(0, Math.min(3, lowPerformingSubjects.length)) : 
      sortedSubjects.length > 0 ? [sortedSubjects[0]] : [];
    
    bottomSubjects.forEach((subject) => {
      if ((subject.score ?? 0) < 90) {
        improvements.push(`${subject.subject}: ${subject.score?.toFixed(1)}% (${subject.letterGrade})`);
      }
    });
    
    if (improvements.length === 0) {
      if (sortedSubjects.length > 0) {
        improvements.push('All subjects show strong performance. Consider pursuing advanced coursework.');
      } else {
        improvements.push('No subject data available for analysis');
      }
    }
    
    return improvements;
  };

  const generateRecommendations = (
    studentOverall: { overallScore: number | null; overallLetterGrade: string; rank: number },
    subjectGrades: Record<string, { score: number | null; letterGrade: string; subject: string; subjectCode: string }>
  ) => {
    const recommendations = [];
    
    if (studentOverall.overallScore !== null) {
      if (studentOverall.overallScore >= 90) {
        recommendations.push('Continue excellent academic performance. Consider pursuing advanced coursework, academic competitions, or mentoring peers.');
      } else if (studentOverall.overallScore >= 80) {
        recommendations.push('Strong overall performance. Focus on bringing A-level excellence to all subjects through consistent study habits.');
      } else if (studentOverall.overallScore >= 70) {
        recommendations.push('Satisfactory performance. Consider additional study time and seeking help for subjects with lower grades.');
      } else {
        recommendations.push('Academic performance needs improvement. Recommend regular tutoring sessions, structured study plan, and frequent check-ins with teachers.');
      }
    }
    
    const belowAverageSubjects = Object.values(subjectGrades)
      .filter(subject => subject.score !== null && subject.score < 70)
      .map(subject => subject.subject);
    
    if (belowAverageSubjects.length > 0) {
      recommendations.push(`Focus additional attention on: ${belowAverageSubjects.join(', ')}`);
    }
    
    const strongestSubject = Object.values(subjectGrades)
      .filter(subject => subject.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    
    if (strongestSubject && strongestSubject.score && strongestSubject.score >= 85) {
      recommendations.push(`Consider exploring advanced opportunities in ${strongestSubject.subject} such as competitions, projects, or clubs.`);
    }
    
    const scores = Object.values(subjectGrades)
      .filter(subject => subject.score !== null)
      .map(subject => subject.score ?? 0);
    
    if (scores.length >= 2) {
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      
      if (maxScore - minScore > 15) {
        recommendations.push('Work on balancing performance across all subjects. Consider adjusting study time to give more attention to weaker subjects.');
      }
    }
    
    recommendations.push('Maintain regular attendance and active participation in all classes.');
    recommendations.push('Establish a balanced study schedule that allocates time proportionally to subject difficulty.');
    
    if (studentOverall.overallScore !== null && studentOverall.overallScore < 85) {
      recommendations.push('Develop effective time management skills by creating a weekly study plan and setting specific academic goals.');
    }
    
    recommendations.push('Practice regular self-assessment by reviewing past assignments and tests to identify patterns in mistakes.');
    
    return recommendations.slice(0, 5);
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
    student: Student;
    selectedClass: Class | null;
    selectedSemester: string;
    studentOverall: any;
    subjectGrades: any;
  }) => {
    const strengths = calculateStrengths(subjectGrades);
    const improvements = calculateImprovements(subjectGrades);
    const recommendations = generateRecommendations(studentOverall, subjectGrades);
    
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <PdfText style={styles.title}>Student Performance Report</PdfText>
            <PdfText style={styles.subtitle}>
              {student.first_name} {student.last_name} - {student.roll_no}
            </PdfText>
            <PdfText style={styles.subtitle}>
              Class: {selectedClass?.name || 'N/A'} - {selectedSemester}
            </PdfText>
            <PdfText style={styles.subtitle}>
              Generated on: {moment().format('MMMM Do YYYY')}
            </PdfText>
          </View>

          {/* Academic Summary */}
          <PdfText style={styles.sectionTitle}>Academic Summary</PdfText>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <PdfText style={styles.statTitle}>Overall Average</PdfText>
              <PdfText style={styles.statValue}>
                {studentOverall.overallScore ? studentOverall.overallScore.toFixed(2) + '%' : 'N/A'}
              </PdfText>
            </View>
            <View style={styles.statItem}>
              <PdfText style={styles.statTitle}>Letter Grade</PdfText>
              <PdfText style={styles.statValue}>
                {studentOverall.overallLetterGrade}
              </PdfText>
            </View>
            <View style={styles.statItem}>
              <PdfText style={styles.statTitle}>Class Rank</PdfText>
              <PdfText style={styles.statValue}>
                {studentOverall.rank || 'N/A'}
              </PdfText>
            </View>
          </View>

          {/* Subject Performance */}
          <PdfText style={styles.sectionTitle}>Subject Performance</PdfText>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableRow}>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Code</PdfText>
              </View>
              <View style={styles.tableColHeader}>
                <PdfText style={styles.headerText}>Subject</PdfText>
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
            {Object.values(subjectGrades).map((subject: any) => (
              <View style={styles.tableRow} key={subject.subjectCode}>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>{subject.subjectCode}</PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>{subject.subject}</PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>
                    {subject.score ? subject.score.toFixed(2) + '%' : 'N/A'}
                  </PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.cellText}>{subject.letterGrade}</PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.performanceText}>
                    {getPerformanceText(subject.score)}
                  </PdfText>
                </View>
              </View>
            ))}
          </View>

          {/* Performance Analysis */}
          <PdfText style={styles.sectionTitle}>Performance Analysis</PdfText>
          
          {/* Strengths */}
          <PdfText style={styles.section}>Areas of Strength:</PdfText>
          {strengths.map((strength, index) => (
            <PdfText style={styles.recommendationItem} key={`strength-${index}`}>
              • {strength}
            </PdfText>
          ))}
          
          {/* Improvements */}
          <PdfText style={[styles.section, { marginTop: 10 }]}>Areas for Improvement:</PdfText>
          {improvements.map((improvement, index) => (
            <PdfText style={styles.recommendationItem} key={`improvement-${index}`}>
              • {improvement}
            </PdfText>
          ))}

          {/* Recommendations */}
          <PdfText style={[styles.sectionTitle, { marginTop: 10 }]}>Recommendations</PdfText>
          {recommendations.map((recommendation, index) => (
            <PdfText style={styles.recommendationItem} key={`recommendation-${index}`}>
              • {recommendation}
            </PdfText>
          ))}
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
            <View style={styles.tableRow}>
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
              <View style={styles.tableRow} key={student.id}>
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
                    {getLetterGrade(student.totalScore) || 'N/A'}
                  </PdfText>
                </View>
                <View style={styles.tableCol}>
                  <PdfText style={styles.performanceText}>
                    {getPerformanceText(student.totalScore)}
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
            <View style={styles.tableRow}>
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
              <View style={styles.tableRow} key={grade}>
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
            <View style={styles.tableRow}>
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
              <View style={styles.tableRow} key={student.student.id}>
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