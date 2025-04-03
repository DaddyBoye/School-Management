import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Select, Button, Modal, Typography, 
  Row, Col, Statistic, Tabs, Tag, message, Spin,
  Divider, Progress, List, Tooltip
} from 'antd';
import { 
  FilePdfOutlined, UserOutlined, DownloadOutlined, 
  TrophyOutlined, BarChartOutlined, ProfileOutlined
} from '@ant-design/icons';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF to include lastAutoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}
import moment from 'moment';
import { supabase } from '../supabase';

const { Option } = Select;
const { Text } = Typography;
const { TabPane } = Tabs;

interface StudentGradesProps {
  schoolId: string;
  currentSemester?: string;
}

const StudentGrades: React.FC<StudentGradesProps> = ({ schoolId, currentSemester }) => {
  const [loading, setLoading] = useState(true);
  interface Class {
    id: string;
    name: string;
    grade: string;
  }

  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  interface Subject {
    id: string;
    name: string;
    code: string;
  }
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  interface Teacher {
    id: string;
    first_name: string;
    last_name: string;
    teacher_id: string; // Add teacher_id field
    // Add other fields as needed
  }
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [gradeCategories] = useState([]);
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
  
  const [students, setStudents] = useState<Student[]>([]);
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
    scale: Record<string, number>; // This matches your JSONB column
    is_default: boolean;
    created_at: string;
  }

  const [gradeScale, setGradeScale] = useState<GradeScale | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentGrade] = useState<Student | null>(null);
  const [selectedSemester, setSelectedSemester] = useState(currentSemester || moment().format('YYYY [Spring]'));
  const [studentSubjectGrades, setStudentSubjectGrades] = useState<Record<string, Record<string, { score: number | null; letterGrade: string; subject: string; subjectCode: string }>>>({});
  interface ComprehensiveStats {
    studentOverallScores: Record<string, {
      overallScore: number | null;
      overallLetterGrade: string;
      rank: number;
      subjectCount: number; // Added subjectCount property
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

  const [comprehensiveStats, setComprehensiveStats] = useState<ComprehensiveStats | null>(null);
  const [viewingComprehensive, setViewingComprehensive] = useState(false);
  const [classRankings, setClassRankings] = useState<{ 
    student: Student; 
    overallScore: number | null; 
    overallLetterGrade: string; 
    subjectCount: number; 
    rank: number; 
  }[]>([]);
  const [individualReportModalVisible, setIndividualReportModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Fetch initial data
  useEffect(() => {
    console.log('Initial useEffect triggered for schoolId:', schoolId);
    
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log('Starting initial data fetch');
        
        // Fetch classes first and ensure selectedClass is set
        await fetchClasses();
        
        // Then fetch the rest
        await Promise.all([
          fetchSubjects(),
          fetchTeachers(),
          fetchGradeScale()
        ]);
        
        console.log('Initial data fetch complete');
      } catch (error) {
        console.error('Error loading initial data:', error);
        message.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [schoolId]);

  // Fetch classes
  const fetchClasses = async () => {
    console.log('Fetching classes for school ID:', schoolId);
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching classes:', error);
      throw error;
    }
    
    console.log('Classes fetched:', data);
    setClasses(data);
    
    // Select first class and trigger student fetch
    if (data.length > 0) {
      console.log('Setting initial selected class:', data[0]);
      setSelectedClass(data[0]);
    } else {
      console.log('No classes found');
    }
  };

  // Fetch subjects
  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_id', schoolId);

    if (error) throw error;
    setSubjects(data || []);
  };

  // Fetch teachers
  const fetchTeachers = async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('school_id', schoolId);

    if (error) throw error;
    setTeachers(data);
  };

// Then update the fetchGradeScale function
const fetchGradeScale = async () => {
    try {
      // First try to fetch the default grade scale for the school
      const { data, error } = await supabase
        .from('grade_scales')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_default', true)
        .maybeSingle();
  
      if (!error && data) {
        setGradeScale(data);
        return;
      }
  
      // If no default scale found, try to get any scale for the school
      const { data: anyScaleData, error: anyScaleError } = await supabase
        .from('grade_scales')
        .select('*')
        .eq('school_id', schoolId)
        .order('is_default', { ascending: false }) // Prefer scales marked as default
        .limit(1);
  
      if (!anyScaleError && anyScaleData && anyScaleData.length > 0) {
        setGradeScale(anyScaleData[0]);
        return;
      }
  
      // Fallback to default scale if none found
      console.warn('No grade scale found for school, using default scale');
      setGradeScale({
        id: -1, // Temporary ID for fallback
        school_id: schoolId,
        name: 'Default Scale',
        scale: { A: 90, B: 80, C: 70, D: 60, F: 0 },
        is_default: true,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching grade scale:', error);
      // Fallback to default scale on error
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

// Add this new effect to trigger student fetch after initial load
useEffect(() => {
    console.log('Post-initial load effect with classes and subjects:', {
      classesLoaded: classes.length > 0,
      subjectsLoaded: subjects.length > 0,
      selectedClass,
      selectedSubject
    });
    
    // Only trigger fetch if we have a selected class (selectedSubject can be null for "All Subjects")
    if (classes.length > 0 && subjects.length > 0 && selectedClass && students.length === 0) {
      console.log('Initial selections complete, fetching students');
      fetchStudentsWithGrades();
    }
  }, [classes, subjects, selectedClass, students.length]);

  // Fetch students and their grades when class or subject changes
// Fetch students and their grades when class or subject changes
useEffect(() => {
    console.log('useEffect triggered with:', { 
      selectedClass, 
      selectedSubject, 
      selectedSemester,
      classesLoaded: classes.length > 0,
      subjectsLoaded: subjects.length > 0
    });
    
    // Only need selectedClass to fetch (selectedSubject can be null for "All Subjects")
    if (selectedClass) {
      console.log('Fetching students with grades');
      fetchStudentsWithGrades();
    } else {
      console.log('Not fetching students - missing class selection');
    }
  }, [selectedClass, selectedSubject, selectedSemester]);

  const fetchStudentsWithGrades = async () => {
    if (!selectedClass) return;
  
    setLoading(true);
    try {
      // 1. Fetch students in the selected class
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, user_id, first_name, last_name, roll_no, class_id')
        .eq('class_id', selectedClass.id);
  
      if (studentsError) throw studentsError;
      if (!studentsData || studentsData.length === 0) {
        setStudents([]);
        return;
      }
  
      // 2. Fetch grades for these students
      let gradesQuery = supabase
        .from('grades')
        .select('*')
        .in('student_id', studentsData.map(s => s.user_id)) // Note: using user_id here
        .eq('semester', selectedSemester);
  
      if (selectedSubject) {
        gradesQuery = gradesQuery.eq('subject_id', selectedSubject.id);
      }
  
      const { data: gradesData, error: gradesError } = await gradesQuery;
  
      if (gradesError) throw gradesError;
  
      // 3. Fetch grade categories for the relevant subjects
      const subjectIds = selectedSubject 
        ? [selectedSubject.id] 
        : Array.from(new Set(gradesData?.map(g => g.subject_id) || []));
  
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('grade_categories')
        .select('*')
        .in('subject_id', subjectIds);
  
      if (categoriesError) throw categoriesError;
  
      // 4. Process the data
      const studentsWithGrades = studentsData.map(student => {
        const studentGrades = gradesData?.filter(g => g.student_id === student.user_id) || [];
        
        // Calculate subject-specific or overall score
        let totalScore = null;
        if (selectedSubject) {
          totalScore = calculateTotalScore(studentGrades, categoriesData.filter(c => c.subject_id === selectedSubject.id));
        } else if (gradesData && gradesData.length > 0) {
          // For comprehensive view, calculate average across all subjects
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
  
      // 5. For comprehensive view, calculate statistics
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

  // New function to fetch comprehensive grades across all subjects
  const fetchComprehensiveGrades = async (studentsData: Student[]) => {
    try {
      // 1. Get all subjects for this school
      const { data: allSubjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId);
  
      // 2. Initialize data structures
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
  
      // 3. Initialize student structures
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
  
      // 4. Process each subject
      if (!allSubjects) return;
      await Promise.all(allSubjects.map(async subject => {
        // Get categories for this subject
        const { data: subjectCategories } = await supabase
          .from('grade_categories')
          .select('*')
          .eq('subject_id', subject.id);
  
        if (!subjectCategories || subjectCategories.length === 0) return;
  
        // Get all grades for this subject in current semester
        const { data: subjectGrades } = await supabase
          .from('grades')
          .select('*')
          .in('student_id', studentsData.map(s => s.user_id))
          .eq('subject_id', subject.id)
          .eq('semester', selectedSemester);
  
        // Calculate scores for each student
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
  
      // 5. Calculate overall scores
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
  
      // 6. Calculate ranks
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
  
      // 7. Update state
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

  // Helper function to calculate class average
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

  // Calculate total score for a student
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

// Update getLetterGrade to use the scale from state
const getLetterGrade = (percentage: number | null): string => {
  if (percentage === null || percentage === undefined) return 'N/A';
  
  // Use the scale from state or default if not available
  const scale = gradeScale?.scale || { A: 90, B: 80, C: 70, D: 60, F: 0 };
  
  if (percentage >= scale.A) return 'A';
  if (percentage >= scale.B) return 'B';
  if (percentage >= scale.C) return 'C';
  if (percentage >= scale.D) return 'D';
  return 'F';
};

// Generate single student comprehensive report
const generateIndividualReport = (student: Student) => {
    if (!student || !comprehensiveStats) {
      message.error('Student data not available');
      return;
    }
  
    const studentId = student.id;
    const studentOverall = comprehensiveStats.studentOverallScores[studentId];
    const subjectGrades = studentSubjectGrades[studentId] || {};
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 53, 147);
    doc.text(`Student Performance Report`, 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${student.first_name} ${student.last_name} - ${student.roll_no}`, 105, 30, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Class: ${selectedClass?.name || 'N/A'} - ${selectedSemester}`, 105, 38, { align: 'center' });
    doc.text(`Generated on: ${moment().format('MMMM Do YYYY')}`, 105, 45, { align: 'center' });
  
    // Overview stats
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Academic Summary', 14, 60);
    
    doc.setFontSize(10);
    doc.text(`Overall Average: ${studentOverall.overallScore ? studentOverall.overallScore.toFixed(2) + '%' : 'N/A'}`, 20, 70);
    doc.text(`Letter Grade: ${studentOverall.overallLetterGrade}`, 20, 77);
    doc.text(`Class Rank: ${studentOverall.rank || 'N/A'}/${comprehensiveStats.gradedStudentCount}`, 20, 84);
    doc.text(`Percentile: ${studentOverall.rank ? ((comprehensiveStats.gradedStudentCount - studentOverall.rank + 1) / comprehensiveStats.gradedStudentCount * 100).toFixed(1) + '%' : 'N/A'}`, 20, 91);
    doc.text(`Subjects Assessed: ${studentOverall.subjectCount}`, 20, 98);
  
    // Subject performance table
    doc.setFontSize(14);
    doc.text('Subject Performance', 14, 115);
    
    const subjectData = Object.values(subjectGrades).map(subject => [
      subject.subjectCode,
      subject.subject,
      subject.score ? subject.score.toFixed(2) + '%' : 'N/A',
      subject.letterGrade,
      getPerformanceText(subject.score)
    ]);
    
    autoTable(doc, {
      head: [['Code', 'Subject', 'Score', 'Grade', 'Performance']],
      body: subjectData,
      startY: 120,
      theme: 'grid',
      headStyles: { fillColor: [40, 53, 147], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 30, halign: 'center' }
      }
    });
    
    // Performance Analysis
    const yStart = doc.lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.text('Performance Analysis', 14, yStart);
    
    // Strengths
    doc.setFontSize(12);
    doc.text('Areas of Strength:', 20, yStart + 10);
    doc.setFontSize(10);
    const strengths = calculateStrengths(subjectGrades);
    strengths.forEach((strength, index) => {
      doc.text(`• ${strength}`, 25, yStart + 20 + (index * 7));
    });
    
    // Improvements
    const improvementsY = yStart + 20 + (strengths.length * 7) + 10;
    doc.setFontSize(12);
    doc.text('Areas for Improvement:', 20, improvementsY);
    doc.setFontSize(10);
    const improvements = calculateImprovements(subjectGrades);
    improvements.forEach((improvement, index) => {
      doc.text(`• ${improvement}`, 25, improvementsY + 10 + (index * 7));
    });
  
    // Recommendations
    const recommendationsY = improvementsY + 10 + (improvements.length * 7) + 15;
    doc.setFontSize(14);
    doc.text('Recommendations', 14, recommendationsY);
    doc.setFontSize(10);
    
    const recommendations = generateRecommendations(studentOverall, subjectGrades);
    recommendations.forEach((recommendation, index) => {
      doc.text(`• ${recommendation}`, 20, recommendationsY + 10 + (index * 7));
    });
  
    // Save the PDF
    doc.save(`Student_Report_${student.first_name}_${student.last_name}_${selectedSemester}.pdf`);
  };
  
  // Helper functions for individual reports
  const calculateStrengths = (subjectGrades: Record<string, { score: number | null; letterGrade: string; subject: string; subjectCode: string }>) => {
    const strengths = [];
    const sortedSubjects = Object.values(subjectGrades)
      .filter(subject => subject.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    
    // Get subjects with scores above 80% (B or better)
    // If none above 80%, just take the top subject
    const highPerformingSubjects = sortedSubjects.filter(subject => (subject.score ?? 0) >= 80);
    const topSubjects = highPerformingSubjects.length > 0 ? 
      highPerformingSubjects.slice(0, Math.min(3, highPerformingSubjects.length)) : 
      sortedSubjects.slice(0, 1);
    
    topSubjects.forEach(subject => {
      strengths.push(`${subject.subject}: ${(subject.score ?? 0).toFixed(1)}% (${subject.letterGrade})`);
    });
    
    // If no subjects with grades
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
    
    // Get subjects with scores below 80% (C or worse)
    // If all scores are above 80%, then mention the lowest scoring subject
    const lowPerformingSubjects = sortedSubjects.filter(subject => (subject.score ?? 0) < 80);
    
    const bottomSubjects = lowPerformingSubjects.length > 0 ? 
      lowPerformingSubjects.slice(0, Math.min(3, lowPerformingSubjects.length)) : 
      sortedSubjects.length > 0 ? [sortedSubjects[0]] : [];
    
    bottomSubjects.forEach((subject) => {
      // Only include subjects that aren't already in strengths
      if ((subject.score ?? 0) < 90) {
        improvements.push(`${subject.subject}: ${subject.score?.toFixed(1)}% (${subject.letterGrade})`);
      }
    });
    
    // If no subjects with grades
    if (improvements.length === 0) {
      // If all subjects are high-performing
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
    
    // General recommendation based on overall performance
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
    
    // Check for subjects significantly below average
    const belowAverageSubjects = Object.values(subjectGrades)
      .filter(subject => subject.score !== null && subject.score < 70)
      .map(subject => subject.subject);
    
    if (belowAverageSubjects.length > 0) {
      recommendations.push(`Focus additional attention on: ${belowAverageSubjects.join(', ')}`);
    }
    
    // Get the student's strongest subject
    const strongestSubject = Object.values(subjectGrades)
      .filter(subject => subject.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    
    if (strongestSubject && strongestSubject.score && strongestSubject.score >= 85) {
      recommendations.push(`Consider exploring advanced opportunities in ${strongestSubject.subject} such as competitions, projects, or clubs.`);
    }
    
    // Check for inconsistent performance across subjects
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
    
    // Additional generic but personalized recommendations
    recommendations.push('Maintain regular attendance and active participation in all classes.');
    recommendations.push('Establish a balanced study schedule that allocates time proportionally to subject difficulty.');
    
    // Time management recommendation based on overall performance
    if (studentOverall.overallScore !== null && studentOverall.overallScore < 85) {
      recommendations.push('Develop effective time management skills by creating a weekly study plan and setting specific academic goals.');
    }
    
    // Self-assessment recommendation
    recommendations.push('Practice regular self-assessment by reviewing past assignments and tests to identify patterns in mistakes.');
    
    // Return a reasonable number of recommendations (max 5)
    return recommendations.slice(0, 5);
  };
  
  const getPerformanceText = (score: number | null): string => {
    if (score === null) return 'N/A';
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Satisfactory';
    if (score >= 60) return 'Needs Improvement';
    return 'Concerning';
  };

  // View individual student details
  const viewStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setIndividualReportModalVisible(true);
  };

  // View comprehensive class report
  const viewComprehensiveReport = () => {
    setViewingComprehensive(true);
    setIsModalVisible(true);
  };


  // Table columns for subject view
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

  // Table columns for comprehensive view
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

  const generateGradeReport = () => {
    if (!selectedClass || !selectedSubject) {
      message.error('Please select both a class and subject');
      return;
    }
  
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 53, 147);
    doc.text(`Subject Grade Report`, 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${selectedClass?.name || 'N/A'} - ${selectedSubject && 'name' in selectedSubject ? selectedSubject.name : 'N/A'}`, 105, 30, { align: 'center' });
    doc.text(`${selectedSemester}`, 105, 38, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Generated on: ${moment().format('MMMM Do YYYY')}`, 105, 45, { align: 'center' });
  
    // Subject statistics
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Subject Statistics', 14, 60);
    
    // Calculate subject averages
    const subjectAverage = students.reduce((sum, student) => sum + (student.totalScore || 0), 0) / 
      students.filter(s => s.totalScore !== null).length;
    
    doc.setFontSize(10);
    doc.text(`Subject Average: ${subjectAverage.toFixed(2)}%`, 20, 70);
    doc.text(`Letter Grade: ${getLetterGrade(subjectAverage)}`, 20, 77);
    doc.text(`Students Assessed: ${students.filter(s => s.totalScore !== null).length}/${students.length}`, 20, 84);
  
    // Student grades table
    doc.setFontSize(14);
    doc.text('Student Grades', 14, 100);
    
    autoTable(doc, {
      head: [['Roll No', 'Student Name', 'Score', 'Grade', 'Performance']],
      body: students.map(student => [
        student.roll_no,
        `${student.first_name} ${student.last_name}`,
        student.totalScore ? `${student.totalScore.toFixed(2)}%` : 'N/A',
        getLetterGrade(student.totalScore) || 'N/A',
        getPerformanceText(student.totalScore)
      ]),
      startY: 105,
      theme: 'grid',
      headStyles: { fillColor: [40, 53, 147], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 35, halign: 'center' }
      }
    });
  
    // Save the PDF
    doc.save(`Subject_Report_${selectedClass.name}_${selectedSubject.code}_${selectedSemester}.pdf`);
  };

  // Generate comprehensive report for the whole class
  const generateComprehensiveReport = () => {
    if (!selectedClass || !comprehensiveStats) {
      message.error('No data available to generate report');
      return;
    }
  
    const doc = new jsPDF({
      orientation: 'landscape' // Use landscape for wider tables
    });
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 53, 147);
    doc.text(`Comprehensive Class Report`, 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${selectedClass.name} - ${selectedSemester}`, 105, 30, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Generated on: ${moment().format('MMMM Do YYYY')}`, 105, 38, { align: 'center' });
  
    // Class statistics
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Class Statistics', 14, 55);
    
    doc.setFontSize(10);
    doc.text(`Total Students: ${comprehensiveStats.studentCount}`, 20, 65);
    doc.text(`Students with Grades: ${comprehensiveStats.gradedStudentCount}`, 20, 72);
    doc.text(`Class Average: ${comprehensiveStats.classAverage ? comprehensiveStats.classAverage.toFixed(2) + '%' : 'N/A'}`, 20, 79);
    doc.text(`Average Letter Grade: ${comprehensiveStats.classAverage ? getLetterGrade(comprehensiveStats.classAverage) : 'N/A'}`, 20, 86);
    
    if (comprehensiveStats.topStudent) {
      doc.text(`Top Student: ${comprehensiveStats.topStudent.student.first_name} ${comprehensiveStats.topStudent.student.last_name}`, 20, 93);
      doc.text(`Top Score: ${comprehensiveStats.topStudent.overallScore.toFixed(2)}%`, 20, 100);
    }

  // Helper function to calculate grade distribution
  const calculateGradeDistribution = (studentScores: Record<string, { overallScore: number | null; overallLetterGrade: string }>) => {
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0, NA: 0 };
    
    Object.values(studentScores).forEach(student => {
      if (!student.overallScore) {
        distribution.NA++;
      } else if (student.overallLetterGrade === 'A') {
        distribution.A++;
      } else if (student.overallLetterGrade === 'B') {
        distribution.B++;
      } else if (student.overallLetterGrade === 'C') {
        distribution.C++;
      } else if (student.overallLetterGrade === 'D') {
        distribution.D++;
    } else if (student.overallLetterGrade === 'F') {
        distribution.F++;
      }
    });
    
    return distribution;
  };

    // Grade Distribution
    const gradeDistribution = calculateGradeDistribution(comprehensiveStats.studentOverallScores);
    doc.setFontSize(14);
    doc.text('Grade Distribution', 14, 115);
    
    autoTable(doc, {
      head: [['Grade', 'Count', 'Percentage']],
      body: [
        ['A', gradeDistribution.A, `${((gradeDistribution.A / comprehensiveStats.gradedStudentCount) * 100).toFixed(1)}%`],
        ['B', gradeDistribution.B, `${((gradeDistribution.B / comprehensiveStats.gradedStudentCount) * 100).toFixed(1)}%`],
        ['C', gradeDistribution.C, `${((gradeDistribution.C / comprehensiveStats.gradedStudentCount) * 100).toFixed(1)}%`],
        ['D', gradeDistribution.D, `${((gradeDistribution.D / comprehensiveStats.gradedStudentCount) * 100).toFixed(1)}%`],
        ['F', gradeDistribution.F, `${((gradeDistribution.F / comprehensiveStats.gradedStudentCount) * 100).toFixed(1)}%`],
        ['N/A', gradeDistribution.NA, `${((gradeDistribution.NA / comprehensiveStats.gradedStudentCount) * 100).toFixed(1)}%`]
      ],
      startY: 120,
      theme: 'grid',
      headStyles: { fillColor: [40, 53, 147], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'center' }
      }
    });

    // Student rankings
    doc.setFontSize(14);
    doc.text('Student Rankings', 14, doc.lastAutoTable.finalY + 20);
    
    autoTable(doc, {
        head: [['Rank', 'Student', 'Average', 'Grade', 'Percentile']],
        body: classRankings.map((student, index) => [
          index + 1,
          `${student.student.first_name} ${student.student.last_name}`,
          student.overallScore !== null ? student.overallScore.toFixed(2) + '%' : 'N/A',
          student.overallLetterGrade,
          ((comprehensiveStats.gradedStudentCount - index) / comprehensiveStats.gradedStudentCount * 100).toFixed(1) + '%'
        ]),
        startY: doc.lastAutoTable.finalY + 25,
        theme: 'striped',
        headStyles: { fillColor: [40, 53, 147], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 60 }, // Wider column for names
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 30, halign: 'center' }
        },
        margin: { left: 10, right: 10 } // Add margins to prevent overflow
      });
    
      // Save the PDF
      doc.save(`Class_Report_${selectedClass.name}_${selectedSemester}.pdf`);
    };  

  const IndividualReportModal = () => {
    if (!selectedStudent || !comprehensiveStats) return null;
  
    const studentData = comprehensiveStats.studentOverallScores[selectedStudent.id];
    const subjectsData = studentSubjectGrades[selectedStudent.id] || {};
  
    return (
      <Modal
        title={`Student Report - ${selectedStudent.first_name} ${selectedStudent.last_name}`}
        visible={individualReportModalVisible}
        onCancel={() => setIndividualReportModalVisible(false)}
        width={800}
        footer={[
          <Button 
            key="download" 
            type="primary" 
            onClick={() => generateIndividualReport(selectedStudent)}
            icon={<DownloadOutlined />}
          >
            Download Full Report
          </Button>
        ]}
      >
        <div className="report-content">
          {/* Header */}
          <div className="text-center mb-6">
            <h3>{selectedStudent.first_name} {selectedStudent.last_name}</h3>
            <p>Roll No: {selectedStudent.roll_no} | Class: {selectedClass?.name}</p>
            <p>Semester: {selectedSemester}</p>
          </div>
  
          {/* Summary */}
          <Row gutter={16} className="mb-6">
            <Col span={8}>
              <Card>
                <Statistic 
                  title="Overall Average" 
                  value={studentData.overallScore?.toFixed(2) || 'N/A'} 
                  suffix="%" 
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic 
                  title="Letter Grade" 
                  value={studentData.overallLetterGrade}
                  valueStyle={{ color: getGradeColor(studentData.overallLetterGrade) }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic 
                  title="Class Rank" 
                  value={studentData.rank || 'N/A'} 
                  suffix={`/ ${comprehensiveStats.gradedStudentCount}`}
                />
              </Card>
            </Col>
          </Row>
  
          {/* Subject Performance */}
          <Divider orientation="left">Subject Performance</Divider>
          <Table
            columns={[
              { title: 'Subject', dataIndex: 'subject', key: 'subject' },
              { title: 'Code', dataIndex: 'subjectCode', key: 'code' },
              { 
                title: 'Score', 
                key: 'score',
                render: (_, record) => (
                  <Text strong style={{ color: getScoreColor(record.score) }}>
                    {record.score ? `${record.score.toFixed(2)}%` : 'N/A'}
                  </Text>
                )
              },
              { 
                title: 'Grade', 
                key: 'grade',
                render: (_, record) => (
                  <Tag color={getGradeColor(record.letterGrade)}>
                    {record.letterGrade}
                  </Tag>
                )
              }
            ]}
            dataSource={Object.values(subjectsData)}
            rowKey="subjectCode"
            pagination={false}
          />
  
          {/* Performance Analysis */}
          <Divider orientation="left">Performance Analysis</Divider>
          <Row gutter={16} className="mb-4">
            <Col span={12}>
              <Card title="Strengths" size="small">
                <List
                  size="small"
                  dataSource={calculateStrengths(subjectsData)}
                  renderItem={item => <List.Item>• {item}</List.Item>}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Areas for Improvement" size="small">
                <List
                  size="small"
                  dataSource={calculateImprovements(subjectsData)}
                  renderItem={item => <List.Item>• {item}</List.Item>}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </Modal>
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
              <Button 
                type="primary" 
                onClick={generateComprehensiveReport}
                icon={<FilePdfOutlined />}
              >
                Download Class Report
              </Button>
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
                setStudents([]); // Reset students to trigger reload
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
                setStudents([]); // Reset students to trigger reload
              }}
            >
              <Option value={`${moment().year()} Spring`}>Spring {moment().year()}</Option>
              <Option value={`${moment().year()} Fall`}>Fall {moment().year()}</Option>
              <Option value={`${moment().year() - 1} Spring`}>Spring {moment().year() - 1}</Option>
              <Option value={`${moment().year() - 1} Fall`}>Fall {moment().year() - 1}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Button 
                type="primary" 
                className="w-full"
                onClick={() => selectedSubject ? generateGradeReport() : generateComprehensiveReport()}
                icon={<FilePdfOutlined />}
            >
                {selectedSubject ? 'Download Subject Report' : 'Download Class Report'}
            </Button>
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

      {/* Student Grade Details Modal */}
      <Modal
        title={
          <div>
            {viewingComprehensive ? 'Class Comprehensive Report' : `Grade Details - ${currentGrade?.first_name} ${currentGrade?.last_name}`}
            {!viewingComprehensive && (
              <Button 
                type="link" 
                onClick={() => currentGrade && generateIndividualReport(currentGrade)}
                icon={<DownloadOutlined />}
                style={{ float: 'right' }}
              >
                Download Report
              </Button>
            )}
          </div>
        }
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setViewingComprehensive(false);
        }}
        width={1000}
        footer={null}
      >
        {viewingComprehensive ? (
        <div>
            <Row gutter={16} className="mb-4">
            <Col span={8}>
                <Card>
                <Statistic 
                    title="Class Average" 
                    value={comprehensiveStats?.classAverage ? comprehensiveStats.classAverage.toFixed(2) : 'N/A'} 
                    suffix="%" 
                    prefix={<BarChartOutlined />}
                />
                </Card>
            </Col>
            <Col span={8}>
                <Card>
                <Statistic 
                    title="Top Student" 
                    value={
                    comprehensiveStats?.topStudent ? 
                    `${comprehensiveStats.topStudent.student.first_name} ${comprehensiveStats.topStudent.student.last_name}` : 
                    'N/A'
                    }
                    prefix={<TrophyOutlined />}
                />
                </Card>
            </Col>
            <Col span={8}>
                <Card>
                <Statistic 
                    title="Students Graded" 
                    value={comprehensiveStats?.gradedStudentCount || 0} 
                    suffix={`/ ${comprehensiveStats?.studentCount || 0}`}
                    prefix={<UserOutlined />}
                />
                </Card>
            </Col>
            </Row>

            <Divider orientation="left">Grade Distribution</Divider>
            <Row gutter={16}>
            <Col span={24}>
                <GradeDistributionChart 
                gradeScale={gradeScale || { scale: { A: 90, B: 80, C: 70, D: 60, F: 0 } }} 
                studentScores={comprehensiveStats?.studentOverallScores || {}} 
                />
            </Col>
            </Row>

            <Divider orientation="left">Subject Performance Overview</Divider>
            {selectedSubject ? (
            <SubjectPerformanceOverview 
                students={students} 
                studentSubjectGrades={studentSubjectGrades} 
                subjects={[selectedSubject]} 
            />
            ) : (
            <SubjectPerformanceOverview 
                students={students} 
                studentSubjectGrades={studentSubjectGrades} 
                subjects={subjects} 
            />
            )}
        </div>
        ) : (
          currentGrade && (
            <div>
              <Row gutter={16} className="mb-4">
                <Col span={8}>
                  <Statistic 
                    title="Overall Score" 
                    value={currentGrade.totalScore ? currentGrade.totalScore.toFixed(2) : 'N/A'} 
                    suffix="%" 
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Letter Grade" 
                    value={getLetterGrade(currentGrade.totalScore) || 'N/A'}
                    valueStyle={{ color: getGradeColor(getLetterGrade(currentGrade.totalScore)) }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Performance" 
                    value={getPerformanceText(currentGrade.totalScore)}
                  />
                </Col>
              </Row>

              <Tabs defaultActiveKey="1">
                {gradeCategories.map((category: { id: string; name: string; weight: number }) => {
                  const categoryGrades = currentGrade.grades?.filter(g => g.category_id === category.id) || [];
                  const categoryAvg = categoryGrades.length > 0
                    ? (categoryGrades.reduce((sum, g) => sum + (g.score / g.max_score), 0) / categoryGrades.length) * 100
                    : null;

                  return (
                    <TabPane tab={`${category.name} (${category.weight}%)`} key={category.id}>
                      <div className="mb-4">
                        <Text strong>Category Average: </Text>
                        <Text style={{ color: getScoreColor(categoryAvg) }}>
                          {categoryAvg ? `${categoryAvg.toFixed(2)}%` : 'No grades recorded'}
                        </Text>
                      </div>
                      
                      <Table
                        columns={[
                          { title: 'Date', dataIndex: 'date_given', key: 'date', render: date => moment(date).format('MMM D, YYYY') },
                          { title: 'Score', key: 'score', render: (_, record) => `${record.score}/${record.max_score}` },
                          { title: 'Percentage', key: 'percentage', render: (_, record) => `${((record.score / record.max_score) * 100).toFixed(2)}%` },
                          { title: 'Teacher', key: 'teacher', render: (_, record) => {
                            const teacher = teachers.find(t => t.id === record.teacher_id);
                            return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'N/A';
                          }},
                          { title: 'Comments', dataIndex: 'comments', key: 'comments' }
                        ]}
                        dataSource={categoryGrades}
                        rowKey="id"
                        pagination={false}
                        size="small"
                      />
                    </TabPane>
                  );
                })}
              </Tabs>
            </div>
          )
        )}
      </Modal>

      {/* Individual Student Report Modal */}
      <IndividualReportModal />
    </div>
  );
};


  // Get color for score display
  const getScoreColor = (score: number | null): string => {
    if (!score) return '#8c8c8c';
    if (score >= 90) return '#52c41a';
    if (score >= 80) return '#73d13d';
    if (score >= 70) return '#faad14';
    if (score >= 60) return '#ff7a45';
    return '#ff4d4f';
  };

  // Get color for grade display
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

// Helper components
const GradeDistributionChart: React.FC<{ gradeScale: { scale: Record<string, number> }; studentScores: Record<string, { overallScore: number | null; overallLetterGrade: string }> }> = ({ gradeScale, studentScores }) => {
  if (!studentScores || !gradeScale) return null;
  
  const distribution = {
    A: 0, B: 0, C: 0, D: 0, F: 0, NA: 0
  };
  
  Object.values(studentScores).forEach(student => {
    if (!student.overallScore) {
      distribution.NA++;
    } else if (student.overallLetterGrade === 'A') {
      distribution.A++;
    } else if (student.overallLetterGrade === 'B') {
      distribution.B++;
    } else if (student.overallLetterGrade === 'C') {
      distribution.C++;
    } else if (student.overallLetterGrade === 'D') {
      distribution.D++;
    } else if (student.overallLetterGrade === 'F') {
      distribution.F++;
    }
  });
  
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  
  return (
    <div>
      {Object.entries(distribution).map(([grade, count]) => (
        <div key={grade} className="mb-2">
          <div className="flex justify-between mb-1">
            <span>
              <Tag color={getGradeColor(grade)}>{grade}</Tag>
              {grade === 'A' && ` (≥${gradeScale.scale.A}%)`}
              {grade === 'B' && ` (≥${gradeScale.scale.B}%)`}
              {grade === 'C' && ` (≥${gradeScale.scale.C}%)`}
              {grade === 'D' && ` (≥${gradeScale.scale.D}%)`}
              {grade === 'F' && ` (<${gradeScale.scale.D}%)`}
            </span>
            <span>
              {count} student{count !== 1 ? 's' : ''} ({total > 0 ? ((count / total) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          <Progress 
            percent={total > 0 ? (count / total) * 100 : 0} 
            strokeColor={getGradeColor(grade)}
            showInfo={false}
          />
        </div>
      ))}
    </div>
  );
};

interface SubjectPerformanceOverviewProps {
    students: Array<{
      id: string;
      first_name: string;
      last_name: string;
    }>;
    studentSubjectGrades: Record<string, Record<string, {
      score: number | null;
      letterGrade: string | null;
      subject: string;
      subjectCode: string;
    }>>;
    subjects: Array<{
      id: string;
      name: string;
      code: string;
    }>;
  }

  const SubjectPerformanceOverview: React.FC<SubjectPerformanceOverviewProps> = ({ 
    students, 
    studentSubjectGrades, 
    subjects 
  }) => {
    if (!students || !studentSubjectGrades || !subjects) return null;
    
    // Helper function to safely get score
    const getSafeScore = (grades: any, subjectId: string): number | null => {
      const subjectGrades = grades[subjectId];
      return subjectGrades?.score ?? null;
    };
  
    return (
      <Table
        columns={[
          {
            title: 'Subject',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => `${text} (${record.code})`
          },
          {
            title: 'Class Average',
            key: 'average',
            render: (_, subject) => {
              let total = 0;
              let count = 0;
              
              Object.values(studentSubjectGrades).forEach(studentGrades => {
                const score = getSafeScore(studentGrades, subject.id);
                if (score !== null) {
                  total += score;
                  count++;
                }
              });
              
              const average = count > 0 ? total / count : null;
              
              return (
                <Text strong style={{ color: getScoreColor(average) }}>
                  {average !== null ? `${average.toFixed(2)}%` : 'N/A'}
                </Text>
              );
            },
            sorter: () => {
              return 0;
            }
          },
          {
            title: 'Top Student',
            key: 'topStudent',
            render: (_, subject) => {
              let topScore = -Infinity;
              let topStudent = null;
              
              Object.entries(studentSubjectGrades).forEach(([studentId, grades]) => {
                const score = getSafeScore(grades, subject.id);
                if (score !== null && score > topScore) {
                  topScore = score;
                  const student = students.find(s => s.id === studentId);
                  topStudent = student ? `${student.first_name} ${student.last_name}` : null;
                }
              });
              
              return topStudent ?? 'N/A';
            }
          },
          {
            title: 'Performance Distribution',
            key: 'distribution',
            render: (_, subject) => {
              const distribution = {
                A: 0, B: 0, C: 0, D: 0, F: 0, NA: 0
              };
              
              Object.values(studentSubjectGrades).forEach(studentGrades => {
                const grade = studentGrades[subject.id]?.letterGrade ?? 'NA';
                if (grade === 'A') distribution.A++;
                else if (grade === 'B') distribution.B++;
                else if (grade === 'C') distribution.C++;
                else if (grade === 'D') distribution.D++;
                else if (grade === 'F') distribution.F++;
                else distribution.NA++;
              });
              
              const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
              
              return (
                <div className="flex">
                  {Object.entries(distribution).map(([grade, count]) => (
                    count > 0 && (
                      <Tooltip 
                        key={grade} 
                        title={`${grade}: ${count} student${count !== 1 ? 's' : ''}`}
                      >
                        <div 
                          style={{
                            width: `${(count / total) * 100}%`,
                            height: '20px',
                            backgroundColor: getGradeColor(grade),
                            marginRight: '1px'
                          }}
                        />
                      </Tooltip>
                    )
                  ))}
                </div>
              );
            }
          }
        ]}
        dataSource={subjects}
        rowKey="id"
        pagination={false}
        size="small"
      />
    );
  };

export default StudentGrades;