import { useState, useEffect } from 'react';
import { supabase } from "../../supabase";
import { sendEmail } from '../../services/emailService';
import { generatePassword } from '../../services/passwordGenerator';
import { Search, Plus, X, Edit2, Mail, Phone, Book, Calendar, MapPin, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/Components/ui/alert-dialog";

interface Teacher {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  class_id: string;
  subject_id: number;
  class_name?: string;
  subject_name?: string;
  subject_code?: string;
  education: string;
  experience: string;
  address: string;
  phone: string;
  joinDate: string;
  school_id: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface FormErrors {
  email?: string;
  phone?: string;
  date_of_birth?: string;
  emergency_contact_phone?: string;
  class_id?: string;
  subject_id?: string;
  submit?: string;
}

const TeachersList = ({ schoolId, schoolName }: { schoolId: string; schoolName: string }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | "All Classes">("All Classes");
  const [selectedSubject, setSelectedSubject] = useState<number | "All Subjects">("All Subjects");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [newTeacherData, setNewTeacherData] = useState<Omit<Teacher, 'id'>>({
    first_name: '',
    last_name: '',
    email: '',
    class_id: '',
    subject_id: 0,
    education: '',
    experience: '',
    address: '',
    phone: '',
    joinDate: new Date().toISOString().split('T')[0],
    school_id: schoolId,
    date_of_birth: '',
    gender: '',
    marital_status: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    is_active: true,
    notes: '',
    user_id: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  useEffect(() => {
    console.log('Initializing component with schoolId:', schoolId);
    fetchData();
  }, [schoolId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('Starting data fetch...');
      
      // Fetch classes
      console.log('Fetching classes...');
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("*")
        .eq("school_id", schoolId);
      
      if (classesError) throw classesError;
      console.log('Classes fetched:', classesData?.length);
      setClasses(classesData || []);
      
      // Fetch subjects
      console.log('Fetching subjects...');
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("*")
        .eq("school_id", schoolId);
        
      if (subjectsError) throw subjectsError;
      console.log('Subjects fetched:', subjectsData?.length);
      setSubjects(subjectsData || []);
  
      // Fetch teachers with explicit relationship specification
      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select(`
          *,
          classes:classes!teachers_class_id_fkey(name),
          subjects:subjects!teachers_subject_id_fkey(name, code)
        `)
        .eq("school_id", schoolId);
  
      if (teachersError) throw teachersError;
      console.log('Teachers raw data:', teachersData);
      
      // Format teachers with class and subject names
      const formattedTeachers = (teachersData || []).map(teacher => ({
        ...teacher,
        class_name: teacher.classes?.name,
        subject_name: teacher.subjects?.name,
        subject_code: teacher.subjects?.code
      }));
  
      console.log('Formatted teachers:', formattedTeachers);
      setTeachers(formattedTeachers);
    } catch (error) {
      console.error('Error in fetchData:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
      console.log('Data fetch completed');
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = selectedClass === "All Classes" || teacher.class_id === selectedClass;
    const matchesSubject = selectedSubject === "All Subjects" || 
                          teacher.subject_id === (typeof selectedSubject === 'number' ? selectedSubject : Number(selectedSubject));
  
    return matchesSearch && matchesClass && matchesSubject;
  });

  const validateTeacherData = async (teacherData: Teacher | Omit<Teacher, 'id'>, currentTeacherId: string | null = null) => {
    console.log('Validating teacher data:', teacherData);
    const errors: FormErrors = {};
    
    // Email validation (only checks teachers table)
    if (!teacherData.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacherData.email)) {
      errors.email = "Invalid email format";
    } else {
      try {
        const query = supabase
          .from("teachers")
          .select("id, email")
          .eq("email", teacherData.email);
    
        if (currentTeacherId) {
          query.neq("id", currentTeacherId);
        }
    
        const { data: emailCheck } = await query.maybeSingle();
        
        if (emailCheck) {
          errors.email = "This email is already being used by another teacher";
        }
      } catch (error) {
        console.error('Error validating email:', error);
        errors.email = "Error validating email availability";
      }
    }
  
    // Phone validation
    if (!teacherData.phone) {
      errors.phone = "Phone number is required";
    } else if (!/^[\d\s+\-()]{10,20}$/.test(teacherData.phone)) {
      errors.phone = "Invalid phone number format";
    }
  
    // Date of birth validation
    if (teacherData.date_of_birth) {
      const dob = new Date(teacherData.date_of_birth);
      const today = new Date();
      const minDate = new Date();
      minDate.setFullYear(today.getFullYear() - 70);
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() - 18);
  
      if (dob > today) {
        errors.date_of_birth = "Date of birth cannot be in the future";
      } else if (dob < minDate) {
        errors.date_of_birth = "Teacher must be less than 70 years old";
      } else if (dob > maxDate) {
        errors.date_of_birth = "Teacher must be at least 18 years old";
      }
    }
  
    // Class and subject validation
    if (!teacherData.class_id || teacherData.class_id === '') {
      errors.class_id = "Class is required";
    }

    if (!teacherData.class_id) {
      errors.class_id = "Class is required";
    } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teacherData.class_id)) {
      errors.class_id = "Invalid class selection";
    }
  
    if (!teacherData.subject_id) {
      errors.subject_id = "Subject is required";
    } else {
      // Verify subject exists in database
      const { data: subject, error } = await supabase
        .from('subjects')
        .select('id')
        .eq('id', teacherData.subject_id)
        .single();
  
      if (error || !subject) {
        errors.subject_id = "Selected subject does not exist";
      }
    }
  
    console.log('Validation errors:', errors);
    return errors;
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editFormData) return;
  
    console.log('Submitting edit form:', editFormData);
    setIsSubmitting(true);
    setFormErrors({});
  
    try {
      const validationErrors = await validateTeacherData(editFormData, editFormData.id);
      
      if (Object.keys(validationErrors).length > 0) {
        console.log('Validation failed:', validationErrors);
        setFormErrors(validationErrors);
        return;
      }
  
      // First update the teacher record
      const { data, error } = await supabase
        .from("teachers")
        .update({
          // Explicitly list all fields to update (excluding derived fields)
          first_name: editFormData.first_name,
          last_name: editFormData.last_name,
          email: editFormData.email,
          class_id: editFormData.class_id,
          subject_id: editFormData.subject_id,
          education: editFormData.education,
          experience: editFormData.experience,
          address: editFormData.address,
          phone: editFormData.phone,
          date_of_birth: editFormData.date_of_birth,
          gender: editFormData.gender,
          marital_status: editFormData.marital_status,
          emergency_contact_name: editFormData.emergency_contact_name,
          emergency_contact_phone: editFormData.emergency_contact_phone,
          is_active: editFormData.is_active,
          notes: editFormData.notes,
          updated_at: new Date().toISOString()
        })
        .eq("id", editFormData.id)
        .select() // Only select the teacher fields, not relationships
  
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No data returned from update");
  
      // Then fetch the updated teacher with relationships
      const { data: updatedTeacherData, error: fetchError } = await supabase
        .from("teachers")
        .select(`
          *,
          classes:classes!teachers_class_id_fkey(name),
          subjects:subjects!teachers_subject_id_fkey(name, code)
        `)
        .eq("id", editFormData.id)
        .single();
  
      if (fetchError) throw fetchError;
  
      const updatedTeacher = {
        ...updatedTeacherData,
        class_name: updatedTeacherData.classes?.name,
        subject_name: updatedTeacherData.subjects?.name,
        subject_code: updatedTeacherData.subjects?.code
      };
  
      console.log('Update successful:', updatedTeacher);
      setTeachers(teachers.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));
      setIsEditing(false);
      setSelectedTeacher(updatedTeacher);
      setEditFormData(null);
    } catch (error) {
      console.error('Error updating teacher:', error);
      setFormErrors({ submit: error instanceof Error ? error.message : 'An unknown error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTeacher = async (teacherData: Omit<Teacher, 'id'>, schoolName: string) => {
    console.log('Starting to add teacher:', teacherData);
    setIsSubmitting(true);
    setFormErrors({});
  
    try {
      const validationErrors = await validateTeacherData(teacherData);
      if (Object.keys(validationErrors).length > 0) {
        console.log('Validation failed:', validationErrors);
        setFormErrors(validationErrors);
        return;
      }
  
      console.log('Generating password...');
      const password = generatePassword();
      
      console.log('Creating auth user...');
      const { data: { user }, error: authError } = await supabase.auth.signUp({
        email: teacherData.email,
        password: password,
        options: { data: { role: 'teacher' } },
      });
  
      if (authError) throw authError;
      if (!user) throw new Error("Failed to create user");
      console.log('Auth user created:', user.id);
  
      console.log('Inserting teacher record...');
      const { data: teacherDataResult, error: teacherError } = await supabase
        .from("teachers")
        .insert([{ 
          ...teacherData,
          user_id: user.id,
          joinDate: new Date().toISOString().split('T')[0],
          is_active: true
        }])
        .select(`
          *,
          classes:classes!teachers_class_id_fkey(name),
          subjects:subjects!teachers_subject_id_fkey(name, code)
        `)
        .single();
  
      if (teacherError) throw teacherError;
      console.log('Teacher record created:', teacherDataResult);
  
      const newTeacher = {
        ...teacherDataResult,
        class_name: teacherDataResult.classes?.name,
        subject_name: teacherDataResult.subjects?.name,
        subject_code: teacherDataResult.subjects?.code
      };
  
      // Rest of your function remains the same...
      console.log('Sending welcome email...');
      await sendEmail(
        teacherData.email,
        `${teacherData.first_name} ${teacherData.last_name}`,
        schoolName,
        password,
        'https://esemes.vercel.app/',
        'gabrieladjeiboye@gmail.com',
        'Gabriel Adjei-Boye'
      );
  
      console.log('Updating teachers state...');
      setTeachers([...teachers, newTeacher]);
      setShowAddModal(false);
      setNewTeacherData({
        first_name: '',
        last_name: '',
        email: '',
        class_id: '',
        subject_id: 0,
        education: '',
        experience: '',
        address: '',
        phone: '',
        joinDate: new Date().toISOString().split('T')[0],
        school_id: schoolId,
        date_of_birth: '',
        gender: '',
        marital_status: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        is_active: true,
        notes: '',
        user_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding teacher:', error);
      setFormErrors({ submit: error instanceof Error ? error.message : "An error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (teacher: Teacher) => {
    console.log('Starting to edit teacher:', teacher);
    setIsEditing(true);
    setEditFormData(teacher);
  };

  const deleteTeacher = async (teacherId: string) => {
    console.log('Deleting teacher:', teacherId);
    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", teacherId);

      if (error) throw error;

      console.log('Teacher deleted successfully');
      setTeachers(teachers.filter(teacher => teacher.id !== teacherId));
      setSelectedTeacher(null);
      setTeacherToDelete(null);
    } catch (error: any) {
      console.error('Error deleting teacher:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewTeacherChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewTeacherData(prev => ({
      ...prev,
      [name]: name === 'subject_id' ? Number(value) : value
    }));
  };
  
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editFormData) {
      setEditFormData({
        ...editFormData,
        [name]: name === 'subject_id' || name === 'class_id' ? value : value
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading teachers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-black min-h-screen">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Teachers</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 w-full md:w-auto justify-center"
          disabled={isSubmitting}
        >
          <Plus className="w-4 h-4" />
          Add Teacher
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 w-4 h-4" />
          <input
            type="text"
            placeholder="Search teachers..."
            className="w-full pl-10 bg-gray-200 pr-4 py-2 border-2 border-zinc-950 rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="bg-gray-200 rounded-lg px-4 py-2"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value === "All Classes" ? "All Classes" : e.target.value)}
        >
          <option value="All Classes">All Classes</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
        <select
          className="bg-gray-200 rounded-lg px-4 py-2"
          value={selectedSubject === "All Subjects" ? "All Subjects" : selectedSubject}
          onChange={(e) => setSelectedSubject(
            e.target.value === "All Subjects" 
              ? "All Subjects" 
              : Number(e.target.value)
          )}
        >
          <option value="All Subjects">All Subjects</option>
          {subjects.map(subj => (
            <option key={subj.id} value={subj.id}>{subj.name} ({subj.code})</option>
          ))}
        </select>
      </div>

      {/* Teachers List */}
      <div className="bg-white rounded-lg shadow">
        {filteredTeachers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No teachers found. Add a new teacher to get started.
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-5 gap-4 p-4 bg-gray-100 rounded-lg font-medium">
              <div>Name</div>
              <div>Class</div>
              <div>Subject</div>
              <div>Email</div>
              <div className="text-right">Action</div>
            </div>
            
            <div className="divide-y">
              {filteredTeachers.map((teacher) => (
                <div key={teacher.id} className="p-4">
                  <div className="md:grid md:grid-cols-5 md:gap-4 space-y-2 md:space-y-0">
                    <div className="font-medium">{teacher.first_name} {teacher.last_name}</div>
                    <div className="text-gray-600">
                      <span className="md:hidden">Class: </span>
                      {teacher.class_name || 'N/A'}
                    </div>
                    <div className="text-gray-600">
                      <span className="md:hidden">Subject: </span>
                      {teacher.subject_name || 'N/A'} {teacher.subject_code ? `(${teacher.subject_code})` : ''}
                    </div>
                    <div className="text-gray-600">
                      <span className="md:hidden">Email: </span>
                      {teacher.email}
                    </div>
                    <div className="text-right flex gap-2 justify-end">
                      <button
                        onClick={() => setSelectedTeacher(teacher)}
                        className="text-black bg-gray-300 hover:text-blue-600 px-2 py-1 rounded"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => setTeacherToDelete(teacher)}
                        className="text-red-600 bg-gray-300 hover:text-red-800 px-2 py-1 rounded"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!teacherToDelete} onOpenChange={() => setTeacherToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {teacherToDelete?.first_name}'s record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => teacherToDelete && deleteTeacher(teacherToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Teacher Details Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold">Teacher Details</h2>
                <div className="flex gap-2">
                  {!isEditing && (
                    <button
                      onClick={() => startEditing(selectedTeacher)}
                      className="flex bg-gray-300 items-center gap-2 px-4 py-2 border rounded-lg"
                      disabled={isSubmitting}
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedTeacher(null);
                      setIsEditing(false);
                      setEditFormData(null);
                    }}
                    className="text-gray-500 bg-gray-300 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {!isEditing ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">
                        {selectedTeacher.first_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{selectedTeacher.first_name} {selectedTeacher.last_name}</h3>
                      <p className="text-gray-500">{selectedTeacher.subject_name} Teacher</p>
                      <p className="text-sm text-gray-500">
                        {selectedTeacher.is_active ? 'Active' : 'Inactive'} since {selectedTeacher.joinDate}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{selectedTeacher.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{selectedTeacher.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Book className="w-4 h-4 text-gray-400" />
                        <span>{selectedTeacher.education}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Date of Birth: {selectedTeacher.date_of_birth}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 text-gray-400">♀♂</span>
                        <span>Gender: {selectedTeacher.gender}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Joined: {selectedTeacher.joinDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{selectedTeacher.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Experience: {selectedTeacher.experience}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 text-gray-400">⚭</span>
                        <span>Status: {selectedTeacher.marital_status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>Emergency: {selectedTeacher.emergency_contact_name} ({selectedTeacher.emergency_contact_phone})</span>
                      </div>
                    </div>
                  </div>
                  {selectedTeacher.notes && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Additional Notes:</h4>
                      <p className="text-gray-600 whitespace-pre-line">{selectedTeacher.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="first_name"
                      placeholder="First Name"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData?.first_name || ''}
                      onChange={handleEditFormChange}
                    />
                    <input
                      type="text"
                      name="last_name"
                      placeholder="Last Name"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData?.last_name || ''}
                      onChange={handleEditFormChange}
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                        formErrors.email ? 'border-red-500' : ''
                      }`}
                      value={editFormData?.email || ''}
                      onChange={handleEditFormChange}
                      disabled={isSubmitting}
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                    )}

                    <input
                      type="tel"
                      name="phone"
                      placeholder="Phone"
                      className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                        formErrors.phone ? 'border-red-500' : ''
                      }`}
                      value={editFormData?.phone || ''}
                      onChange={handleEditFormChange}
                      disabled={isSubmitting}
                    />
                    {formErrors.phone && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                    )}
                    <select
                      name="class_id"
                      className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                        formErrors.class_id ? 'border-red-500' : ''
                      }`}
                      value={editFormData?.class_id || ''}
                      onChange={handleEditFormChange}
                      disabled={isSubmitting}
                      required
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                    {formErrors.class_id && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.class_id}</p>
                    )}
                    <select
                      name="subject_id"
                      className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                        formErrors.subject_id ? 'border-red-500' : ''
                      }`}
                      value={editFormData?.subject_id || ''}
                      onChange={handleEditFormChange}
                      disabled={isSubmitting}
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(subj => (
                        <option key={subj.id} value={subj.id}>{subj.name} ({subj.code})</option>
                      ))}
                    </select>
                    {formErrors.subject_id && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.subject_id}</p>
                    )}
                    <input
                      type="date"
                      name="date_of_birth"
                      placeholder="Date of Birth"
                      className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                        formErrors.date_of_birth ? 'border-red-500' : ''
                      }`}
                      value={editFormData?.date_of_birth || ''}
                      onChange={handleEditFormChange}
                    />
                    {formErrors.date_of_birth && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.date_of_birth}</p>
                    )}
                    <select
                      name="gender"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData?.gender || ''}
                      onChange={handleEditFormChange}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <select
                      name="marital_status"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData?.marital_status || ''}
                      onChange={handleEditFormChange}
                    >
                      <option value="">Marital Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      placeholder="Emergency Contact Name"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData?.emergency_contact_name || ''}
                      onChange={handleEditFormChange}
                    />
                    <input
                      type="tel"
                      name="emergency_contact_phone"
                      placeholder="Emergency Contact Phone"
                      className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                        formErrors.emergency_contact_phone ? 'border-red-500' : ''
                      }`}
                      value={editFormData?.emergency_contact_phone || ''}
                      onChange={handleEditFormChange}
                    />
                    {formErrors.emergency_contact_phone && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.emergency_contact_phone}</p>
                    )}
                    <input
                      type="text"
                      name="education"
                      placeholder="Education"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData?.education || ''}
                      onChange={handleEditFormChange}
                    />
                    <input
                      type="text"
                      name="experience"
                      placeholder="Experience"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData?.experience || ''}
                      onChange={handleEditFormChange}
                    />
                    <input
                      type="text"
                      name="address"
                      placeholder="Address"
                      className="border bg-gray-300 rounded-lg px-4 py-2 md:col-span-2"
                      value={editFormData?.address || ''}
                      onChange={handleEditFormChange}
                    />
                    <textarea
                      name="notes"
                      placeholder="Additional Notes"
                      className="border bg-gray-300 rounded-lg px-4 py-2 md:col-span-2"
                      value={editFormData?.notes || ''}
                      onChange={handleEditFormChange}
                      rows={3}
                    />
                  </div>
                  {formErrors.submit && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.submit}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 border bg-red-600 text-white rounded-lg"
                      onClick={() => {
                        setIsEditing(false);
                        setEditFormData(null);
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </div>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold">Add New Teacher</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewTeacherData({
                      first_name: '',
                      last_name: '',
                      email: '',
                      class_id: '',
                      subject_id: 0,
                      education: '',
                      experience: '',
                      address: '',
                      phone: '',
                      joinDate: new Date().toISOString().split('T')[0],
                      school_id: schoolId,
                      date_of_birth: '',
                      gender: '',
                      marital_status: '',
                      emergency_contact_name: '',
                      emergency_contact_phone: '',
                      is_active: true,
                      notes: '',
                      user_id: '',
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    });
                    setFormErrors({});
                  }}
                  className="text-gray-500 bg-gray-300 hover:text-gray-700 rounded"
                  disabled={isSubmitting}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addTeacher(newTeacherData, schoolName);
                }}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="first_name"
                    placeholder="First Name"
                    required
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                    value={newTeacherData.first_name}
                    onChange={handleNewTeacherChange}
                    disabled={isSubmitting}
                  />
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Last Name"
                    required
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                    value={newTeacherData.last_name}
                    onChange={handleNewTeacherChange}
                    disabled={isSubmitting}
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    required
                    className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                      formErrors.email ? 'border-red-500' : ''
                    }`}
                    value={newTeacherData.email}
                    onChange={handleNewTeacherChange}
                    disabled={isSubmitting}
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                  )}

                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone"
                    required
                    className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                      formErrors.phone ? 'border-red-500' : ''
                    }`}
                    value={newTeacherData.phone}
                    onChange={handleNewTeacherChange}
                    disabled={isSubmitting}
                  />
                  {formErrors.phone && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                  )}

                  <select 
                    name="class_id" 
                    required
                    className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                      formErrors.class_id ? 'border-red-500' : ''
                    }`}
                    value={newTeacherData.class_id}
                    onChange={handleNewTeacherChange}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                  {formErrors.class_id && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.class_id}</p>
                  )}

                  <select 
                    name="subject_id" 
                    required
                    className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                      formErrors.subject_id ? 'border-red-500' : ''
                    }`}
                    value={newTeacherData.subject_id}
                    onChange={handleNewTeacherChange}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(subj => (
                      <option key={subj.id} value={subj.id}>{subj.name} ({subj.code})</option>
                    ))}
                  </select>
                  {formErrors.subject_id && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.subject_id}</p>
                  )}

                  <input
                    type="date"
                    name="date_of_birth"
                    placeholder="Date of Birth"
                    required
                    className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                      formErrors.date_of_birth ? 'border-red-500' : ''
                    }`}
                    value={newTeacherData.date_of_birth}
                    onChange={handleNewTeacherChange}
                  />
                  {formErrors.date_of_birth && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.date_of_birth}</p>
                  )}
                  <select
                    name="gender"
                    required
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                    value={newTeacherData.gender}
                    onChange={handleNewTeacherChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <select
                    name="marital_status"
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                    value={newTeacherData.marital_status}
                    onChange={handleNewTeacherChange}
                  >
                    <option value="">Marital Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                  <input
                    type="text"
                    name="emergency_contact_name"
                    placeholder="Emergency Contact Name"
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                    value={newTeacherData.emergency_contact_name}
                    onChange={handleNewTeacherChange}
                  />
                  <input
                    type="tel"
                    name="emergency_contact_phone"
                    placeholder="Emergency Contact Phone"
                    className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                      formErrors.emergency_contact_phone ? 'border-red-500' : ''
                    }`}
                    value={newTeacherData.emergency_contact_phone}
                    onChange={handleNewTeacherChange}
                  />
                  {formErrors.emergency_contact_phone && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.emergency_contact_phone}</p>
                  )}
                  <input
                    type="text"
                    name="education"
                    placeholder="Education"
                    required
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                    value={newTeacherData.education}
                    onChange={handleNewTeacherChange}
                    disabled={isSubmitting}
                  />
                  <input
                    type="text"
                    name="experience"
                    placeholder="Experience"
                    required
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                    value={newTeacherData.experience}
                    onChange={handleNewTeacherChange}
                    disabled={isSubmitting}
                  />
                  <input
                    type="text"
                    name="address"
                    placeholder="Address"
                    required
                    className="border bg-gray-300 rounded-lg px-4 py-2 md:col-span-2"
                    value={newTeacherData.address}
                    onChange={handleNewTeacherChange}
                    disabled={isSubmitting}
                  />
                  <textarea
                    name="notes"
                    placeholder="Additional Notes"
                    className="border bg-gray-300 rounded-lg px-4 py-2 md:col-span-2"
                    value={newTeacherData.notes}
                    onChange={handleNewTeacherChange}
                    rows={3}
                  />
                </div>

                {formErrors.submit && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.submit}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 border bg-red-600 text-white rounded-lg"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewTeacherData({
                        first_name: '',
                        last_name: '',
                        email: '',
                        class_id: '',
                        subject_id: 0,
                        education: '',
                        experience: '',
                        address: '',
                        phone: '',
                        joinDate: new Date().toISOString().split('T')[0],
                        school_id: schoolId,
                        date_of_birth: '',
                        gender: '',
                        marital_status: '',
                        emergency_contact_name: '',
                        emergency_contact_phone: '',
                        is_active: true,
                        notes: '',
                        user_id: '',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      });
                      setFormErrors({});
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </div>
                    ) : (
                      'Add Teacher'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeachersList;