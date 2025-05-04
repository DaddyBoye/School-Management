import React, { useState, useEffect } from 'react';
import { supabase } from "../../supabase";
import { 
  Search, 
  Book, 
  Users, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Tag
} from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  class_id: string;
  class_name?: string;
  admission_number: string;
  date_of_birth: string;
  gender: string;
  address: string;
  phone: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  is_active: boolean;
}

interface TeacherSubject {
  subject_id: number;
  class_id: string;
  subject_name: string;
  subject_code: string;
  class_name: string;
}

interface TeacherClass {
  class_id: string;
  class_name: string;
}

interface TeacherStudentViewProps {
  teacherId: string;
  schoolId: string;
  schoolName?: string;
}

const TeacherStudentView: React.FC<TeacherStudentViewProps> = ({ 
  teacherId, 
  schoolId,
  schoolName 
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [assignedClassId, setAssignedClassId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'myClass' | 'subjectClasses'>('myClass');
  const [selectedClassForSubjects, setSelectedClassForSubjects] = useState<string | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});
  const [subjectClassesMap, setSubjectClassesMap] = useState<Record<string, TeacherSubject[]>>({});
  
  // Fetch all necessary data
  useEffect(() => {
    if (!teacherId || !schoolId) {
      setError("Missing required teacher or school information");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // 1. Fetch teacher's assigned class (from teachers table)
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('class_id')
          .eq('user_id', teacherId)
          .single();

        if (teacherError) throw teacherError;

        const myClassId = teacherData?.class_id || null;
        setAssignedClassId(myClassId);

        // 2. Fetch teacher's assigned subjects (from teacher_subjects table)
        const { data: teacherSubjectsData, error: subjectsError } = await supabase
          .from('teacher_subjects')
          .select(`
            subject_id,
            class_id,
            subjects:subjects(name, code),
            classes:classes(name)
          `)
          .eq('teacher_id', teacherId)
          .eq('school_id', schoolId);

        if (subjectsError) throw subjectsError;

        const formattedSubjects = (teacherSubjectsData || []).map(item => ({
          subject_id: item.subject_id,
          class_id: item.class_id,
          subject_name: Array.isArray(item.subjects) 
            ? (item.subjects[0] as { name: string })?.name || 'Unknown' 
            : (item.subjects as { name: string })?.name || 'Unknown',
          subject_code: Array.isArray(item.subjects) 
            ? (item.subjects[0] as { code: string })?.code || '' 
            : (item.subjects as { code: string })?.code || '',
          class_name: Array.isArray(item.classes) 
            ? (item.classes[0] as { name: string })?.name || 'Unknown' 
            : (item.classes as { name: string })?.name || 'Unknown'
        }));

        setTeacherSubjects(formattedSubjects);

        // 3. Get unique classes where the teacher teaches subjects (excluding assigned class)
        const classesWithSubjects: Record<string, TeacherSubject[]> = {};
        
        formattedSubjects.forEach(subject => {
          if (subject.class_id !== myClassId) {
            if (!classesWithSubjects[subject.class_id]) {
              classesWithSubjects[subject.class_id] = [];
            }
            classesWithSubjects[subject.class_id].push(subject);
          }
        });
        
        setSubjectClassesMap(classesWithSubjects);

        // Create a list of all unique classes (assigned class + subject classes)
        const uniqueClasses: TeacherClass[] = [];
        
        // Add assigned class first if it exists
        if (myClassId) {
          const { data: assignedClass, error: classError } = await supabase
            .from('classes')
            .select('name')
            .eq('id', myClassId)
            .single();

          if (!classError && assignedClass) {
            uniqueClasses.push({
              class_id: myClassId,
              class_name: assignedClass.name
            });
          }
        }
        
        // Add other classes where teacher teaches subjects
        Object.entries(classesWithSubjects).forEach(([classId, subjects]) => {
          if (classId !== myClassId) {
            uniqueClasses.push({
              class_id: classId,
              class_name: subjects[0].class_name
            });
          }
        });

        setTeacherClasses(uniqueClasses);

        // Set initial selected class for subjects view if we have any
        if (Object.keys(classesWithSubjects).length > 0) {
          setSelectedClassForSubjects(Object.keys(classesWithSubjects)[0]);
        }

        // 4. Fetch all students for the school
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select(`
            *,
            classes:classes!students_class_id_fkey(name)
          `)
          .eq('school_id', schoolId)
          .order('first_name', { ascending: true });

        if (studentsError) throw studentsError;

        const formattedStudents = (studentsData || []).map(student => ({
          ...student,
          class_name: student.classes?.name
        }));

        setAllStudents(formattedStudents);
        
        // Initially show students from assigned class if available
        if (myClassId) {
          setStudents(formattedStudents.filter(student => 
            student.class_id === myClassId
          ));
        } else {
          setStudents([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teacherId, schoolId]);

  // Filter students based on current view mode and selections
  useEffect(() => {
    if (!allStudents.length) return;

    let filtered = [...allStudents];
    
    // Apply search filter first (applies to both views)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(student => 
        student.first_name.toLowerCase().includes(term) || 
        student.last_name.toLowerCase().includes(term) ||
        student.admission_number.toLowerCase().includes(term)
      );
    }

    // Then filter by the appropriate view criteria
    if (viewMode === 'myClass') {
      // Just show students from my assigned class
      if (assignedClassId) {
        filtered = filtered.filter(student => student.class_id === assignedClassId);
      } else {
        filtered = []; // No assigned class means no students to show
      }
    } else if (viewMode === 'subjectClasses') {
      // Show students from the selected class where I teach subjects
      if (selectedClassForSubjects) {
        filtered = filtered.filter(student => student.class_id === selectedClassForSubjects);
      } else {
        filtered = []; // No class selected means no students to show
      }
    }

    setStudents(filtered);
  }, [viewMode, selectedClassForSubjects, searchTerm, allStudents, assignedClassId]);

  const toggleStudentExpand = (studentId: string) => {
    setExpandedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Get the subjects taught by the teacher in a specific class
  const getSubjectsForClass = (classId: string): TeacherSubject[] => {
    return teacherSubjects.filter(subject => subject.class_id === classId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading student data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <h2 className="font-bold">Error Loading Data</h2>
        <p>{error}</p>
        <p className="text-sm mt-2">Please try again or contact support</p>
      </div>
    );
  }

  const hasSubjectClasses = Object.keys(subjectClassesMap).length > 0;
  const hasAssignedClass = !!assignedClassId;

  if (!hasAssignedClass && !hasSubjectClasses) {
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

  return (
    <div className="text-black min-h-screen p-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Student Management</h1>
          {schoolName && <p className="text-gray-600">{schoolName}</p>}
        </div>
        
        {/* View Toggle */}
        <div className="flex gap-2">
          {hasAssignedClass && (
            <button
              onClick={() => setViewMode('myClass')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                viewMode === 'myClass' 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              My Class
            </button>
          )}
          
          {hasSubjectClasses && (
            <button
              onClick={() => setViewMode('subjectClasses')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                viewMode === 'subjectClasses' 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              <Book className="w-4 h-4" />
              Subject Classes
            </button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 w-4 h-4" />
          <input
            type="text"
            placeholder="Search students by name or admission number..."
            className="w-full pl-10 bg-gray-200 pr-4 py-2 border-2 border-zinc-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Class Selector (Only for Subject Classes view) */}
        {viewMode === 'subjectClasses' && hasSubjectClasses && (
          <select
            className="bg-gray-200 rounded-lg px-4 py-2 border-2 border-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedClassForSubjects || ''}
            onChange={(e) => setSelectedClassForSubjects(e.target.value)}
          >
            {Object.entries(subjectClassesMap).map(([classId, subjects]) => (
              <option key={classId} value={classId}>
                {subjects[0].class_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* View Title */}
      <div className="mb-4">
        {viewMode === 'myClass' && hasAssignedClass && (
          <h2 className="text-lg font-semibold">
            My Class: {teacherClasses.find(c => c.class_id === assignedClassId)?.class_name}
          </h2>
        )}

        {viewMode === 'subjectClasses' && selectedClassForSubjects && (
          <div>
            <h2 className="text-lg font-semibold">
              Class: {subjectClassesMap[selectedClassForSubjects]?.[0]?.class_name}
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-sm text-gray-600">Subjects I teach:</span>
              {getSubjectsForClass(selectedClassForSubjects).map(subject => (
                <span 
                  key={subject.subject_id} 
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" />
                  {subject.subject_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Students List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">No students found matching your criteria</p>
            <p className="text-sm mt-2">
              {searchTerm ? 'Try adjusting your search term' : 
                viewMode === 'myClass' && !assignedClassId ? 
                  'You have no assigned class' : 
                  'No students in this class'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {students.map((student) => (
              <div key={student.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-lg">
                        {student.first_name} {student.last_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {student.class_name} • {student.admission_number}
                        {!student.is_active && (
                          <span className="ml-2 text-red-500">(Inactive)</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleStudentExpand(student.id)}
                      className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100"
                      aria-label={expandedStudents[student.id] ? "Collapse details" : "Expand details"}
                    >
                      {expandedStudents[student.id] ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Student Details */}
                  {expandedStudents[student.id] && (
                    <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>{student.email || 'Not provided'}</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>{student.phone || 'Not provided'}</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>DOB: {student.date_of_birth || 'Not provided'}</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0">♀♂</span>
                          <span>Gender: {student.gender || 'Not specified'}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>{student.address || 'Not provided'}</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>Parent: {student.parent_name || 'Not provided'}</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>Parent Phone: {student.parent_phone || 'Not provided'}</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>Parent Email: {student.parent_email || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherStudentView;