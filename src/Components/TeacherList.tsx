import { useState, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { supabase } from "../supabase";

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  class_id: string;
  subject_id: number;
  class_name?: string;
  subject_name?: string;
  subject_code?: string;
  phone: string;
  is_active: boolean;
}

const TeacherListDashboard = ({ schoolId }: { schoolId: string }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    class: '',
    subject: '',
    search: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch classes
        const { data: classesData, error: classesError } = await supabase
          .from("classes")
          .select("*")
          .eq("school_id", schoolId);
        
        if (classesError) throw classesError;
        setClasses(classesData || []);
        
        // Fetch subjects
        const { data: subjectsData, error: subjectsError } = await supabase
          .from("subjects")
          .select("*")
          .eq("school_id", schoolId);
          
        if (subjectsError) throw subjectsError;
        setSubjects(subjectsData || []);
    
        // Fetch teachers with relationships
        const { data: teachersData, error: teachersError } = await supabase
          .from("teachers")
          .select(`
            *,
            classes:classes!teachers_class_id_fkey(name),
            subjects:subjects!teachers_subject_id_fkey(name, code)
          `)
          .eq("school_id", schoolId);
    
        if (teachersError) throw teachersError;
        
        // Format teachers with class and subject names
        const formattedTeachers = (teachersData || []).map(teacher => ({
          ...teacher,
          class_name: teacher.classes?.name,
          subject_name: teacher.subjects?.name,
          subject_code: teacher.subjects?.code
        }));
    
        setTeachers(formattedTeachers);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [schoolId]);

  // Filter teachers based on selected filters
  const filteredTeachers = teachers.filter(teacher => {
    const searchMatch = 
      !filters.search ||
      teacher.first_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      teacher.last_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      teacher.email.toLowerCase().includes(filters.search.toLowerCase());
    
    const classMatch = !filters.class || teacher.class_id === filters.class;
    const subjectMatch = !filters.subject || teacher.subject_id === Number(filters.subject);
    
    return searchMatch && classMatch && subjectMatch;
  });

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-2xl border-2 flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          Loading teacher data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-2xl border-2 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="w-full bg-white border-2 rounded-xl shadow-sm">
      <div className="p-4">
        {/* Header and Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-black">Teachers</h2>
            <p className="text-sm text-gray-500">
              {filteredTeachers.length} {filteredTeachers.length === 1 ? 'teacher' : 'teachers'} found
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search teachers..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
            
            {/* Class Filter */}
            <div className="relative flex-1 md:w-40">
              <select
                className="w-full appearance-none bg-gray-100 hover:bg-gray-200 rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.class}
                onChange={(e) => setFilters({...filters, class: e.target.value})}
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
            
            {/* Subject Filter */}
            <div className="relative flex-1 md:w-40">
              <select
                className="w-full appearance-none bg-gray-100 hover:bg-gray-200 rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.subject}
                onChange={(e) => setFilters({...filters, subject: e.target.value})}
              >
                <option value="">All Subjects</option>
                {subjects.map(subj => (
                  <option key={subj.id} value={subj.id}>{subj.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
        
        {/* Teachers Table */}
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header - Desktop */}
            <div className="hidden md:grid grid-cols-12 gap-3 p-3 bg-gray-50 rounded-lg text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">Name</div>
              <div className="col-span-1">Class</div>
              <div className="col-span-2">Subject</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Phone</div>
              <div className="col-span-2">Status</div>
            </div>
            
            {/* Teacher Rows */}
            <div className="space-y-1">
              {filteredTeachers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-gray-400 text-lg mb-2">No teachers found</div>
                  <p className="text-sm">Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                filteredTeachers.map(teacher => (
                  <div 
                    key={teacher.id} 
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors rounded-lg"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{teacher.first_name} {teacher.last_name}</p>
                          <p className="text-sm text-gray-500">{teacher.email}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          teacher.is_active 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {teacher.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs font-medium">Class</p>
                          <p className="text-gray-900">{teacher.class_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs font-medium">Subject</p>
                          <p className="text-gray-900">
                            {teacher.subject_name || 'N/A'}
                            {teacher.subject_code && <span className="text-gray-500"> ({teacher.subject_code})</span>}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-gray-500 text-xs font-medium">Phone</p>
                        <p className="text-gray-900">{teacher.phone}</p>
                      </div>
                    </div>
                    
                    {/* Desktop Layout */}
                    <div className="hidden md:contents">
                      {/* Name */}
                      <div className="col-span-2 flex items-center">
                        <div>
                          <p className="font-semibold text-gray-900">{teacher.first_name} {teacher.last_name}</p>
                        </div>
                      </div>
                      
                      {/* Class */}
                      <div className="col-span-1 flex items-center">
                        <p className="text-sm text-gray-700">{teacher.class_name || 'N/A'}</p>
                      </div>
                      
                      {/* Subject */}
                      <div className="col-span-2 flex items-center">
                        <div>
                          <p className="text-sm text-gray-700">{teacher.subject_name || 'N/A'}</p>
                          {teacher.subject_code && (
                            <p className="text-xs text-gray-500">({teacher.subject_code})</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Email */}
                      <div className="col-span-3 flex items-center">
                        <p className="text-sm text-gray-600 truncate">{teacher.email}</p>
                      </div>
                      
                      {/* Phone */}
                      <div className="col-span-2 flex items-center">
                        <p className="text-sm text-gray-700">{teacher.phone}</p>
                      </div>
                      
                      {/* Status */}
                      <div className="col-span-2 flex items-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          teacher.is_active 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {teacher.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherListDashboard;