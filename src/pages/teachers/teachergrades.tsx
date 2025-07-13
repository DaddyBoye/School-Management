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
  category_id: string;
  teacher_id: string;
  term_id: number;
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
  
    // Grade editing state (only for Subjects Taught view)
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [newGrade, setNewGrade] = useState<Partial<Grade> | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

    // Notification state to handle multiple notifications
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error';
  }>>([]);

  // Search and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

  // Update your operation handlers to add notifications
  const showNotification = (message: string, type: 'success' | 'error') => {
      const id = Math.random().toString(36).substring(2, 9);
      setNotifications((prev) => [...prev, { id, message, type }]);
      
      // Auto-remove after 3 seconds
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
            fetchAllClassSubjects(assignedClassData.id); // Fetch all subjects for the class
          }
        }

        // Fetch teacher's assigned subjects
        const { data: teacherSubjectsData, error: subjectsError } = await supabase
          .from('teacher_subjects')
          .select('subject_id, class_id, subjects(name, code), classes(name)')
          .eq('teacher_id', teacherId)
          .eq('school_id', schoolId);

        if (subjectsError) throw subjectsError;
        
        const formattedSubjects = (teacherSubjectsData || []).map(item => {
            // Handle subjects (array or single object)
            const subjectObj = Array.isArray(item.subjects) 
              ? item.subjects[0]  // Take first if array
              : item.subjects;    // Use directly if single object
          
            // Handle classes (array or single object)
            const classObj = Array.isArray(item.classes)
              ? item.classes[0]   // Take first if array
              : item.classes;     // Use directly if single object
          
            return {
              subject_id: item.subject_id,
              class_id: item.class_id,
              subject_name: subjectObj?.name || 'Unknown',  // Fallback if undefined
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
        subject_name: Array.isArray(item.subjects) ? (item.subjects[0] as { name: string })?.name : (item.subjects as { name: string })?.name,
        subject_code: Array.isArray(item.subjects) ? (item.subjects[0] as { code: string })?.code : (item.subjects as { code: string })?.code,
        class_name: Array.isArray(item.classes) ? (item.classes[0] as { name: string })?.name : (item.classes as { name: string })?.name
      }));
  
      setAllClassSubjects(formattedSubjects);
    } catch (error) {
      console.error('Error fetching all class subjects:', error);
    }
  };

  // Fetch grade categories
  useEffect(() => {
      const fetchGradeCategories = async () => {
        try {
          setIsLoading(true);
          let subjectIds: string[] = [];
    
          if (viewMode === 'myClass' && assignedClass?.id) {
            subjectIds = teacherSubjects
              .filter(s => s.class_id === assignedClass.id)
              .map(s => s.subject_id);
          } else if (viewMode === 'subjectsTaught') {
            // Always include selectedSubject if available
            if (selectedSubject) {
              subjectIds = [selectedSubject];
            } else {
              // If no subject selected but in subjectsTaught view, use all teacher subjects
              subjectIds = teacherSubjects.map(s => s.subject_id);
            }
          }
    
          console.log('Fetching categories for:', subjectIds);
          
          if (subjectIds.length === 0) {
            setGradeCategories([]);
            return;
          }
    
          const { data, error } = await supabase
            .from('grade_categories')
            .select('*')
            .in('subject_id', subjectIds);
    
          if (error) throw error;
    
          console.log('Received categories:', data?.map(c => ({
            id: c.id,
            subject_id: c.subject_id,
            name: c.name
          })));
    
          setGradeCategories(data || []);
    
        } catch (error) {
          console.error('Error fetching categories:', error);
        } finally {
          setIsLoading(false);
        }
      };
    
      fetchGradeCategories();
    }, [viewMode, assignedClass, selectedSubject, teacherSubjects]);

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
    
    // Sort by name
    if (sortConfig.key === 'name') {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return sortConfig.direction === 'ascending' 
        ? nameA.localeCompare(nameB) 
        : nameB.localeCompare(nameA);
    }
    
    // Sort by roll number
    if (sortConfig.key === 'rollNo') {
      return sortConfig.direction === 'ascending' 
        ? a.roll_no.localeCompare(b.roll_no) 
        : b.roll_no.localeCompare(a.roll_no);
    }
    
    // Sort by performance (only in My Class view)
    if (sortConfig.key === 'performance' && viewMode === 'myClass') {
      const perfA = studentsWithPerformance.find(s => s.id === a.id)?.overallAvg || 0;
      const perfB = studentsWithPerformance.find(s => s.id === b.id)?.overallAvg || 0;
      return sortConfig.direction === 'ascending' 
        ? (perfA || 0) - (perfB || 0)
        : (perfB || 0) - (perfA || 0);
    }
    
    // Sort by subject performance (Subjects Taught view)
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
    
    // Combine teacher's subjects with all class subjects, removing duplicates
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

  const getCategoryGrades = (studentId: string, categoryId: string) => {
    return grades.filter(grade => 
      grade.student_id === studentId && 
      grade.category_id === categoryId
    );
  };

  const calculateCategoryAverage = (studentId: string, categoryId: string) => {
    const categoryGrades = getCategoryGrades(studentId, categoryId);
    if (categoryGrades.length === 0) return 0; // Return 0 instead of null for no grades
    
    const total = categoryGrades.reduce((sum, grade) => {
      return sum + (grade.score / grade.max_score * 100);
    }, 0);
    
    return total / categoryGrades.length;
  };

  const calculateSubjectAverage = (studentId: string, subjectId?: string) => {
    const targetSubjectId = viewMode === 'subjectsTaught' ? selectedSubject : subjectId;
    if (!targetSubjectId) return null;
  
    const relevantCategories = gradeCategories.filter(cat => 
      String(cat.subject_id) === String(targetSubjectId)
    );
  
    if (relevantCategories.length === 0) return null;
  
    let weightedSum = 0;
    let totalWeight = 0;
  
    relevantCategories.forEach(category => {
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
  
    // For My Class view, calculate average across all subjects
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
    } 
    // For Subjects Taught view, calculate average for the selected subject
    else if (viewMode === 'subjectsTaught' && selectedSubject) {
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
      
      // Calculate overall average considering all subjects
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

  // Grade editing functions (only for Subjects Taught view)
  const startNewGrade = (studentId: string, categoryId: string) => {
    if (!selectedSubject) return;
    
    // Find the category to get its weight
    const category = gradeCategories.find(cat => cat.id === categoryId);
    const categoryWeight = category?.weight || 100;
    
    setNewGrade({
      student_id: studentId,
      subject_id: selectedSubject,
      category_id: categoryId,
      teacher_id: teacherId,
      term_id: selectedTerm ?? undefined,
      score: 0,
      max_score: categoryWeight,
      date_given: new Date().toISOString()
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
  
      // Add more comprehensive validation
      if (!gradeToSave || 
          !gradeToSave.student_id || 
          !gradeToSave.subject_id || 
          !gradeToSave.category_id || 
          gradeToSave.score === undefined || 
          gradeToSave.score === null) {  // Explicit null check
        throw new Error('Missing required grade information');
      }
  
      // Ensure score is a valid number
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
            term_id: selectedTerm
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

// Update handleDeleteGrade to set errors
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
    showNotification('Grade deleted successfully!', 'success'); // Add this
    } catch (error) {
    console.error('Error deleting grade:', error);
    setDeleteError('Failed to delete grade. Please try again.');
    showNotification('Failed to delete grade', 'error'); // Add this
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

// Before your rankings table
const categoriesForSelectedSubject = gradeCategories.filter(
    c => String(c.subject_id) === String(selectedSubject)
  );
  
  if (viewMode === 'subjectsTaught' && selectedSubject && categoriesForSelectedSubject.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Data Loading Issue</h3>
        <div className="mt-4 p-4 bg-gray-50 rounded text-left text-sm">
          <p>Found {gradeCategories.length} total categories but none for subject {selectedSubject}</p>
          <p>Subject IDs in categories: {[...new Set(gradeCategories.map(c => c.subject_id))].join(', ')}</p>
          <p>Current view mode: {viewMode}</p>
          <p>Selected class: {selectedClass}</p>
        </div>
      </div>
    );
  }

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
            {/* Semester Selector */}
              <div className="flex-grow sm:flex-grow-0 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-500 mb-1">Term</label>
                <select
                  className="w-full bg-white rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedTerm || ''}
                  onChange={(e) => setSelectedTerm(e.target.value ? Number(e.target.value) : null)}
                  disabled={availableTerms.length === 0}
                >
                  <option value="">Select Term</option>
                  {availableTerms.map(term => (
                    <option key={term.id} value={term.id}>
                      {term.name} ({dayjs(term.start_date).format('MMM D')} - {dayjs(term.end_date).format('MMM D')})
                      {term.is_current && ' (Current)'}
                    </option>
                  ))}
                </select>
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

        {viewMode === 'myClass' ? (
          <>
            {/* Summary Cards */}
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

            {/* Subjects Accordion (My Class View) */}
            <div className="space-y-4">
              {classSubjects.map(subject => {
                const subjectCategories = gradeCategories.filter(cat => cat.subject_id === subject.subject_id);
                const isExpanded = expandedSubjects[subject.subject_id] || false;
                const subjectClassAvg = students.length > 0 
                ? students.reduce((sum, student) => {
                    const avg = calculateSubjectAverage(student.user_id, subject.subject_id) || 0;
                    return sum + avg;
                  }, 0) / students.length
                : null;
                
                return (
                  <div key={subject.subject_id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  {/* Subject header */}
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
                        {/* Subject Categories */}
                        <div className="mb-4">
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Assessment Categories</h3>
                          <div className="flex flex-wrap gap-2">
                            {subjectCategories.map(cat => (
                              <span 
                                key={cat.id} 
                                className="text-xs px-2 py-1 bg-gray-100 rounded-full flex items-center"
                              >
                                {cat.name} <span className="ml-1 text-gray-500">({cat.weight}%)</span>
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {/* Students Performance Table */}
                        <div className="overflow-x-auto mt-4">
                          <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Student
                                </th>
                                {subjectCategories.map(category => (
                                  <th key={category.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {category.name} <span className="font-normal lowercase">({category.weight}%)</span>
                                  </th>
                                ))}
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Overall
                                </th>
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
                                    
                                    {subjectCategories.map(category => {
                                      const categoryAvg = calculateCategoryAverage(student.user_id, category.id);
                                      const categoryGrades = getCategoryGrades(student.user_id, category.id);
                                      const canEdit = teacherSubjects.some(s => s.subject_id === subject.subject_id);
                                      
                                      return (
                                        <td key={category.id} className="px-4 py-4 whitespace-nowrap">
                                          <div className="flex items-center gap-2">
                                            <span 
                                              className="font-medium" 
                                              style={{ color: getScoreColor(categoryAvg) }}
                                            >
                                              {categoryAvg?.toFixed(1) || 'N/A'}%
                                            </span>
                                            
                                            {canEdit && categoryGrades.some(grade => grade.comments?.trim()) && (
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setViewingComments(
                                                    categoryGrades.filter(grade => grade.comments?.trim())
                                                  );
                                                }}
                                                className="relative group text-white bg-blue-600 hover:bg-blue-500 p-1 rounded"
                                              >
                                                <MessageSquare className="w-4 h-4" />
                                                <div className="absolute z-10 w-64 hidden group-hover:block bg-white border rounded-md shadow-lg p-2 left-0 mt-1">
                                                  <p className="text-xs text-gray-700 line-clamp-3">
                                                    {categoryGrades.find(grade => grade.comments?.trim())?.comments}
                                                  </p>
                                                </div>
                                              </button>
                                            )}
                                          </div>
                                        </td>
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

            {/* Overall Student Performance (My Class View) */}
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
          /* Subjects Taught View (Editable) */
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
                      {gradeCategories.map(category => (
                        <th key={category.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {category.name} <span className="font-normal lowercase">({category.weight}%)</span>
                        </th>
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

                          {gradeCategories.map(category => {
                            const categoryAvg = calculateCategoryAverage(student.user_id, category.id);
                            const categoryGrades = getCategoryGrades(student.user_id, category.id);

                            return (
                              <td key={category.id} className="px-6 py-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    {categoryGrades.length > 0 ? (
                                      <div className="flex items-center gap-2">
                                        <span 
                                          className="text-sm font-medium"
                                          style={{ color: getScoreColor(categoryAvg) }}
                                        >
                                          {categoryAvg?.toFixed(1) || 'N/A'}%
                                        </span>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                          {categoryGrades.length} {categoryGrades.length === 1 ? 'grade' : 'grades'}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400">No grades</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => startNewGrade(student.user_id, category.id)}
                                    className="text-blue-500 hover:text-blue-700 p-1 bg-slate-300 rounded-full hover:bg-blue-50 transition-colors"
                                    title="Add grade"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Grade list for this category */}
                                {categoryGrades.length > 0 && (
                                  <div className="space-y-1 bg-gray-50 p-2 rounded-lg">
                                    {categoryGrades.map(grade => (
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
                                        
                                        {/* Comment indicator */}
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
                                                if (grade.id === undefined) {
                                                  console.error("Grade ID is undefined!");  // Optional error logging
                                                  return;
                                                }
                                                setGradeToDelete(grade.id);  // Now guaranteed to be `string`
                                              }}
                                            className="text-red-500 hover:text-red-700 p-1 bg-stone-300 rounded-full hover:bg-red-100 transition-colors"
                                            title="Delete grade"
                                            aria-label={`Delete grade from ${new Date(grade.date_given).toLocaleDateString()}`}
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
            </div>
           
            {deleteError && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
                {deleteError}
            </div>
            )}

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
                            const validatedValue = Math.min(value, max); // Ensure score doesn't exceed max
                            
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
                        Max Score (Category Weight)
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
                        disabled // Make this read-only if you don't want it editable
                        />
                    </div>
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
                <X className="w-5 h-5 " />
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