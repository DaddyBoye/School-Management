import React, { useState, useEffect } from 'react';
import { supabase } from "../../supabase";
import { AnimatePresence } from 'framer-motion';
import { ToastNotification } from '@/Components/ToastNotification';
import { 
  Book, 
  Users, 
  Loader2, 
  ChevronDown,
  ChevronRight,
  BarChart2,
  BookOpen,
  User,
  Award,
  Edit,
  Plus,
  Save,
  X,
  MessageSquare
} from 'lucide-react';
import dayjs from 'dayjs';

interface Grade {
  id?: string;
  student_id: string;
  subject_id: string;
  score: number;
  max_score: number;
  category_id: number;
  teacher_id: string;
  term_id: number;
  comments?: string;
  date_given: string;
  is_final?: boolean;
}

interface GradeCategory {
  id: number;
  name: string;
  weight: number;
  class_id: string;
  parent_category_id: number | null;
  is_main_category: boolean;
  subcategories?: GradeCategory[];
}

interface TeacherSubject {
  subject_id: string;
  class_id: string;
  subject_name: string;
  subject_code: string;
  class_name: string;
}

interface Student {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  roll_no: string;
  class_id: string;
}

interface Class {
  id: string;
  name: string;
}

interface TeacherGradesManagementProps {
  teacherId: string;
  schoolId: string;
  currentTerm: { id: number; name: string } | null;
}

