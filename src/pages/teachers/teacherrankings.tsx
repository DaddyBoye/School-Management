import React, { useState, useEffect } from 'react';
import { supabase } from "../../supabase";
import { AnimatePresence } from 'framer-motion';
import { ToastNotification } from '@/Components/ToastNotification';
import { 
  Book, 
  Users, 
  Loader2, 
  BarChart2,
  BookOpen,
  Award,
  Download,
  FileText,
  X,
  Trophy,
  Star,
  Medal,
  ChevronUp,
  ChevronsUp,
  TrendingUp,
  Circle,
  ClipboardList,
  UserCheck,
  MessageSquare,
  ChevronDown,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Grade {
  id?: string;
  student_id: string;
  subject_id: string;
  score: number;
  max_score: number;
  category_id: string;
  teacher_id: string;
  semester: string;
  comments?: string;
  date_given: string;
}

interface GradeCategory {
  id: string;
  name: string;
  weight: number;
  subject_id: string;
}

interface TeacherSubject {
  subject_id: string;
  class_id: string;
  subject_name: string;
  subject_code: string;
  class_name: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  class_id: string;
}

interface Student {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  roll_no: string;
  class_id: string;
  overallAvg?: number | null;
  performance?: Array<{
    subjectId: string;
    average: number | null;
    letterGrade: string;
    color: string;
  }>;
  overallLetter?: string;
}

interface Class {
  id: string;
  name: string;
}

interface TeacherGradesReportsProps {
  teacherId: string;
  schoolId: string;
  currentSemester?: string;
  showReportButtons?: boolean;
}

const TeacherGradesReports: React.FC<TeacherGradesReportsProps> = ({ 
  teacherId, 
  schoolId,
  currentSemester = new Date().getFullYear() + ' Spring',
  showReportButtons = true
}) => {
  // View state
  const [viewMode, setViewMode] = useState<'myClass' | 'subjectsTaught'>('myClass');
  
  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeCategories, setGradeCategories] = useState<GradeCategory[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [assignedClass, setAssignedClass] = useState<Class | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  
  // Selection state
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>('');
  const [selectedSemester, setSelectedSemester] = useState(currentSemester);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [showStudentReportModal, setShowStudentReportModal] = useState(false);
  
  // UI state
  const [loadingStates, setLoadingStates] = useState({
    initialLoad: true,
    teacherData: false,
    categories: false,
    students: false,
    grades: false
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [viewingComments, setViewingComments] = useState<Grade | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'class' | 'subject'>('class');
  const [connectionError, setConnectionError] = useState<boolean | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState(false);
  const [hoveredStudent, setHoveredStudent] = useState<Student | null>(null);

  // Notification state
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'connection-error';
  }>>([]);

  // Update the showNotification calls in your component
  const showNotification = (message: string, type: 'success' | 'error' | 'connection-error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  // Add a connection check at the start
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setConnectionError(null); // Reset state while checking
        // Simple ping to Supabase to check connection
        const { error } = await supabase
          .from('teachers')
          .select('id')
          .limit(1);
        
        if (error) {
          throw error;
        }
        setConnectionError(false);
      } catch (error) {
        console.error('Connection check failed:', error);
        setConnectionError(true);
        showNotification('No internet connection detected', 'error');
      }
    };

    checkConnection();
  }, []);  

  // Fetch teacher data
  const fetchTeacherData = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, teacherData: true }));
      setConnectionError(false);
      
      // Fetch teacher's assigned class
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('class_id, classes!teachers_class_id_fkey(id, name)')
        .eq('user_id', teacherId)
        .single();
  
      if (teacherError) {
        // Check if this is a connection error
        if (teacherError.message.includes('Failed to fetch') || 
            teacherError.message.includes('NetworkError') ||
            teacherError.message.includes('fetch failed')) {
          setConnectionError(true);
        }
        throw teacherError;
      }
  
      if (teacherData?.classes) {
        setAssignedClass(Array.isArray(teacherData.classes) ? teacherData.classes[0] : teacherData.classes);
        if (viewMode === 'myClass') {
          setSelectedClass(teacherData.classes[0]?.id);
        }
      }
  
      // Fetch teacher's assigned subjects
      const { data: teacherSubjectsData, error: subjectsError } = await supabase
        .from('teacher_subjects')
        .select('subject_id, class_id, subjects(name, code), classes(name)')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId);
  
      if (subjectsError) {
        if (subjectsError.message.includes('Failed to fetch') || 
            subjectsError.message.includes('NetworkError') ||
            subjectsError.message.includes('fetch failed')) {
          setConnectionError(true);
        }
        throw subjectsError;
      }
      
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
  
      // Get unique classes from subjects taught
      const uniqueClasses = Array.from(new Set(formattedSubjects.map(s => s.class_id)))
        .map(classId => {
          const subject = formattedSubjects.find(s => s.class_id === classId);
          return {
            id: classId,
            name: subject?.class_name || 'Unknown'
          };
        });
  
      setClasses(uniqueClasses);
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string' &&
          ((error as any).message.includes('Failed to fetch') || 
           (error as any).message.includes('NetworkError') ||
           (error as any).message.includes('fetch failed'))) {
        setConnectionError(true);
        showNotification('No internet connection detected', 'connection-error');
      } else {
        showNotification('Failed to load teacher data', 'error');
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, teacherData: false, initialLoad: false }));
    }
  };

  // Fetch all subjects for the class
  useEffect(() => {
    const fetchAllSubjects = async () => {
      if (!assignedClass?.id) return;
      
      try {
        setLoadingStates(prev => ({ ...prev, teacherData: true }));
        
        // First get all class-subject relationships for this class
        const { data: classSubjectsData, error: classSubjectsError } = await supabase
          .from('class_subjects')
          .select(`
            id,
            school_id,
            class_id,
            subject_id,
            subjects (
              id,
              name,
              code
            )
          `)
          .eq('class_id', assignedClass.id);
        
        if (classSubjectsError) throw classSubjectsError;
        
        // Format the data
        const formattedSubjects = (classSubjectsData || []).map(item => {
          const subject = Array.isArray(item.subjects) ? item.subjects[0] : item.subjects;
          return {
            id: item.id,
            school_id: item.school_id,
            class_id: item.class_id,
            subject_id: item.subject_id,
            name: subject?.name || 'Unknown',
            code: subject?.code || '',
          };
        });
        
        setAllSubjects(formattedSubjects);
      } catch (error) {
        console.error('Error fetching all subjects:', error);
      } finally {
        setLoadingStates(prev => ({ ...prev, teacherData: false }));
      }
    };
    fetchAllSubjects();
  }, [assignedClass]); 


  // Fetch grade categories
  const fetchGradeCategories = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, categories: true }));
      setConnectionError(false);
      
      let subjectIds: string[] = [];
  
      if (viewMode === 'myClass' && assignedClass?.id) {
        // For myClass view, get all subjects assigned to this class
        subjectIds = teacherSubjects
          .filter(s => s.class_id === assignedClass.id)
          .map(s => s.subject_id);
      } else if (viewMode === 'subjectsTaught') {
        // For subjectsTaught view, only get categories for the selected subject if one is selected
        if (selectedSubject) {
          subjectIds = [selectedSubject];
        } else {
          // If no subject selected, don't fetch any categories
          setGradeCategories([]);
          return;
        }
      }
  
      if (subjectIds.length === 0) {
        setGradeCategories([]);
        return;
      }
  
      const { data, error } = await supabase
        .from('grade_categories')
        .select('*')
        .in('subject_id', subjectIds);
  
      if (error) throw error;
  
      setGradeCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showNotification('Failed to load grade categories', 'error');
    } finally {
      setLoadingStates(prev => ({ ...prev, categories: false }));
    }
  };  

  // Fetch students
  const fetchStudents = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, students: true }));
      setConnectionError(false);
      const classId = viewMode === 'myClass' ? assignedClass?.id : selectedClass;
  
      if (!classId) {
        setStudents([]);
        return;
      }
  
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .order('roll_no', { ascending: true });
  
      if (studentsError) {
        if (studentsError.message.includes('Failed to fetch') || 
            studentsError.message.includes('NetworkError') ||
            studentsError.message.includes('fetch failed')) {
          setConnectionError(true);
        }
        throw studentsError;
      }
  
      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      if (!connectionError) {
        showNotification('Failed to load students', 'error');
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, students: false }));
    }
  };
  
  // Update fetchGrades to handle connection errors
  const fetchGrades = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, grades: true }));
      setConnectionError(false);
      
      let subjectIds: string[] = [];
      if (viewMode === 'myClass' && assignedClass?.id) {
        subjectIds = teacherSubjects
          .filter(s => s.class_id === assignedClass.id)
          .map(s => s.subject_id);
      } else if (viewMode === 'subjectsTaught' && selectedSubject) {
        subjectIds = [selectedSubject];
      }
  
      if (subjectIds.length === 0) {
        setGrades([]);
        return;
      }
  
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .in('subject_id', subjectIds)
        .eq('semester', selectedSemester)
        .eq('teacher_id', teacherId);
  
      if (gradesError) {
        if (gradesError.message.includes('Failed to fetch') || 
            gradesError.message.includes('NetworkError') ||
            gradesError.message.includes('fetch failed')) {
          setConnectionError(true);
        }
        throw gradesError;
      }
  
      setGrades(gradesData || []);
    } catch (error) {
      console.error('Error fetching grades:', error);
      if (!connectionError) {
        showNotification('Failed to load grades', 'error');
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, grades: false }));
    }
  };

  useEffect(() => {
    if (teacherId && schoolId) {
      fetchTeacherData();
    }
  }, [teacherId, schoolId]);

  useEffect(() => {
    fetchGradeCategories();
  }, [viewMode, assignedClass, selectedSubject, teacherSubjects]);

  useEffect(() => {
    fetchStudents();
  }, [viewMode, assignedClass, selectedClass]);

  useEffect(() => {
    fetchGrades();
  }, [viewMode, assignedClass, selectedSubject, selectedSemester, teacherSubjects, teacherId]);

  // Helper functions
  const getClassSubjects = () => {
    if (!assignedClass) return [];
    
    // Combine with teacher's subjects to get additional info if available
    return allSubjects.map(subject => {
      const teacherSubject = teacherSubjects.find(ts => ts.subject_id === subject.id);
      return {
        subject_id: subject.id,
        class_id: subject.class_id,
        subject_name: subject.name,
        subject_code: teacherSubject?.subject_code || subject.code,
        class_name: assignedClass.name
      };
    }).sort((a, b) => a.subject_name.localeCompare(b.subject_name));
  };

  // Get subjects for selected class
  const getSubjectsForSelectedClass = () => {
    if (!selectedClass) return [];
    return teacherSubjects
      .filter(subject => subject.class_id === selectedClass)
      .sort((a, b) => a.subject_name.localeCompare(b.subject_name));
  };

  const getCategoryGrades = (studentId: string, categoryId: string) => {
    return grades.filter(grade => 
      grade.student_id === studentId && 
      grade.category_id === categoryId
    );
  };

  const calculateCategoryAverage = (studentId: string, categoryId: string) => {
    const categoryGrades = grades.filter(grade => 
      grade.student_id === studentId && 
      grade.category_id === categoryId &&
      // Add view mode specific filtering
      (viewMode === 'myClass' || 
       (viewMode === 'subjectsTaught' && grade.subject_id === selectedSubject))
    );

    if (categoryGrades.length === 0) return null;
  
    const total = categoryGrades.reduce((sum, grade) => {
      return sum + (grade.score / grade.max_score * 100);
    }, 0);

    return total / categoryGrades.length;
  };

  // Calculate subject average for a student
  const calculateSubjectAverage = (studentId: string, subjectId: string) => {
    const relevantCategories = gradeCategories.filter(cat => 
      cat.subject_id === subjectId
    );

    if (relevantCategories.length === 0) return null;

    let weightedSum = 0;
    let totalWeight = 0;

    relevantCategories.forEach(category => {
      const categoryGrades = grades.filter(grade => 
        grade.student_id === studentId && 
        grade.category_id === category.id &&
        grade.subject_id === subjectId
      );
      
      if (categoryGrades.length > 0) {
        const categoryAvg = categoryGrades.reduce((sum, grade) => {
          return sum + (grade.score / grade.max_score * 100);
        }, 0) / categoryGrades.length;
        
        weightedSum += categoryAvg * category.weight;
        totalWeight += category.weight;
      }
    });

    return totalWeight > 0 ? weightedSum / totalWeight : null;
  };

  const calculateClassAverage = () => {
    if (students.length === 0) return null;

    let total = 0;
    let count = 0;

    students.forEach(student => {
      // Calculate average across all subjects for each student
      const subjectAverages = getClassSubjects()
        .map(subject => calculateSubjectAverage(student.user_id, subject.subject_id))
        .filter(avg => avg !== null) as number[];
      
      if (subjectAverages.length > 0) {
        const studentAvg = subjectAverages.reduce((sum, avg) => sum + avg, 0) / subjectAverages.length;
        total += studentAvg;
        count++;
      }
    });

    return count > 0 ? total / count : null;
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return '#8c8c8c';
    if (score >= 90) return '#52c41a';
    if (score >= 80) return '#73d13d';
    if (score >= 70) return '#faad14';
    if (score >= 60) return '#ff7a45';
    return '#ff4d4f';
  };

  const getLetterGrade = (percentage: number | null) => {
    if (percentage === null) return 'N/A';
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  // Get students with performance data
  const getStudentsWithPerformance = () => {
    const subjectsToShow = viewMode === 'myClass' 
    ? getClassSubjects()
    : teacherSubjects.filter(s => 
        selectedClass ? s.class_id === selectedClass : true &&
        selectedSubject ? s.subject_id === selectedSubject : true
      );

  return students.map(student => {
    const performance = subjectsToShow.map(subject => {
      const subjectAvg = calculateSubjectAverage(student.user_id, subject.subject_id);
      
      return {
        subjectId: subject.subject_id,
        average: subjectAvg,
        letterGrade: getLetterGrade(subjectAvg),
        color: getScoreColor(subjectAvg)
      };
    });
      
      const validAverages = performance.filter(p => p.average !== null).map(p => p.average as number);
      const overallAvg = validAverages.length > 0 
        ? validAverages.reduce((sum, avg) => sum + avg, 0) / validAverages.length
        : null;
      
      return {
        ...student,
        performance,
        overallAvg,
        overallLetter: getLetterGrade(overallAvg),
        overallColor: getScoreColor(overallAvg)
      };
    });
  };

  // Get ranked students
  const getRankedStudents = () => {
    const studentsWithPerformance = getStudentsWithPerformance();
    return [...studentsWithPerformance].sort((a, b) => {
      const aAvg = a.overallAvg || 0;
      const bAvg = b.overallAvg || 0;
      return bAvg - aAvg;
    });
  };

  // Generate subject-specific report
  const generateSubjectReport = (doc: jsPDF, students: Student[], classInfo: Class, subjectInfo: TeacherSubject) => {
    const margin = 15;
    const primaryColor = '#3f51b5';
    const lightGray = '#f5f5f5';

    // Header
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Subject Performance Report', margin, 20);

    // Subject info
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Class: ${classInfo.name}`, margin, 40);
    doc.text(`Subject: ${subjectInfo.subject_name} (${subjectInfo.subject_code})`, margin, 45);
    doc.text(`Semester: ${selectedSemester}`, margin, 50);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 55);

    // Performance summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('Performance Summary', margin, 70);

    const subjectAverages = students.map(student => {
      const perf = student.performance?.find(p => p.subjectId === subjectInfo.subject_id) ?? null;
      return perf?.average || null;
    }).filter(avg => avg !== null) as number[];

    const subjectAvg = subjectAverages.length > 0 
      ? subjectAverages.reduce((a, b) => a + b, 0) / subjectAverages.length 
      : null;

    const topPerformer = students[0];

    autoTable(doc, {
      startY: 75,
      body: [
        [
          { content: 'Subject Average', styles: { fontStyle: 'bold', fillColor: lightGray } },
          { content: subjectAvg ? `${subjectAvg.toFixed(1)}%` : 'N/A', styles: { halign: 'center' } },
          { content: 'Top Performer', styles: { fontStyle: 'bold', fillColor: lightGray } },
          { content: topPerformer ? `${topPerformer.first_name} ${topPerformer.last_name}` : 'N/A', styles: { halign: 'center' } }
        ]
      ],
      margin: { left: margin, right: margin },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    // Grade categories
    doc.setFontSize(14);
    doc.text('Grade Categories', margin, doc.lastAutoTable.finalY + 15);

    const categories = gradeCategories.filter(cat => cat.subject_id === subjectInfo.subject_id);
    const categoryData = categories.map(category => [
      category.name,
      `${category.weight}%`,
      `Evaluates ${category.name.toLowerCase()} performance`
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Category', 'Weight', 'Description']],
      body: categoryData,
      margin: { left: margin, right: margin }
    });

    // Student performance
    doc.setFontSize(14);
    doc.text('Student Performance', margin, doc.lastAutoTable.finalY + 15);

    const studentData = students.map((student, index) => {
      const perf = student.performance?.find(p => p.subjectId === subjectInfo.subject_id);
      return [
        (index + 1).toString(),
        student.roll_no,
        `${student.first_name} ${student.last_name}`,
        perf?.average ? `${perf.average.toFixed(1)}%` : 'N/A',
        perf?.letterGrade || 'N/A'
      ];
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Rank', 'Roll No', 'Student', 'Score', 'Grade']],
      body: studentData,
      margin: { left: margin, right: margin },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const grade = data.cell.raw;
          if (typeof grade === 'string' && grade !== 'N/A') {
            const x = data.cell.x + data.cell.width / 2;
            const y = data.cell.y + data.cell.height / 2;
            const radius = Math.min(data.cell.width, data.cell.height) * 0.3;
            
            doc.setFillColor(getScoreColor(
              grade === 'A' ? 95 : 
              grade === 'B' ? 85 : 
              grade === 'C' ? 75 : 
              grade === 'D' ? 65 : 55
            ));
            doc.circle(x, y, radius, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(grade, x, y + 2, { align: 'center' });
            
            return false;
          }
        }
      }
    });
  };

  // Generate class overview report
  const generateClassReport = (doc: jsPDF, students: Student[], classInfo: Class) => {
    const margin = 15;
    const primaryColor = '#3f51b5';
    const lightGray = '#f5f5f5';

    // Header
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Class Performance Report', margin, 20);

    // Class info
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Class: ${classInfo.name}`, margin, 40);
    doc.text(`Semester: ${selectedSemester}`, margin, 45);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 50);

    // Class overview
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('Class Overview', margin, 70);

    const classAvg = calculateClassAverage();
    const topPerformer = students[0];

    autoTable(doc, {
      startY: 75,
      body: [
        [
          { content: 'Class Average', styles: { fontStyle: 'bold', fillColor: lightGray } },
          { content: classAvg ? `${classAvg.toFixed(1)}%` : 'N/A', styles: { halign: 'center' } },
          { content: 'Top Performer', styles: { fontStyle: 'bold', fillColor: lightGray } },
          { content: topPerformer ? `${topPerformer.first_name} ${topPerformer.last_name}` : 'N/A', styles: { halign: 'center' } }
        ],
        [
          { content: 'Total Students', styles: { fontStyle: 'bold', fillColor: lightGray } },
          { content: students.length.toString(), styles: { halign: 'center' } },
          { content: 'Subjects', styles: { fontStyle: 'bold', fillColor: lightGray } },
          { content: getClassSubjects().length.toString(), styles: { halign: 'center' } }
        ]
      ],
      margin: { left: margin, right: margin },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    // Subjects summary
    doc.setFontSize(14);
    doc.text('Subjects Summary', margin, doc.lastAutoTable.finalY + 15);

    const subjectData = getClassSubjects().map(subject => {
      const subjectAverages = students.map(student => {
        const perf = student.performance?.find(p => p.subjectId === subject.subject_id);
        return perf?.average || 0;
      }).filter(avg => avg > 0);
      
      const subjectAvg = subjectAverages.length > 0 
        ? subjectAverages.reduce((a, b) => a + b, 0) / subjectAverages.length 
        : null;
      
      return [
        subject.subject_name,
        subject.subject_code,
        subjectAvg ? `${subjectAvg.toFixed(1)}%` : 'N/A',
        getLetterGrade(subjectAvg)
      ];
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Subject', 'Code', 'Average', 'Grade']],
      body: subjectData,
      margin: { left: margin, right: margin }
    });

    // Student performance
    doc.setFontSize(14);
    doc.text('Student Performance', margin, doc.lastAutoTable.finalY + 15);

    const studentData = students.map((student, index) => [
      (index + 1).toString(),
      student.roll_no,
      `${student.first_name} ${student.last_name}`,
      student.overallAvg ? `${student.overallAvg.toFixed(1)}%` : 'N/A',
      student.overallLetter || 'N/A'
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Rank', 'Roll No', 'Student', 'Average', 'Grade']],
      body: studentData,
      margin: { left: margin, right: margin },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const grade = data.cell.raw;
          if (typeof grade === 'string' && grade !== 'N/A') {
            const x = data.cell.x + data.cell.width / 2;
            const y = data.cell.y + data.cell.height / 2;
            const radius = Math.min(data.cell.width, data.cell.height) * 0.3;
            
            doc.setFillColor(getScoreColor(
              grade === 'A' ? 95 : 
              grade === 'B' ? 85 : 
              grade === 'C' ? 75 : 
              grade === 'D' ? 65 : 55
            ));
            doc.circle(x, y, radius, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(grade, x, y + 2, { align: 'center' });
            
            return false;
          }
        }
      }
    });
  };

  const generateStudentPDFReport = async (student: Student) => {
    try {
      setReportLoading(true);
      setConnectionError(false);
      
      const studentData = getStudentsWithPerformance().find(s => s.id === student.id);
      if (!studentData) {
        showNotification('Student data not found', 'error');
        return;
      }
  
      const currentClass = viewMode === 'myClass' ? assignedClass : classes.find(c => c.id === selectedClass);
      if (!currentClass) {
        showNotification('Class information not found', 'error');
        return;
      }
  
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm'
      });
  
      // Define colors
      const primaryColor = '#3f51b5';
      const secondaryColor = '#2196f3';
      const accentColor = '#f5cc4d';
      const textColor = '#424242';
      
      // Header with school logo and title
      doc.setFillColor(primaryColor);
      doc.rect(0, 0, 210, 30, 'F');
      
      // School logo placeholder
      doc.setFillColor(255, 255, 255);
      doc.circle(180, 15, 10, 'F');
      doc.setDrawColor(accentColor);
      doc.setLineWidth(1);
      doc.circle(180, 15, 10, 'S');
      
      // Header text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Performance Report', 15, 20);
  
      // Student information
      doc.setFontSize(10);
      doc.setTextColor(textColor);
      doc.text(`Student: ${student.first_name} ${student.last_name}`, 15, 45);
      doc.text(`Roll No: ${student.roll_no}`, 15, 50);
      doc.text(`Class: ${currentClass.name}`, 15, 55);
      doc.text(`Semester: ${selectedSemester}`, 15, 60);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, 65);
  
      // Overall Performance
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text('Overall Performance', 15, 80);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      if (studentData.overallAvg !== null) {
        // Performance circle
        const gradeX = 160;
        const gradeY = 85;
        const radius = 15;
        
        doc.setFillColor(studentData.overallColor);
        doc.circle(gradeX, gradeY, radius, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(studentData.overallLetter, gradeX, gradeY + 5, { align: 'center' });
        
        // Performance text
        doc.setTextColor(textColor);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Average: ${studentData.overallAvg.toFixed(1)}%`, 15, 85);
        
        // Performance bar
        const barWidth = 80;
        const barHeight = 6;
        const barX = 15;
        const barY = 92;
        
        doc.setFillColor('#e0e0e0');
        doc.roundedRect(barX, barY, barWidth, barHeight, 2, 2, 'F');
        
        const progressWidth = Math.min(studentData.overallAvg, 100) * barWidth / 100;
        doc.setFillColor(studentData.overallColor);
        doc.roundedRect(barX, barY, progressWidth, barHeight, 2, 2, 'F');
      } else {
        doc.text('No grades available', 15, 85);
      }
  
      // Subject-wise Performance
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text('Subject-wise Performance', 15, 110);
      
      const subjectData = getClassSubjects().map(subject => {
        const perf = studentData.performance.find(p => p.subjectId === subject.subject_id);
        return {
          subject: subject.subject_name,
          code: subject.subject_code,
          average: perf?.average || null,
          grade: perf?.letterGrade || 'N/A',
          color: perf?.color || '#8c8c8c'
        };
      });
  
      autoTable(doc, {
        head: [['Subject', 'Code', 'Average', 'Grade']],
        body: subjectData.map(s => [
          s.subject,
          s.code,
          s.average ? `${s.average.toFixed(1)}%` : 'N/A',
          s.grade
        ]),
        startY: 115,
        didDrawCell: (data) => {
          if (data.column.index === 3 && data.row.index >= 0 && data.row.section === 'body') {
            const subjectIndex = data.row.index;
            if (subjectIndex < subjectData.length) {
              const cellColor = subjectData[subjectIndex].color;
              const x = data.cell.x + 5;
              const y = data.cell.y + data.cell.height / 2;
              doc.setFillColor(cellColor);
              doc.circle(x, y, 3, 'F');
            }
          }
        },
        headStyles: {
          fillColor: secondaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          cellPadding: 5
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 }
        }
      });
  
      // Detailed Grade Breakdown
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text('Detailed Grade Breakdown', 15, doc.lastAutoTable.finalY + 15);
      
      const detailedData = [];
      for (const subject of getClassSubjects()) {
        const categories = gradeCategories.filter(cat => cat.subject_id === subject.subject_id);
        
        for (const category of categories) {
          const grades = getCategoryGrades(student.user_id, category.id);
          if (grades.length > 0) {
            detailedData.push({
              subject: subject.subject_name,
              category: category.name,
              grades: grades.map(g => ({
                score: g.score,
                max: g.max_score,
                percentage: (g.score / g.max_score * 100).toFixed(1),
                date: new Date(g.date_given).toLocaleDateString(),
                comments: g.comments || ''
              }))
            });
          }
        }
      }
  
      let startY = doc.lastAutoTable.finalY + 25;
      const detailedDataToShow = detailedData.slice(0, 3); // Show first 3 subjects
      
      for (const item of detailedDataToShow) {
        if (startY > 250) {
          doc.addPage();
          startY = 20;
        }
        
        // Subject header
        doc.setFillColor(secondaryColor);
        doc.roundedRect(15, startY - 5, 180, 10, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${item.subject} - ${item.category}`, 20, startY);
        startY += 10;
  
        // Grade table
        autoTable(doc, {
          head: [['Score', 'Max', 'Percentage', 'Date', 'Comments']],
          body: item.grades.map(g => [
            g.score,
            g.max,
            `${g.percentage}%`,
            g.date,
            g.comments.substring(0, 30) + (g.comments.length > 30 ? '...' : '')
          ]),
          startY: startY,
          margin: { left: 15, right: 15 },
          styles: {
            fontSize: 9,
            cellPadding: 4
          },
          headStyles: {
            fillColor: [70, 130, 180],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 20 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { cellWidth: 70 }
          }
        });
        startY = doc.lastAutoTable.finalY + 10;
      }
      
      // Footer
      const footerY = doc.internal.pageSize.height - 20;
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.5);
      doc.line(10, footerY, 200, footerY);
      doc.setFontSize(9);
      doc.setTextColor(textColor);
      doc.text('Generated by School Management System', 105, footerY + 10, { align: 'center' });
  
      // Page numbers
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(textColor);
        doc.text(`Page ${i} of ${totalPages}`, 180, footerY + 10);
      }
  
      // Save the PDF
      const fileName = `Student_Report_${student.first_name}_${student.last_name}_${selectedSemester.replace(' ', '_')}.pdf`;
      doc.save(fileName);
  
      showNotification('Student PDF report generated successfully!', 'success');
    } catch (error) {
      console.error('Error generating student PDF:', error);
      showNotification('Failed to generate student PDF report', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  // Main PDF generation function
  const generatePDFReport = async () => {
    try {
      // Validate selections
      if (viewMode === 'subjectsTaught' && (!selectedClass || !selectedSubject)) {
        showNotification('Please select both a class and subject before generating the report', 'error');
        return;
      }

      setReportLoading(true);
      
      const rankedStudents = getRankedStudents();
      const currentClass = viewMode === 'myClass' ? assignedClass : classes.find(c => c.id === selectedClass);
      const currentSubject = teacherSubjects.find(s => s.subject_id === selectedSubject);
      
      if (!currentClass) {
        showNotification('Class information not found', 'error');
        return;
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm' });
      
      if (viewMode === 'subjectsTaught' && currentSubject) {
        generateSubjectReport(doc, rankedStudents, currentClass, currentSubject);
      } else {
        generateClassReport(doc, rankedStudents, currentClass);
      }

      // Save the PDF
      const fileName = viewMode === 'subjectsTaught' 
        ? `Subject_Report_${currentClass.name}_${currentSubject?.subject_code}_${new Date().toISOString().split('T')[0]}.pdf`
        : `Class_Report_${currentClass.name}_${selectedSemester.replace(' ', '_')}.pdf`;
      
      doc.save(fileName);
      showNotification('PDF report generated successfully!', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showNotification('Failed to generate PDF report', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  // Render rank with special styling for top 3
  const renderRank = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-md">
          <Trophy className="w-5 h-5" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 text-white shadow-md">
          <Medal className="w-5 h-5" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-md">
          <Star className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
        {rank}
      </div>
    );
  };

  // Render performance trend indicator
  const renderTrendIndicator = (avg: number | null, previousAvg?: number | null) => {
    if (!avg || !previousAvg) return null;
    
    const difference = avg - (previousAvg || 0);
    
    if (difference > 5) {
      return <ChevronsUp className="w-5 h-5 text-green-500" />;
    }
    if (difference > 0) {
      return <ChevronUp className="w-5 h-5 text-green-400" />;
    }
    if (difference < -5) {
      return <ChevronsUp className="w-5 h-5 text-red-500 transform rotate-180" />;
    }
    if (difference < 0) {
      return <ChevronUp className="w-5 h-5 text-red-400 transform rotate-180" />;
    }
    return <Circle className="w-3 h-3 text-gray-400" />;
  };

  // Render simple trend indicator for hover tooltip
  const renderSimpleTrendIndicator = (score: number | null) => {
    if (!score) return <MinusCircle className="w-4 h-4 text-gray-400" />;
    if (score > 85) return <ArrowUpCircle className="w-4 h-4 text-green-500" />;
    if (score < 75) return <ArrowDownCircle className="w-4 h-4 text-red-500" />;
    return <MinusCircle className="w-4 h-4 text-gray-400" />;
  };

  // Render performance bar
  const renderPerformanceBar = (percentage: number | null) => {
    const width = percentage ? Math.min(100, Math.max(0, percentage)) : 0;
    return (
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full"
          style={{ 
            width: `${width}%`,
            backgroundColor: getScoreColor(percentage)
          }}
        />
      </div>
    );
  };

  // Tooltip component for hover in compact view
  const ScoreTooltip = ({ student }: { student: Student }) => {
    if (!student) return null;
    
    return (
      <div className="absolute z-10 bg-white shadow-lg rounded-lg border p-3 w-64">
        <div className="flex justify-between mb-2">
          <div className="font-medium">{student.first_name} {student.last_name}</div>
          <div 
            className="font-bold" 
            style={{ color: getScoreColor(student.overallAvg ?? null) }}
          >
            {student.overallAvg?.toFixed(1) || 'N/A'}%
          </div>
        </div>
        
        <div className="space-y-2">
          {student.performance?.map((perf) => {
            const subject = getClassSubjects().find(s => s.subject_id === perf.subjectId);
            if (!subject || !perf.average) return null;
            
            return (
              <div key={perf.subjectId} className="flex justify-between text-sm">
                <span>{subject.subject_name}</span>
                <span style={{ color: perf.color }}>
                  {perf.average.toFixed(1)}% ({perf.letterGrade})
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="mt-2 text-xs text-gray-500 italic">Click for detailed report</div>
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {/* Control Panel Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 animate-pulse">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="h-10 bg-gray-200 rounded w-full md:w-64"></div>
          <div className="h-10 bg-gray-200 rounded w-full md:w-64"></div>
          <div className="h-10 bg-gray-200 rounded w-full md:w-64"></div>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-8 bg-gray-200 rounded w-24"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </div>
  
      {/* Quick Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 border border-gray-200 rounded-xl p-5 h-32 animate-pulse"></div>
        ))}
      </div>
  
      {/* Table Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden animate-pulse">
        <div className="p-4 border-b bg-gray-50 h-16"></div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="h-12 bg-gray-100 rounded w-full"></div>
          ))}
        </div>
      </div>
    </div>
  );

  const hasAssignedClass = !!assignedClass;
  const hasSubjectsTaught = teacherSubjects.length > 0;
  
  if (connectionError === true) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="p-8 text-center bg-amber-50 border border-amber-200 rounded-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-4">
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-amber-700 mb-2">Connection Error</h2>
          <p className="text-amber-600 mb-4">
            Unable to connect to the server. Please check your internet connection.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  
  if (connectionError === false && !hasAssignedClass && !hasSubjectsTaught && !loadingStates.initialLoad) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="p-8 text-center bg-blue-50 border border-blue-200 rounded-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-blue-700 mb-2">No Assignments Found</h2>
          <p className="text-blue-600 mb-4">
            You haven't been assigned to any classes or subjects yet.
          </p>
          <div className="text-sm text-blue-500">
            Please contact your school administrator for assistance.
          </div>
        </div>
      </div>
    );
  }

  const currentSubject = teacherSubjects.find(s => s.subject_id === selectedSubject);
  const currentClass = viewMode === 'myClass' 
    ? assignedClass 
    : classes.find(c => c.id === selectedClass);

  const classSubjects = getClassSubjects();
  const rankedStudents = getRankedStudents();

  return (
    <div className="min-h-screen text-black">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header with toggles */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-600" />
            Student Performance Reports
          </h1>
          
          <div className="flex gap-2">
            {hasAssignedClass && (
              <button
                onClick={() => {
                  setViewMode('myClass');
                  setSelectedClass(assignedClass.id);
                  setSelectedSubject(null);
                }}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  viewMode === 'myClass' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                My Class
              </button>
            )}
            
            {hasSubjectsTaught && (
              <button
                onClick={() => {
                  setViewMode('subjectsTaught');
                  setSelectedClass(classes[0]?.id || null);
                  setSelectedSubject(null);
                }}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  viewMode === 'subjectsTaught' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Book className="w-4 h-4" />
                Subjects Taught
              </button>
            )}
          </div>
        </div>

        {loadingStates.initialLoad ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Control panel */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Semester Selector */}
                <div className="relative flex-grow sm:flex-grow-0 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Semester</label>
                  <select
                    className="w-full bg-white rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    disabled={loadingStates.teacherData}
                  >
                    <option value={`${new Date().getFullYear()} Spring`}>Spring {new Date().getFullYear()}</option>
                    <option value={`${new Date().getFullYear()} Fall`}>Fall {new Date().getFullYear()}</option>
                    <option value={`${new Date().getFullYear() - 1} Spring`}>Spring {new Date().getFullYear() - 1}</option>
                    <option value={`${new Date().getFullYear() - 1} Fall`}>Fall {new Date().getFullYear() - 1}</option>
                  </select>
                  {loadingStates.teacherData && (
                    <div className="absolute right-3 top-9">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Class Selector (only for Subjects Taught view) */}
                {viewMode === 'subjectsTaught' && (
                  <div className="relative flex-grow sm:flex-grow-0 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Class</label>
                    <select
                      className="w-full bg-white rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedClass || ''}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      disabled={classes.length === 0 || loadingStates.teacherData}
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                    {loadingStates.teacherData && (
                      <div className="absolute right-3 top-9">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                )}

                {/* Subject Selector (only for Subjects Taught view) */}
                {viewMode === 'subjectsTaught' && selectedClass && (
                  <div className="relative flex-grow sm:flex-grow-0 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Subject</label>
                    <select
                      className="w-full bg-white rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedSubject || ''}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      disabled={getSubjectsForSelectedClass().length === 0 || loadingStates.teacherData}
                    >
                      <option value="">Select Subject</option>
                      {getSubjectsForSelectedClass().map(subject => (
                        <option key={subject.subject_id} value={subject.subject_id}>
                          {subject.subject_name} ({subject.subject_code})
                        </option>
                      ))}
                    </select>
                    {loadingStates.teacherData && (
                      <div className="absolute right-3 top-9">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                )}

                {/* Class Average Badge */}
                <div className="ml-auto flex items-center gap-2">
                  <div className="text-sm font-medium text-gray-500">Class Average:</div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-lg font-bold" 
                      style={{ color: getScoreColor(calculateClassAverage()) }}
                    >
                      {calculateClassAverage()?.toFixed(1) || 'N/A'}%
                    </span>
                    <span 
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{ 
                        backgroundColor: getScoreColor(calculateClassAverage()) + '20',
                        color: getScoreColor(calculateClassAverage())
                      }}
                    >
                      {getLetterGrade(calculateClassAverage())}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Current View Info */}
              <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-gray-500">View:</span>
                  <span className="ml-2 font-medium">
                    {viewMode === 'myClass' ? 'My Assigned Class' : 'Subjects Taught'}
                  </span>
                </div>
                {currentClass && (
                  <div>
                    <span className="text-gray-500">Class:</span>
                    <span className="ml-2 font-medium">{currentClass.name}</span>
                  </div>
                )}
                {viewMode === 'subjectsTaught' && currentSubject && (
                  <div>
                    <span className="text-gray-500">Subject:</span>
                    <span className="ml-2 font-medium">
                      {currentSubject.subject_name} ({currentSubject.subject_code})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Report buttons */}
            {showReportButtons && (
              <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    Generate Reports
                  </h3>
                  
                  <div className="flex flex-wrap gap-3">
                    {viewMode === 'myClass' && (
                      <button
                        onClick={() => {
                          setReportType('class');
                          setShowReportModal(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg flex items-center gap-2 hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                        disabled={loadingStates.grades || loadingStates.students}
                      >
                        {loadingStates.grades || loadingStates.students ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <BarChart2 className="w-4 h-4" />
                        )}
                        View Class Report
                      </button>
                    )}
                    
                    {viewMode === 'subjectsTaught' && selectedSubject && (
                      <button
                        onClick={() => {
                          setReportType('subject');
                          setShowReportModal(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg flex items-center gap-2 hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                        disabled={loadingStates.grades || loadingStates.students}
                      >
                        {loadingStates.grades || loadingStates.students ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <BookOpen className="w-4 h-4" />
                        )}
                        View Subject Report
                      </button>
                    )}
                    
                    <button
                      onClick={generatePDFReport}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg flex items-center gap-2 hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70"
                      disabled={
                        reportLoading || 
                        (viewMode === 'subjectsTaught' && (!selectedClass || !selectedSubject))
                      }
                    >
                      {reportLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Show loading skeleton for specific sections if they're loading */}
            {loadingStates.students || loadingStates.grades ? (
              <div className="space-y-6">
                {/* Quick Stats Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-100 border border-gray-200 rounded-xl p-5 h-32 animate-pulse"></div>
                  ))}
                </div>
                
                {/* Table Skeleton */}
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden animate-pulse">
                  <div className="p-4 border-b bg-gray-50 h-16"></div>
                  <div className="p-6 space-y-4">
                    {[1, 2, 3, 4, 5].map((row) => (
                      <div key={row} className="h-12 bg-gray-100 rounded w-full"></div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Quick Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-blue-600">Top Performer</h3>
                        <p className="text-xl font-bold text-blue-800 mt-1">
                          {rankedStudents[0]?.first_name} {rankedStudents[0]?.last_name || 'N/A'}
                        </p>
                        <p className="text-lg text-blue-700 flex items-center gap-2">
                          {rankedStudents[0]?.overallAvg?.toFixed(1) || 'N/A'}%
                          <ChevronsUp className="w-5 h-5 text-blue-500" />
                        </p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-full">
                        <Trophy className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  {viewMode === 'myClass' ? (
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-green-600">Class Average</h3>
                          <p className="text-3xl font-bold text-green-800 mt-1">
                            {calculateClassAverage()?.toFixed(1) || 'N/A'}%
                          </p>
                          <div className="mt-2 w-full">
                            {renderPerformanceBar(calculateClassAverage())}
                          </div>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                          <BarChart2 className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    viewMode === 'subjectsTaught' && selectedSubject && (
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-medium text-purple-600">Grading Structure</h3>
                            <div className="mt-2 space-y-1">
                              {gradeCategories
                                .filter(cat => cat.subject_id === selectedSubject)
                                .map(category => (
                                  <div key={category.id} className="flex justify-between text-sm">
                                    <span>{category.name}</span>
                                    <span className="font-medium">{category.weight}%</span>
                                  </div>
                                ))
                              }
                              {gradeCategories.filter(cat => cat.subject_id === selectedSubject).length === 0 && (
                                <p className="text-sm text-purple-500">No categories defined</p>
                              )}
                            </div>
                          </div>
                          <div className="p-3 bg-purple-100 rounded-full">
                            <ClipboardList className="w-6 h-6 text-purple-600" />
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-purple-600">Grade Distribution</h3>
                        <div className="flex items-center gap-4 mt-2">
                          {['A', 'B', 'C', 'D', 'F'].map(grade => (
                            <div key={grade} className="flex flex-col items-center">
                              <span 
                                className="text-xs font-medium px-2 py-1 rounded-full"
                                style={{ 
                                  backgroundColor: getScoreColor(
                                    grade === 'A' ? 95 : 
                                    grade === 'B' ? 85 : 
                                    grade === 'C' ? 75 : 
                                    grade === 'D' ? 65 : 
                                    55
                                  ) + '20',
                                  color: getScoreColor(
                                    grade === 'A' ? 95 : 
                                    grade === 'B' ? 85 : 
                                    grade === 'C' ? 75 : 
                                    grade === 'D' ? 65 : 
                                    55
                                  )
                                }}
                              >
                                {grade}
                              </span>
                              <span className="text-xs mt-1">
                                {rankedStudents.filter(s => s.overallLetter === grade).length}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-full">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Table */}
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="text-lg font-medium flex items-center gap-2">
                      <Award className="w-5 h-5 text-purple-600" />
                      Student Performance Overview
                    </h2>
                    {viewMode === 'myClass' && (
                      <button 
                        onClick={() => setExpandedSubjects(!expandedSubjects)}
                        className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        {expandedSubjects ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Compact View
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Expanded View
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Roll No
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Overall
                          </th>
                          {viewMode === 'myClass' && expandedSubjects && classSubjects.map(subject => (
                            <th key={subject.subject_id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                              <div className="flex flex-col items-center">
                                <span>{subject.subject_code}</span>
                                <span className="text-xs font-normal normal-case text-gray-400 truncate max-w-full">{subject.subject_name}</span>
                              </div>
                            </th>
                          ))}
                          {viewMode === 'subjectsTaught' && selectedSubject && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category Breakdown
                            </th>
                          )}
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rankedStudents.map((student, index) => (
                          <tr 
                            key={student.id} 
                            className="hover:bg-gray-50 relative"
                            onMouseEnter={() => setHoveredStudent(student)}
                            onMouseLeave={() => setHoveredStudent(null)}
                          >
                            <td className="px-3 py-4 whitespace-nowrap">
                              {renderRank(index + 1)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                  {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {student.first_name} {student.last_name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.roll_no}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="text-sm font-bold" 
                                  style={{ color: getScoreColor(student.overallAvg) }}
                                >
                                  {student.overallAvg?.toFixed(1) || 'N/A'}%
                                </span>
                                <span 
                                  className="px-2 py-1 text-xs rounded-full font-medium"
                                  style={{ 
                                    backgroundColor: getScoreColor(student.overallAvg) + '20',
                                    color: getScoreColor(student.overallAvg)
                                  }}
                                >
                                  {student.overallLetter}
                                </span>
                                {viewMode === 'myClass' && !expandedSubjects && renderSimpleTrendIndicator(student.overallAvg)}
                              </div>
                              
                              {/* Hover tooltip in compact view */}
                              {hoveredStudent?.id === student.id && viewMode === 'myClass' && !expandedSubjects && (
                                <ScoreTooltip student={student} />
                              )}
                            </td>
                            
                            {viewMode === 'myClass' && expandedSubjects && classSubjects.map(subject => {
                              const subjectPerf = student.performance?.find(p => p.subjectId === subject.subject_id);
                              return (
                                <td key={subject.subject_id} className="px-2 py-4 text-center">
                                  <div className="flex flex-col items-center">
                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                                      <div 
                                        className="h-full rounded-full"
                                        style={{ 
                                          width: subjectPerf?.average ? `${Math.min(100, Math.max(0, subjectPerf.average))}%` : '0%',
                                          backgroundColor: subjectPerf?.color || '#8c8c8c'
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-xs font-medium" style={{ color: subjectPerf?.color || '#8c8c8c' }}>
                                        {subjectPerf?.average ? `${subjectPerf?.average?.toFixed(1)}%` : 'N/A'}
                                      </span>
                                      <span className="text-xs">{subjectPerf?.letterGrade || 'N/A'}</span>
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                            
                            {viewMode === 'subjectsTaught' && selectedSubject && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                {gradeCategories.filter(cat => cat.subject_id === selectedSubject).length > 0 ? (
                                  <div className="space-y-2">
                                    {gradeCategories
                                      .filter(cat => cat.subject_id === selectedSubject)
                                      .map(category => {
                                        const avg = calculateCategoryAverage(student.user_id, category.id);
                                        return (
                                          <div key={category.id} className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 w-16 truncate">{category.name}</span>
                                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                              <div 
                                                className="h-full rounded-full"
                                                style={{ 
                                                  width: avg ? `${Math.min(100, Math.max(0, avg))}%` : '0%',
                                                  backgroundColor: getScoreColor(avg)
                                                }}
                                              />
                                            </div>
                                            <span className="text-xs font-medium" style={{ color: getScoreColor(avg) }}>
                                              {avg ? `${avg.toFixed(1)}%` : 'N/A'}
                                            </span>
                                          </div>
                                        );
                                      })
                                    }
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">No categories defined</div>
                                )}
                              </td>
                            )}
                            
                            <td className="px-3 py-4 whitespace-nowrap text-right">
                              <button
                                onClick={() => {
                                  setSelectedStudentForReport(student);
                                  setShowStudentReportModal(true);
                                }}
                                className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-sm ml-auto"
                              >
                                <FileText className="w-4 h-4" />
                                Report
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Grade Categories Section (for Subjects Taught view) */}
                {viewMode === 'subjectsTaught' && selectedSubject && (
                <div className="mt-6 bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-blue-500" />
                      Grade Categories Breakdown
                    </h3>
                    <span className="text-sm text-gray-500">
                      {gradeCategories.filter(cat => cat.subject_id === selectedSubject).length} categories
                    </span>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {gradeCategories
                      .filter(category => category.subject_id === selectedSubject)
                      .map(category => {
                        const categoryGrades = grades.filter(g => g.category_id === category.id);
                        const avgScore = categoryGrades.length > 0 
                          ? (categoryGrades.reduce((sum, g) => sum + (g.score/g.max_score), 0) / categoryGrades.length) * 100
                          : null;
                          
                        return (
                          <div key={category.id} className="p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-medium">{category.name}</h4>
                                <p className="text-sm text-gray-500">Weight: {category.weight}%</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {categoryGrades.length} grades
                                </span>
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: getScoreColor(avgScore) }}
                                />
                              </div>
                            </div>
                            
                            <div className="mt-3">
                              <div className="text-sm font-medium mb-1">
                                Class Average: {avgScore ? `${avgScore.toFixed(1)}%` : 'N/A'}
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full"
                                  style={{ 
                                    width: avgScore ? `${Math.min(100, Math.max(0, avgScore))}%` : '0%',
                                    backgroundColor: getScoreColor(avgScore)
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    }
                    
                    {gradeCategories.filter(cat => cat.subject_id === selectedSubject).length === 0 && (
                      <div className="p-6 text-center text-gray-500">
                        No grade categories defined for this subject
                      </div>
                    )}
                  </div>
                </div>
              )}
              </>
            )}
          </>
        )}

        {/* Report Modal */}
        <AnimatePresence>
          {showReportModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-3">
                        {reportType === 'class' ? (
                          <>
                            <Users className="w-8 h-8" />
                            Class Performance Report
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-8 h-8" />
                            Subject Performance Report
                          </>
                        )}
                      </h2>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Class:</span>
                          <span>{currentClass?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Semester:</span>
                          <span>{selectedSemester}</span>
                        </div>
                        {reportType === 'subject' && currentSubject && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Subject:</span>
                            <span>{currentSubject.subject_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowReportModal(false)}
                      className="p-2 rounded-full hover:bg-blue-400 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Performance Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-blue-600">Top Performer</h3>
                          <p className="text-xl font-bold text-blue-800 mt-1">
                            {rankedStudents[0]?.first_name} {rankedStudents[0]?.last_name || 'N/A'}
                          </p>
                          <p className="text-lg text-blue-700">
                            {rankedStudents[0]?.overallAvg?.toFixed(1) || 'N/A'}%
                          </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                          <Trophy className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-green-600">Class Average</h3>
                          <p className="text-3xl font-bold text-green-800 mt-1">
                            {calculateClassAverage()?.toFixed(1) || 'N/A'}%
                          </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                          <BarChart2 className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-purple-600">Total Students</h3>
                          <p className="text-3xl font-bold text-purple-800 mt-1">
                            {students.length}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full">
                          <Users className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student Rankings Table */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Roll No
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Overall
                          </th>
                          {reportType === 'class' && classSubjects.map(subject => (
                            <th key={subject.subject_id} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {subject.subject_code}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rankedStudents.map((student, index) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {renderRank(index + 1)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                  {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {student.first_name} {student.last_name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.roll_no}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="text-sm font-bold" 
                                  style={{ color: getScoreColor(student.overallAvg) }}
                                >
                                  {student.overallAvg?.toFixed(1) || 'N/A'}%
                                </span>
                                <span 
                                  className="px-2 py-1 text-xs rounded-full font-medium"
                                  style={{ 
                                    backgroundColor: getScoreColor(student.overallAvg) + '20',
                                    color: getScoreColor(student.overallAvg)
                                  }}
                                >
                                  {student.overallLetter}
                                </span>
                                {renderTrendIndicator(student.overallAvg)}
                              </div>
                            </td>
                            {reportType === 'class' && classSubjects.map(subject => {
                              const subjectPerf = student.performance?.find(p => 
                                p.subjectId === subject.subject_id
                              );
                              return (
                                <td key={subject.subject_id} className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="text-sm" 
                                      style={{ color: getScoreColor(subjectPerf?.average ?? null) }}
                                    >
                                      {subjectPerf?.average ? subjectPerf.average.toFixed(1) : 'N/A'}%
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {subjectPerf?.letterGrade || 'N/A'}
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Performance Distribution Chart */}
                  <div className="mt-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      Grade Distribution
                    </h3>
                    <div className="flex items-end h-40 gap-1 mt-6">
                      {['A', 'B', 'C', 'D', 'F'].map((grade, i) => {
                        const count = rankedStudents.filter(s => 
                          s.overallLetter === grade
                        ).length;
                        const maxCount = Math.max(1, ...['A', 'B', 'C', 'D', 'F'].map(g => 
                          rankedStudents.filter(s => s.overallLetter === g).length
                        ));
                        const height = (count / maxCount) * 100;

                        return (
                          <div key={grade} className="flex-1 flex flex-col items-center">
                            <div 
                              className={`w-full rounded-t-sm ${i === 0 ? 'bg-green-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-yellow-500' : i === 3 ? 'bg-orange-500' : 'bg-red-500'}`}
                              style={{ height: `${height}%` }}
                            ></div>
                            <div className="text-xs mt-2 font-medium text-gray-700">{grade}</div>
                            <div className="text-xs text-gray-500">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
                  <button
                    onClick={generatePDFReport}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg flex items-center gap-2 hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70"
                    disabled={loadingStates.grades || reportLoading}
                  >
                    {reportLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Student Report Modal */}
          {showStudentReportModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-3">
                        <UserCheck className="w-8 h-8" />
                        Student Performance Report
                      </h2>
                      <div className="mt-2 text-sm">
                        <p>{selectedStudentForReport?.first_name} {selectedStudentForReport?.last_name}</p>
                        <p>Roll No: {selectedStudentForReport?.roll_no} | Class: {currentClass?.name}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedStudentForReport(null);
                        setShowStudentReportModal(false);
                      }}
                      className="p-2 rounded-full hover:bg-blue-400 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Overall Performance */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 mb-6">
                    <h3 className="text-lg font-medium text-blue-800 mb-3">Overall Performance</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-500">Average</p>
                        <p className="text-2xl font-bold" style={{ color: getScoreColor(selectedStudentForReport?.overallAvg ?? null) }}>
                          {selectedStudentForReport?.overallAvg?.toFixed(1) || 'N/A'}%
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-500">Grade</p>
                        <p 
                          className="text-2xl font-bold px-3 py-1 rounded-full inline-block"
                          style={{ 
                            backgroundColor: getScoreColor(selectedStudentForReport?.overallAvg ?? null) + '20',
                            color: getScoreColor(selectedStudentForReport?.overallAvg ?? null)
                          }}
                        >
                          {selectedStudentForReport?.overallLetter || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-500">Rank</p>
                        <p className="text-2xl font-bold">
                          {rankedStudents.findIndex(s => s.id === selectedStudentForReport?.id) + 1}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-500">Subjects</p>
                        <p className="text-2xl font-bold">
                          {classSubjects.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Subject Performance */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      Subject Performance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {classSubjects.map(subject => {
                        const perf = selectedStudentForReport?.performance?.find(p => p.subjectId === subject.subject_id);
                        return (
                          <div key={subject.subject_id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{subject.subject_name}</h4>
                                <p className="text-sm text-gray-500">{subject.subject_code}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span 
                                  className="font-bold" 
                                  style={{ color: perf?.color || '#8c8c8c' }}
                                >
                                  {perf?.average?.toFixed(1) || 'N/A'}%
                                </span>
                                <span 
                                  className="px-2 py-1 text-xs rounded-full"
                                  style={{ 
                                    backgroundColor: (perf?.color || '#8c8c8c') + '20',
                                    color: perf?.color || '#8c8c8c'
                                  }}
                                >
                                  {perf?.letterGrade || 'N/A'}
                                </span>
                              </div>
                            </div>
                            <div className="mt-3">
                              {renderPerformanceBar(perf?.average || 0)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detailed Grades */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-blue-500" />
                      Detailed Grades
                    </h3>
                    <div className="space-y-6">
                      {classSubjects.map(subject => {
                        const categories = gradeCategories.filter(cat => cat.subject_id === subject.subject_id);
                        return (
                          <div key={subject.subject_id} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 p-3 border-b">
                              <h4 className="font-medium">{subject.subject_name} ({subject.subject_code})</h4>
                            </div>
                            <div className="divide-y divide-gray-200">
                              {categories.map(category => {
                                const grades = getCategoryGrades(selectedStudentForReport?.user_id || '', category.id);
                                if (grades.length === 0) return null;
                                
                                const avg = calculateCategoryAverage(selectedStudentForReport?.user_id || '', category.id);
                                return (
                                  <div key={category.id} className="p-3">
                                    <div className="flex justify-between items-center mb-2">
                                      <div className="font-medium">{category.name}</div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">
                                          Avg: {avg ? `${avg.toFixed(1)}%` : 'N/A'}
                                        </span>
                                        <span 
                                          className="text-xs px-2 py-1 rounded-full"
                                          style={{ 
                                            backgroundColor: getScoreColor(avg) + '20',
                                            color: getScoreColor(avg)
                                          }}
                                        >
                                          Weight: {category.weight}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      {grades.map(grade => (
                                        <div key={grade.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                          <div>
                                            <span className="font-medium">{grade.score}/{grade.max_score}</span>
                                            <span className="text-gray-500 ml-2">
                                              ({new Date(grade.date_given).toLocaleDateString()})
                                            </span>
                                          </div>
                                          <div className="text-right">
                                            <span className="font-medium">
                                              {(grade.score / grade.max_score * 100).toFixed(1)}%
                                            </span>
                                            {grade.comments && (
                                              <button 
                                                onClick={() => setViewingComments(grade)}
                                                className="ml-2 text-blue-500 hover:text-blue-700"
                                              >
                                                <MessageSquare className="w-4 h-4" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setSelectedStudentForReport(null);
                      setShowStudentReportModal(false);
                    }}
                    className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => selectedStudentForReport && generateStudentPDFReport(selectedStudentForReport)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 flex items-center gap-2"
                    disabled={reportLoading || !selectedStudentForReport}
                  >
                    {reportLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download Full Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Comments Viewer Modal */}
          {viewingComments && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Grade Comments</h3>
                  <button 
                    onClick={() => setViewingComments(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">
                      {viewingComments.score}/{viewingComments.max_score}
                    </span>
                    <span className="text-gray-500">
                      {new Date(viewingComments.date_given).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap">
                      {viewingComments.comments || "No comments provided"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setViewingComments(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Toast Notifications */}
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
    </div>
  );
};

export default TeacherGradesReports;