const TeacherGradesManagement: React.FC<TeacherGradesManagementProps> = ({ 
  teacherId, 
  schoolId,
  currentTerm
}) => {
  // View state
  const [viewMode, setViewMode] = useState<'myClass' | 'subjectsTaught'>('myClass');
  
  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeCategories, setGradeCategories] = useState<GradeCategory[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [allClassSubjects, setAllClassSubjects] = useState<TeacherSubject[]>([]);
  const [assignedClass, setAssignedClass] = useState<Class | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  
  // Selection state
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>('');
  const [selectedTerm, setSelectedTerm] = useState(currentTerm?.id || null);
  const [availableTerms, setAvailableTerms] = useState<Array<{ id: number; name: string; is_current: boolean; start_date: string; end_date: string; }>>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [viewingComments, setViewingComments] = useState<Grade | Grade[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [dataInitialized, setDataInitialized] = useState(false);
  
  // Grade editing state
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [newGrade, setNewGrade] = useState<Partial<Grade> | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Notification state
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error';
  }>>([]);

  // Search and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  };

  // Fetch teacher data
  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch teacher's assigned class
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('class_id, classes!teachers_class_id_fkey(id, name)')
          .eq('user_id', teacherId)
          .single();
  
        if (teacherError) throw teacherError;
  
        if (teacherData?.classes) {
          const assignedClassData = Array.isArray(teacherData.classes) ? teacherData.classes[0] : teacherData.classes;
          setAssignedClass(assignedClassData);
          if (viewMode === 'myClass') {
            setSelectedClass(assignedClassData.id);
            fetchAllClassSubjects(assignedClassData.id);
          }
        }

        // Fetch teacher's assigned subjects
        const { data: teacherSubjectsData, error: subjectsError } = await supabase
          .from('teacher_subjects')
          .select('subject_id, class_id, subjects(name, code), classes(name)')
          .eq('teacher_id', teacherId)
          .eq('school_id', schoolId);

        if (subjectsError) throw subjectsError;
        
        const formattedSubjects = (teacherSubjectsData || []).map(item => ({
          subject_id: item.subject_id,
          class_id: item.class_id,
          subject_name: Array.isArray(item.subjects) 
            ? ((item.subjects[0] as { name?: string })?.name ?? '') 
            : ((item.subjects as { name?: string })?.name ?? ''),
          subject_code: Array.isArray(item.subjects) 
            ? ((item.subjects[0] as { code?: string })?.code ?? '') 
            : ((item.subjects as { code?: string })?.code ?? ''),
          class_name: Array.isArray(item.classes) 
            ? ((item.classes[0] as { name?: string })?.name ?? '') 
            : ((item.classes as { name?: string })?.name ?? '')
        }));

        setTeacherSubjects(formattedSubjects);

        // Get unique classes from subjects taught
        const uniqueClasses = Array.from(new Set(formattedSubjects.map(s => s.class_id)))
          .map(classId => ({
            id: classId,
            name: formattedSubjects.find(s => s.class_id === classId)?.class_name || 'Unknown'
          }));

        setClasses(uniqueClasses);
        setDataInitialized(true);
      } catch (error) {
        console.error('Error fetching teacher data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (teacherId && schoolId) {
      fetchTeacherData();
    }
  }, [teacherId, schoolId, viewMode]);

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
        
        const terms = (data || []).map(term => ({
          id: term.id,
          name: term.name,
          start_date: term.start_date,
          end_date: term.end_date,
          is_current: term.is_current
        }));
        
        setAvailableTerms(terms);

        // Set current term if available
        const currentTerm = terms.find(t => t.is_current);
        if (currentTerm) {
          setSelectedTerm(currentTerm.id);
        }

      } catch (error) {
        console.error('Error fetching available terms:', error);
        showNotification('Failed to fetch available terms', 'error');
      }
    };

    if (schoolId) {
      fetchAvailableTerms();
    }
  }, [schoolId]);

  const fetchAllClassSubjects = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          subject_id,
          subjects:subject_id (name, code),
          classes:class_id (name)
        `)
        .eq('class_id', classId);
  
      if (error) throw error;
  
      const formattedSubjects = (data || []).map(item => ({
        subject_id: item.subject_id,
        class_id: classId,
        subject_name: Array.isArray(item.subjects) 
          ? ((item.subjects[0] as { name?: string })?.name ?? '') 
          : ((item.subjects as { name?: string })?.name ?? ''),
        subject_code: Array.isArray(item.subjects) 
          ? ((item.subjects[0] as { code?: string })?.code ?? '') 
          : ((item.subjects as { code?: string })?.code ?? ''),
        class_name: Array.isArray(item.classes) 
          ? ((item.classes[0] as { name?: string })?.name ?? '') 
          : ((item.classes as { name?: string })?.name ?? '')
      }));
  
      setAllClassSubjects(formattedSubjects);
    } catch (error) {
      console.error('Error fetching all class subjects:', error);
    }
  };

  // Fetch grade categories with hierarchical structure
  const fetchGradeCategories = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('grade_categories')
        .select('*')
        .eq('class_id', classId)
        .order('is_main_category', { ascending: false })
        .order('parent_category_id', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Transform into hierarchical structure
      const mainCategories = (data || [])
        .filter(c => c.is_main_category)
        .map(mainCat => ({
          ...mainCat,
          subcategories: data.filter(sc => sc.parent_category_id === mainCat.id)
        }));

      setGradeCategories(mainCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setIsLoading(true);
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

        if (studentsError) throw studentsError;

        setStudents(studentsData || []);

        // Fetch categories for this class
        if (viewMode === 'subjectsTaught') {
          fetchGradeCategories(classId);
        }

      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [viewMode, assignedClass, selectedClass]);

  // Fetch grades
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setIsLoading(true);
        
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
          .eq('term_id', selectedTerm)
          .eq('teacher_id', teacherId);

        if (gradesError) throw gradesError;

        setGrades(gradesData || []);

      } catch (error) {
        console.error('Error fetching grades:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrades();
  }, [viewMode, assignedClass, selectedSubject, selectedTerm, teacherSubjects, teacherId]);

  // Helper functions
  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                         student.roll_no.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });
  
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!sortConfig) return 0;
    
    if (sortConfig.key === 'name') {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return sortConfig.direction === 'ascending' 
        ? nameA.localeCompare(nameB) 
        : nameB.localeCompare(nameA);
    }
    
    if (sortConfig.key === 'rollNo') {
      return sortConfig.direction === 'ascending' 
        ? a.roll_no.localeCompare(b.roll_no) 
        : b.roll_no.localeCompare(a.roll_no);
    }
    
    if (sortConfig.key === 'performance' && viewMode === 'myClass') {
      const perfA = studentsWithPerformance.find(s => s.id === a.id)?.overallAvg || 0;
      const perfB = studentsWithPerformance.find(s => s.id === b.id)?.overallAvg || 0;
      return sortConfig.direction === 'ascending' 
        ? (perfA || 0) - (perfB || 0)
        : (perfB || 0) - (perfA || 0);
    }
    
    if (sortConfig.key === 'subjectPerformance' && viewMode === 'subjectsTaught' && selectedSubject) {
      const perfA = calculateSubjectAverage(a.user_id, selectedSubject) || 0;
      const perfB = calculateSubjectAverage(b.user_id, selectedSubject) || 0;
      return sortConfig.direction === 'ascending' 
        ? perfA - perfB
        : perfB - perfA;
    }
    
    return 0;
  });
  
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };  

  const getClassSubjects = () => {
    if (!assignedClass) return [];
    
    const combinedSubjects = [...allClassSubjects];
    
    teacherSubjects.forEach(teacherSubject => {
      if (!combinedSubjects.some(s => s.subject_id === teacherSubject.subject_id)) {
        combinedSubjects.push(teacherSubject);
      }
    });
  
    return combinedSubjects
      .filter(subject => subject.class_id === assignedClass.id)
      .sort((a, b) => a.subject_name.localeCompare(b.subject_name));
  };

  const getSubjectsForSelectedClass = () => {
    if (!selectedClass) return [];
    return teacherSubjects
      .filter(subject => subject.class_id === selectedClass)
      .sort((a, b) => a.subject_name.localeCompare(b.subject_name));
  };

  const getCategoryGrades = (studentId: string, categoryId: number) => {
    return grades.filter(grade => 
      grade.student_id === studentId && 
      grade.category_id === categoryId
    );
  };

  const calculateCategoryAverage = (studentId: string, categoryId: number) => {
    const category = gradeCategories
      .flatMap(c => [c, ...(c.subcategories || [])])
      .find(c => c.id === categoryId);
    
    if (!category) return 0;

    // For main categories, include all subcategory grades
    const categoryGrades = category.is_main_category
      ? grades.filter(grade => 
          grade.student_id === studentId && 
          (grade.category_id === categoryId || 
           (category.subcategories || []).some(sc => sc.id === grade.category_id))
      ) : getCategoryGrades(studentId, categoryId);

    if (categoryGrades.length === 0) return 0;
    
    const total = categoryGrades.reduce((sum, grade) => {
      return sum + (grade.score / grade.max_score * 100);
    }, 0);
    
    return total / categoryGrades.length;
  };

  const calculateSubjectAverage = (studentId: string, subjectId?: string) => {
    const targetSubjectId = viewMode === 'subjectsTaught' ? selectedSubject : subjectId;
    if (!targetSubjectId) return null;

    // Only use main categories for the overall calculation
    const relevantMainCategories = gradeCategories.filter(cat => 
      cat.is_main_category
    );

    if (relevantMainCategories.length === 0) return null;

    let weightedSum = 0;
    let totalWeight = 0;

    relevantMainCategories.forEach(category => {
      const avg = calculateCategoryAverage(studentId, category.id);
      weightedSum += avg * category.weight;
      totalWeight += category.weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const calculateClassAverage = () => {
    if (students.length === 0) return null;
  
    let total = 0;
    let count = 0;
  
    if (viewMode === 'myClass' && assignedClass) {
      const classSubjects = getClassSubjects();
      
      classSubjects.forEach(subject => {
        const subjectAvg = students.reduce((sum, student) => {
          const avg = calculateSubjectAverage(student.user_id, subject.subject_id);
          return sum + (avg || 0);
        }, 0) / students.length;
        
        total += subjectAvg;
        count++;
      });
    } else if (viewMode === 'subjectsTaught' && selectedSubject) {
      const subjectAvg = students.reduce((sum, student) => {
        const avg = calculateSubjectAverage(student.user_id, selectedSubject);
        return sum + (avg || 0);
      }, 0) / students.length;
      
      total = subjectAvg;
      count = 1;
    }
  
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

  const getStudentsWithPerformance = () => {
    return students.map(student => {
      const performance = getClassSubjects().map(subject => {
        const subjectAvg = calculateSubjectAverage(student.user_id, subject.subject_id);
        
        return {
          subjectId: subject.subject_id,
          average: subjectAvg,
          letterGrade: getLetterGrade(subjectAvg),
          color: getScoreColor(subjectAvg)
        };
      });
      
      const validAverages = performance.map(p => p.average || 0);
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

  // Grade editing functions
  const startNewGrade = (studentId: string, categoryId: number) => {
    if (!selectedSubject) return;
    
    const category = gradeCategories
      .flatMap(c => [c, ...(c.subcategories || [])])
      .find(c => c.id === categoryId);
    
    if (!category) return;

    setNewGrade({
      student_id: studentId,
      subject_id: selectedSubject,
      category_id: categoryId,
      teacher_id: teacherId,
      term_id: selectedTerm ?? undefined,
      score: 0,
      max_score: 100,
      date_given: new Date().toISOString(),
      is_final: false
    });
  };

  const startEditGrade = (grade: Grade) => {
    setEditingGrade(grade);
  };

  const cancelEdit = () => {
    setEditingGrade(null);
    setNewGrade(null);
  };

  const handleSaveGrade = async () => {
    if (!editingGrade && !newGrade) return;
  
    try {
      setIsSaving(true);
      const gradeToSave = editingGrade || newGrade;
  
      if (!gradeToSave || 
          !gradeToSave.student_id || 
          !gradeToSave.subject_id || 
          !gradeToSave.category_id || 
          gradeToSave.score === undefined || 
          gradeToSave.score === null) {
        throw new Error('Missing required grade information');
      }

      const score = Number(gradeToSave.score);
      if (isNaN(score)) {
        throw new Error('Score must be a valid number');
      }

      if (editingGrade) {
        const { data, error } = await supabase
          .from('grades')
          .update(gradeToSave)
          .eq('id', editingGrade.id)
          .select();

        if (error) throw error;
        if (data) {
          setGrades(grades.map(g => g.id === data[0].id ? data[0] : g));
        }
        showNotification('Grade updated successfully!', 'success');
      } else if (newGrade) {
        const { data, error } = await supabase
          .from('grades')
          .insert({
            ...newGrade,
            score: newGrade.score || 0,
            max_score: newGrade.max_score || 100,
            date_given: newGrade.date_given || new Date().toISOString(),
            term_id: selectedTerm,
            is_final: newGrade.is_final || false
          })
          .select();

        if (error) throw error;
        if (data) {
          setGrades([...grades, data[0]]);
        }
        showNotification('Grade added successfully!', 'success');
      }

      setEditingGrade(null);
      setNewGrade(null);

    } catch (error) {
      console.error('Error saving grade:', error);
      showNotification('Failed to save grade', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGrade = async (gradeId: string) => {
    try {
      setDeleteError(null);
      setIsSaving(true);
      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('id', gradeId);

      if (error) throw error;

      setGrades(grades.filter(grade => grade.id !== gradeId));
      showNotification('Grade deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting grade:', error);
      setDeleteError('Failed to delete grade. Please try again.');
      showNotification('Failed to delete grade', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !dataInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading grade data...</span>
        </div>
      </div>
    );
  }

  const hasAssignedClass = !!assignedClass;
  const hasSubjectsTaught = teacherSubjects.length > 0;
  
  if (!hasAssignedClass && !hasSubjectsTaught) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-2">No Assignments Found</h2>
        <p className="text-gray-600">
          You haven't been assigned to any classes or subjects yet.
          <br />
          Please contact your school administrator.
        </p>
      </div>
    );
  }

  const currentSubject = teacherSubjects.find(s => s.subject_id === selectedSubject);
  const currentClass = viewMode === 'myClass' 
    ? assignedClass 
    : classes.find(c => c.id === selectedClass);

  const classSubjects = getClassSubjects();
  const studentsWithPerformance = getStudentsWithPerformance();

  return (
    <div className="min-h-screen text-black">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header with toggles */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Grade Management</h1>
          
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

        {/* Control panel */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-grow sm:flex-grow-0 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-600 mb-1">Term</label>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-white rounded-lg px-3 py-2.5 pr-8 
                            border border-gray-300 hover:border-gray-400 
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                            transition-colors duration-200
                            disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60
                            [&>option[data-current='true']]:text-green-600 [&>option[data-current='true']]:font-medium"
                  value={selectedTerm || ''}
                  onChange={(e) => setSelectedTerm(e.target.value ? Number(e.target.value) : null)}
                  disabled={availableTerms.length === 0}
                >
                  <option value="">Select Term</option>
                  {availableTerms.map(term => (
                    <option key={term.id} value={term.id} data-current={term.is_current}>
                      {term.name} • {dayjs(term.start_date).format('MMM D')}-{dayjs(term.end_date).format('MMM D')}
                      {term.is_current && ' • Current'}
                    </option>
                  ))}
                </select>
                
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Class Selector (only for Subjects Taught view) */}
            {viewMode === 'subjectsTaught' && (
              <div className="flex-grow sm:flex-grow-0 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-500 mb-1">Class</label>
                <select
                  className="w-full bg-white rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedClass || ''}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  disabled={classes.length === 0}
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subject Selector (only for Subjects Taught view) */}
            {viewMode === 'subjectsTaught' && selectedClass && (
              <div className="flex-grow sm:flex-grow-0 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-500 mb-1">Subject</label>
                <select
                  className="w-full bg-white rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedSubject || ''}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={getSubjectsForSelectedClass().length === 0}
                >
                  <option value="">Select Subject</option>
                  {getSubjectsForSelectedClass().map(subject => (
                    <option key={subject.subject_id} value={subject.subject_id}>
                      {subject.subject_name} ({subject.subject_code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-grow min-w-[250px]">
              <label className="block text-sm font-medium text-gray-500 mb-1">Search Students</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or roll number..."
                  className="w-full bg-white rounded-lg pl-10 pr-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

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

        {viewMode === 'myClass' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Students</h3>
                    <p className="text-2xl font-bold">{students.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <BookOpen className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Subjects</h3>
                    <p className="text-2xl font-bold">{classSubjects.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <BarChart2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Performance</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold" style={{ color: getScoreColor(calculateClassAverage()) }}>
                        {calculateClassAverage()?.toFixed(1) || 'N/A'}%
                      </p>
                      <span 
                        className="px-2 py-1 text-xs rounded-full font-medium"
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
              </div>
            </div>

            <div className="space-y-4">
              {classSubjects.map(subject => {
                const isExpanded = expandedSubjects[subject.subject_id] || false;
                const subjectClassAvg = students.length > 0 
                  ? students.reduce((sum, student) => {
                      const avg = calculateSubjectAverage(student.user_id, subject.subject_id) || 0;
                      return sum + avg;
                    }, 0) / students.length
                  : null;
                
                return (
                  <div key={subject.subject_id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <button
                      onClick={() => toggleSubject(subject.subject_id)}
                      className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                        !teacherSubjects.some(s => s.subject_id === subject.subject_id) ? 'bg-gray-100' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                        <h2 className="text-lg font-medium">
                          {subject.subject_name} <span className="text-gray-500 text-sm">({subject.subject_code})</span>
                          {!teacherSubjects.some(s => s.subject_id === subject.subject_id) && (
                            <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                              Not Teaching
                            </span>
                          )}
                        </h2>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-medium" 
                            style={{ color: getScoreColor(subjectClassAvg) }}
                          >
                            {subjectClassAvg?.toFixed(1) || 'N/A'}%
                          </span>
                          <span 
                            className="px-2 py-1 text-xs rounded-full font-medium"
                            style={{ 
                              backgroundColor: getScoreColor(subjectClassAvg) + '20',
                              color: getScoreColor(subjectClassAvg)
                            }}
                          >
                            {getLetterGrade(subjectClassAvg)}
                          </span>
                        </div>
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200">
                        <div className="overflow-x-auto mt-4">
                          <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Student
                                </th>
                                {gradeCategories.map(mainCategory => (
                                  <th key={mainCategory.id} colSpan={mainCategory.subcategories?.length ? mainCategory.subcategories.length + 1 : 1} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {mainCategory.name} <span className="font-normal lowercase">({mainCategory.weight}%)</span>
                                  </th>
                                ))}
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Overall
                                </th>
                              </tr>
                              <tr>
                                <th></th>
                                {gradeCategories.map(mainCategory => (
                                  <>
                                    {mainCategory.subcategories?.map(subcategory => (
                                      <th key={subcategory.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {subcategory.name}
                                      </th>
                                    ))}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Avg
                                    </th>
                                  </>
                                ))}
                                <th></th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {sortedStudents.map(student => {
                                const subjectAvg = calculateSubjectAverage(student.user_id, subject.subject_id);
                                
                                return (
                                  <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">
                                            {student.first_name} {student.last_name}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Roll No: {student.roll_no}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    
                                    {gradeCategories.map(mainCategory => {
                                      const mainCategoryAvg = calculateCategoryAverage(student.user_id, mainCategory.id);
                                      const canEdit = teacherSubjects.some(s => s.subject_id === subject.subject_id);
                                      
                                      return (
                                        <>
                                          {mainCategory.subcategories?.map(subcategory => {
                                            const subcategoryAvg = calculateCategoryAverage(student.user_id, subcategory.id);
                                            const subcategoryGrades = getCategoryGrades(student.user_id, subcategory.id);
                                            
                                            return (
                                              <td key={subcategory.id} className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                  <span 
                                                    className="font-medium" 
                                                    style={{ color: getScoreColor(subcategoryAvg) }}
                                                  >
                                                    {subcategoryAvg?.toFixed(1) || 'N/A'}%
                                                  </span>
                                                  
                                                  {canEdit && subcategoryGrades.some(grade => grade.comments?.trim()) && (
                                                    <button 
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewingComments(
                                                          subcategoryGrades.filter(grade => grade.comments?.trim())
                                                        );
                                                      }}
                                                      className="relative group text-white bg-blue-600 hover:bg-blue-500 p-1 rounded"
                                                    >
                                                      <MessageSquare className="w-4 h-4" />
                                                      <div className="absolute z-10 w-64 hidden group-hover:block bg-white border rounded-md shadow-lg p-2 left-0 mt-1">
                                                        <p className="text-xs text-gray-700 line-clamp-3">
                                                          {subcategoryGrades.find(grade => grade.comments?.trim())?.comments}
                                                        </p>
                                                      </div>
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                            );
                                          })}
                                          <td className="px-4 py-4 whitespace-nowrap">
                                            <span 
                                              className="font-medium" 
                                              style={{ color: getScoreColor(mainCategoryAvg) }}
                                            >
                                              {mainCategoryAvg?.toFixed(1) || 'N/A'}%
                                            </span>
                                          </td>
                                        </>
                                      );
                                    })}
                                    
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <span 
                                          className="font-medium" 
                                          style={{ color: getScoreColor(subjectAvg) }}
                                        >
                                          {subjectAvg?.toFixed(1) || 'N/A'}%
                                        </span>
                                        <span 
                                          className="px-2 py-1 text-xs rounded-full"
                                          style={{ 
                                            backgroundColor: getScoreColor(subjectAvg) + '20',
                                            color: getScoreColor(subjectAvg)
                                          }}
                                        >
                                          {getLetterGrade(subjectAvg)}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  Overall Student Performance
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('name')}
                      >
                        Student
                        {sortConfig?.key === 'name' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      {getClassSubjects().map(subject => (
                        <th key={subject.subject_id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex flex-col">
                            <span>{subject.subject_code}</span>
                            <span className="text-xs font-normal normal-case text-gray-400">{subject.subject_name}</span>
                            {!teacherSubjects.some(s => s.subject_id === subject.subject_id) && (
                              <span className="text-xs text-gray-500">(Not Teaching)</span>
                            )}
                          </div>
                        </th>
                      ))}
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('performance')}
                      >
                        Overall
                        {sortConfig?.key === 'performance' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentsWithPerformance.map(student => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {student.first_name} {student.last_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                Roll No: {student.roll_no}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {student.performance.map((perf, idx) => (
                          <td key={idx} className="px-4 py-4">
                            <div className="flex flex-col">
                              <div 
                                className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-1"
                                title={`${perf.average?.toFixed(1) || 'N/A'}%`}
                              >
                                <div 
                                  className="h-full rounded-full"
                                  style={{ 
                                    width: perf.average ? `${Math.min(100, Math.max(0, perf.average))}%` : '0%',
                                    backgroundColor: perf.color || '#8c8c8c'
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium" style={{ color: perf.color }}>
                                  {perf.average?.toFixed(1) || 'N/A'}%
                                </span>
                                <span className="text-xs">{perf.letterGrade}</span>
                              </div>
                            </div>
                          </td>
                        ))}
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span 
                              className="font-medium" 
                              style={{ color: student.overallColor || '#8c8c8c' }}
                            >
                              {student.overallAvg?.toFixed(1) || 'N/A'}%
                            </span>
                            <span 
                              className="px-2 py-1 text-xs rounded-full font-medium"
                              style={{ 
                                backgroundColor: (student.overallColor || '#8c8c8c') + '20',
                                color: student.overallColor || '#8c8c8c'
                              }}
                            >
                              {student.overallLetter || 'N/A'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {students.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-lg">
                  {!selectedClass 
                    ? 'Please select a class to view students' 
                    : 'No students found in this class'}
                </p>
              </div>
            ) : !selectedSubject ? (
              <div className="p-8 text-center">
                <Book className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">Select a subject</h3>
                <p className="mt-1 text-gray-500">
                  Please select a subject from the dropdown above to view grades.
                </p>
              </div>
            ) : gradeCategories.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto max-w-md">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No grade categories set up</h3>
                  <p className="mt-1 text-gray-500">
                    Contact your administrator to create grade categories for this subject before entering grades.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 cursor-pointer"
                        onClick={() => requestSort('name')}
                      >
                        Student
                        {sortConfig?.key === 'name' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      {gradeCategories.map(mainCategory => (
                        <React.Fragment key={mainCategory.id}>
                          {mainCategory.subcategories?.map(subcategory => (
                            <th key={subcategory.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {subcategory.name}
                            </th>
                          ))}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {mainCategory.name} <span className="font-normal lowercase">({mainCategory.weight}%)</span>
                          </th>
                        </React.Fragment>
                      ))}
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('subjectPerformance')}
                      >
                        Overall
                        {sortConfig?.key === 'subjectPerformance' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedStudents.map(student => {
                      const subjectAvg = calculateSubjectAverage(student.user_id);

                      return (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {student.first_name} {student.last_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {student.roll_no}
                                </div>
                              </div>
                            </div>
                          </td>

                          {gradeCategories.map(mainCategory => {
                            const mainCategoryAvg = calculateCategoryAverage(student.user_id, mainCategory.id);
                            
                            return (
                              <React.Fragment key={mainCategory.id}>
                                {mainCategory.subcategories?.map(subcategory => {
                                  const subcategoryAvg = calculateCategoryAverage(student.user_id, subcategory.id);
                                  const subcategoryGrades = getCategoryGrades(student.user_id, subcategory.id);

                                  return (
                                    <td key={subcategory.id} className="px-6 py-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          {subcategoryGrades.length > 0 ? (
                                            <div className="flex items-center gap-2">
                                              <span 
                                                className="text-sm font-medium"
                                                style={{ color: getScoreColor(subcategoryAvg) }}
                                              >
                                                {subcategoryAvg?.toFixed(1) || 'N/A'}%
                                              </span>
                                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                {subcategoryGrades.length} {subcategoryGrades.length === 1 ? 'grade' : 'grades'}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-sm text-gray-400">No grades</span>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => startNewGrade(student.user_id, subcategory.id)}
                                          className="text-blue-500 hover:text-blue-700 p-1 bg-slate-300 rounded-full hover:bg-blue-50 transition-colors"
                                          title="Add grade"
                                        >
                                          <Plus className="w-4 h-4" />
                                        </button>
                                      </div>

                                      {subcategoryGrades.length > 0 && (
                                        <div className="space-y-1 bg-gray-50 p-2 rounded-lg">
                                          {subcategoryGrades.map(grade => (
                                            <div 
                                              key={grade.id} 
                                              className="flex items-center justify-between p-1 hover:bg-gray-100 rounded transition-colors"
                                            >
                                              <div className="flex items-center gap-2">
                                                <span 
                                                  className="text-xs font-medium px-2 py-1 rounded"
                                                  style={{ 
                                                    backgroundColor: getScoreColor((grade.score / grade.max_score) * 100) + '20',
                                                    color: getScoreColor((grade.score / grade.max_score) * 100)
                                                  }}
                                                >
                                                  {grade.score}/{grade.max_score}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                  {new Date(grade.date_given).toLocaleDateString()}
                                                </span>
                                                
                                                {grade.comments?.trim() && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setViewingComments(grade);
                                                    }}
                                                    className="relative group text-white bg-blue-600 hover:bg-blue-500"
                                                  >
                                                    <MessageSquare className="w-3 h-3" />
                                                    <div className="absolute z-10 w-48 hidden group-hover:block bg-white border rounded-md shadow-lg p-2 left-0 mt-1">
                                                      <p className="text-xs text-gray-700 line-clamp-3">{grade.comments}</p>
                                                    </div>
                                                  </button>
                                                )}
                                              </div>
                                              <div className="flex gap-1">
                                                <button
                                                  onClick={() => startEditGrade(grade)}
                                                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full bg-slate-300 hover:bg-gray-200 transition-colors"
                                                  title="Edit grade"
                                                >
                                                  <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    if (grade.id === undefined) return;
                                                    setGradeToDelete(grade.id);
                                                  }}
                                                  className="text-red-500 hover:text-red-700 p-1 bg-stone-300 rounded-full hover:bg-red-100 transition-colors"
                                                  title="Delete grade"
                                                >
                                                  <X className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <span 
                                      className="text-sm font-bold mr-2"
                                      style={{ color: getScoreColor(mainCategoryAvg) }}
                                    >
                                      {mainCategoryAvg?.toFixed(1) || 'N/A'}%
                                    </span>
                                  </div>
                                </td>
                              </React.Fragment>
                            );
                          })}

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span 
                                className="text-sm font-bold mr-2"
                                style={{ color: getScoreColor(subjectAvg) }}
                              >
                                {subjectAvg?.toFixed(1) || 'N/A'}%
                              </span>
                              <span 
                                className="px-2 py-1 text-xs rounded-full font-medium"
                                style={{ 
                                  backgroundColor: getScoreColor(subjectAvg) + '20',
                                  color: getScoreColor(subjectAvg)
                                }}
                              >
                                {getLetterGrade(subjectAvg)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {gradeToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Confirm Deletion</h2>
                <button 
                  onClick={() => setGradeToDelete(null)} 
                  className="text-gray-500 bg-white hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mb-6">Are you sure you want to delete this grade? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setGradeToDelete(null)}
                  className="px-4 py-2 border bg-blue-400 border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleDeleteGrade(gradeToDelete);
                    setGradeToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Grade'
                  )}
                </button>
              </div>
              {deleteError && (
                <div className="mt-4 p-2 bg-red-100 text-red-700 rounded text-sm">
                  {deleteError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grade Edit Modal */}
        {(editingGrade || newGrade) && viewMode === 'subjectsTaught' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingGrade ? 'Edit Grade' : 'Add New Grade'}
                </h2>
                <button onClick={cancelEdit} className="text-gray-500 bg-white hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Score
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingGrade?.score ?? newGrade?.score ?? 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        const max = editingGrade?.max_score ?? newGrade?.max_score ?? 100;
                        const validatedValue = Math.min(value, max);
                        
                        if (editingGrade) {
                          setEditingGrade({ ...editingGrade, score: validatedValue });
                        } else if (newGrade) {
                          setNewGrade({ ...newGrade, score: validatedValue });
                        }
                      }}
                      min="0"
                      max={editingGrade?.max_score ?? newGrade?.max_score ?? 100}
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Score
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingGrade?.max_score ?? newGrade?.max_score ?? 100}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 100;
                        if (editingGrade) {
                          setEditingGrade({ ...editingGrade, max_score: value });
                        } else if (newGrade) {
                          setNewGrade({ ...newGrade, max_score: value });
                        }
                      }}
                      min="1"
                      step="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingGrade?.category_id ?? newGrade?.category_id ?? ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (editingGrade) {
                        setEditingGrade({ ...editingGrade, category_id: value });
                      } else if (newGrade) {
                        setNewGrade({ ...newGrade, category_id: value });
                      }
                    }}
                  >
                    <option value="">Select Category</option>
                    {gradeCategories.flatMap(category => [
                      <option key={category.id} value={category.id}>
                        {category.name} (Main)
                      </option>,
                      ...(category.subcategories?.map(subcategory => (
                        <option key={subcategory.id} value={subcategory.id}>
                          &nbsp;&nbsp;↳ {subcategory.name}
                        </option>
                      )) || [])
                    ])}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={
                      (editingGrade?.date_given || newGrade?.date_given || new Date().toISOString())
                      .split('T')[0]
                    }
                    onChange={(e) => {
                      const date = new Date(e.target.value).toISOString();
                      if (editingGrade) {
                        setEditingGrade({ ...editingGrade, date_given: date });
                      } else if (newGrade) {
                        setNewGrade({ ...newGrade, date_given: date });
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Final Grade
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={editingGrade?.is_final ?? newGrade?.is_final ?? false}
                      onChange={(e) => {
                        if (editingGrade) {
                          setEditingGrade({ ...editingGrade, is_final: e.target.checked });
                        } else if (newGrade) {
                          setNewGrade({ ...newGrade, is_final: e.target.checked });
                        }
                      }}
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Mark as final (cannot be edited later)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comments <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={editingGrade?.comments || newGrade?.comments || ''}
                    onChange={(e) => {
                      if (editingGrade) {
                        setEditingGrade({ ...editingGrade, comments: e.target.value });
                      } else if (newGrade) {
                        setNewGrade({ ...newGrade, comments: e.target.value });
                      }
                    }}
                    placeholder="Add any comments about this grade"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 border bg-red-600 border-gray-300 rounded-md text-white hover:bg-red-700 transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGrade}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
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

      {viewingComments && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {Array.isArray(viewingComments) ? 'All Comments' : 'Comment'}
              </h3>
              <button onClick={() => setViewingComments(null)} className="text-gray-500 bg-white hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {Array.isArray(viewingComments) ? (
                <div className="space-y-4">
                  {viewingComments.map((grade) => (
                    <div key={grade.id} className="border-b pb-4 last:border-0">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">{grade.score}/{grade.max_score}</span>
                        <span className="text-gray-500">
                          {new Date(grade.date_given).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{grade.comments}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">{viewingComments.score}/{viewingComments.max_score}</span>
                    <span className="text-gray-500">
                      {new Date(viewingComments.date_given).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{viewingComments.comments}</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t flex justify-end">
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
    </div>
  );
};

export default TeacherGradesManagement;