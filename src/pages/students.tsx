import { useState, useEffect } from 'react';
import { supabase } from "../supabase";
import { sendEmail } from '../services/emailService';
import { generatePassword } from '../services/passwordGenerator';
import { Search, Plus, X, Edit2, Mail, Phone, Book, Calendar, MapPin, Loader2, HeartPulse, HeartPulseIcon} from 'lucide-react';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/Components/ui/alert-dialog";

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  parent_name?: string;
  parent_phone?: string;
  address?: string;
  class_id?: string;
  join_date?: string;
  emergency_contact_phone?: string;
  submit?: string;
}

interface Student {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  gender?: string;
  date_of_birth?: string;
  class_id: string;
  parent_name: string;
  parent_email?: string;
  parent_phone: string;
  parent_relationship?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  join_date: string;
  school_id: string;
  medical_notes?: string;
  allergies?: string;
  previous_school?: string;
  enrollment_status: string;
  created_at: string;
  updated_at: string;
}

interface Class {
  id: string;
  name: string;
  grade: string;
  school_id: string;
  student_count: number;
}

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

const relationshipOptions = [
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' }
];

const enrollmentStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'transferred', label: 'Transferred' }
];

const StudentsList = ({ schoolId, schoolName }: { schoolId: string; schoolName: string }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const { data: classesData, error: classesError } = await supabase
          .from("classes")
          .select("*")
          .eq("school_id", schoolId);

        if (classesError) throw classesError;

        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("*")
          .eq("school_id", schoolId);

        if (studentsError) throw studentsError;

        setClasses(classesData || []);
        setStudents(studentsData || []);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [schoolId]);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.parent_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === "All Classes" || student.class_id === selectedClass;
    return matchesSearch && matchesClass;
  });

  const validateStudentData = async (studentData: Student, currentStudentId: string | null = null) => {
    const errors: FormErrors = {};
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentData.email)) {
      errors.email = "Please enter a valid email address";
    } else {
      const { data: emailCheck } = await supabase
        .from("students")
        .select("id, email")
        .eq("email", studentData.email)
        .single();
        
      if (emailCheck && emailCheck.id !== currentStudentId) {
        errors.email = "This email is already being used by another student";
      }
    }

    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (studentData.parent_phone && !phoneRegex.test(studentData.parent_phone)) {
      errors.parent_phone = "Please enter a valid phone number";
    }

    if (studentData.emergency_contact_phone && !phoneRegex.test(studentData.emergency_contact_phone)) {
      errors.emergency_contact_phone = "Please enter a valid emergency contact phone number";
    }

    return errors;
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editFormData) return;

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const validationErrors = await validateStudentData(editFormData, editFormData.id);
      
      if (Object.keys(validationErrors).length > 0) {
        setFormErrors(validationErrors);
        return;
      }

      const { error } = await supabase
        .from("students")
        .update(editFormData)
        .eq("id", editFormData.id);

      if (error) throw error;

      setStudents(students.map(student => 
        student.id === editFormData.id ? editFormData : student
      ));
      setIsEditing(false);
      setSelectedStudent(editFormData);
      setEditFormData(null);
    } catch (error) {
      setFormErrors({ submit: error instanceof Error ? error.message : 'An unknown error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

// Enhanced validation utility functions
const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone: string): boolean => {
  const re = /^\+?[\d\s-]{10,}$/;
  return re.test(phone);
};

const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

// Enhanced addStudent function with validation and logging
const addStudent = async (newStudent: Omit<Student, 'id'>, schoolName: string) => {
  setIsSubmitting(true);
  setFormErrors({});

  try {
    console.log('[DEBUG] Starting student creation process');
    console.log('[DEBUG] Student data:', JSON.stringify(newStudent, null, 2));

    // Validate required fields
    const errors: FormErrors = {};
    
    if (!validateRequired(newStudent.first_name)) {
      errors.first_name = 'First name is required';
    }

    if (!validateRequired(newStudent.last_name)) {
      errors.last_name = 'Last name is required';
    }

    if (!validateRequired(newStudent.email)) {
      errors.email = 'Email is required';
    } else if (!validateEmail(newStudent.email)) {
      errors.email = 'Invalid email format';
    }

    if (!validateRequired(newStudent.parent_name)) {
      errors.parent_name = 'Parent name is required';
    }

    if (!validateRequired(newStudent.parent_phone)) {
      errors.parent_phone = 'Parent phone is required';
    } else if (!validatePhone(newStudent.parent_phone)) {
      errors.parent_phone = 'Invalid phone number format';
    }

    if (!validateRequired(newStudent.address)) {
      errors.address = 'Address is required';
    }

    if (!validateRequired(newStudent.class_id)) {
      errors.class_id = 'Class selection is required';
    }

    if (newStudent.emergency_contact_phone && !validatePhone(newStudent.emergency_contact_phone)) {
      errors.emergency_contact_phone = 'Invalid emergency contact phone format';
    }

    if (Object.keys(errors).length > 0) {
      console.warn('[VALIDATION] Form errors:', errors);
      setFormErrors(errors);
      return;
    }

    console.log('[DEBUG] Validation passed, creating auth user...');

    // Create auth user
    const password = generatePassword();
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: newStudent.email,
      password: password,
      options: {
        data: {
          role: 'student',
          first_name: newStudent.first_name,
          last_name: newStudent.last_name
        },
      },
    });

    if (authError) {
      console.error('[AUTH] Error creating user:', authError);
      throw new Error(`User creation failed: ${authError.message}`);
    }

    if (!user) {
      console.error('[AUTH] No user returned after signup');
      throw new Error('User creation failed - no user object returned');
    }

    console.log('[DEBUG] Auth user created, ID:', user.id);
    console.log('[DEBUG] Creating student record in database...');

    // Create student record
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert([{
        ...newStudent,
        user_id: user.id,
        school_id: schoolId,
        join_date: newStudent.join_date || new Date().toISOString(),
        enrollment_status: 'active',
      }])
      .select()
      .single();

    if (studentError) {
      console.error('[DB] Error creating student record:', studentError);
      throw new Error(`Database error: ${studentError.message}`);
    }

    console.log('[DEBUG] Student record created, sending welcome email...');

    // Send welcome email
    try {
      await sendEmail(
        newStudent.email,
        `${newStudent.first_name} ${newStudent.last_name}`,
        schoolName,
        password,
        'https://yourdomain.com/login',
        'noreply@yourschool.com',
        'School Administration'
      );
      console.log('[DEBUG] Welcome email sent successfully');
    } catch (emailError) {
      console.error('[EMAIL] Error sending welcome email:', emailError);
      // Don't fail the whole operation if email fails
    }

    // Update local state
    setStudents([...students, studentData]);
    setShowAddModal(false);
    
    console.log('[DEBUG] Student creation process completed successfully');

  } catch (error) {
    console.error('[ERROR] Full error details:', error);
    
    let errorMessage = 'Failed to create student';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific Supabase errors
      if (error.message.includes('duplicate key value')) {
        errorMessage = 'A student with this email already exists';
      } else if (error.message.includes('violates foreign key constraint')) {
        errorMessage = 'Invalid class selected';
      }
    }
    
    setFormErrors({ submit: errorMessage });
  } finally {
    setIsSubmitting(false);
  }
};

// Updated form submission handler
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  
  // Validate form
  const errors: FormErrors = {};
  
  if (!formData.get('first_name')) errors.first_name = 'First name is required';
  if (!formData.get('last_name')) errors.last_name = 'Last name is required';
  
  if (!formData.get('email')) {
    errors.email = 'Email is required';
  } else if (!validateEmail(formData.get('email') as string)) {
    errors.email = 'Invalid email format';
  }
  
  if (!formData.get('parent_name')) errors.parent_name = 'Parent name is required';
  
  if (!formData.get('parent_phone')) {
    errors.parent_phone = 'Parent phone is required';
  } else if (!validatePhone(formData.get('parent_phone') as string)) {
    errors.parent_phone = 'Invalid phone format';
  }
  
  if (!formData.get('address')) errors.address = 'Address is required';

  if (!formData.get('class_id')) errors.class_id = 'Class is required';
  
  if (formData.get('emergency_contact_phone') && 
      !validatePhone(formData.get('emergency_contact_phone') as string)) {
    errors.emergency_contact_phone = 'Invalid phone format';
  }

  if (Object.keys(errors).length > 0) {
    setFormErrors(errors);
    return;
  }

  // Proceed with form submission
  const newStudent: Omit<Student, 'id'> = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: formData.get('email') as string,
    gender: formData.get('gender') as string || undefined,
    date_of_birth: formData.get('date_of_birth') as string || undefined,
    class_id: formData.get('class_id') as string,
    parent_name: formData.get('parent_name') as string,
    parent_email: formData.get('parent_email') as string || undefined,
    parent_phone: formData.get('parent_phone') as string,
    parent_relationship: formData.get('parent_relationship') as string || undefined,
    emergency_contact_name: formData.get('emergency_contact_name') as string || undefined,
    emergency_contact_phone: formData.get('emergency_contact_phone') as string || undefined,
    address: formData.get('address') as string,
    city: formData.get('city') as string || undefined,
    state: formData.get('state') as string || undefined,
    postal_code: formData.get('postal_code') as string || undefined,
    country: formData.get('country') as string || undefined,
    join_date: formData.get('join_date') as string || new Date().toISOString(),
    school_id: schoolId,
    medical_notes: formData.get('medical_notes') as string || undefined,
    allergies: formData.get('allergies') as string || undefined,
    previous_school: formData.get('previous_school') as string || undefined,
    enrollment_status: 'active',
    user_id: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await addStudent(newStudent, schoolName);
};

// In your form component, add error displays for each field
{formErrors.first_name && (
  <p className="text-red-500 text-sm mt-1">{formErrors.first_name}</p>
)}
  const startEditing = (student: Student) => {
    setIsEditing(true);
    setEditFormData(student);
    setActiveTab('basic');
  };

  const deleteStudent = async (studentId: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

      if (error) throw error;

      setStudents(students.filter(student => student.id !== studentId));
      setSelectedStudent(null);
      setStudentToDelete(null);
    } catch (error: any) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStudentDetails = () => {
    if (!selectedStudent) return null;

    return (
      <div className="space-y-5">
        <div className="flex border-b space-x-2 bg-gray-100 rounded-t-lg">
          <button
            className={`px-6 py-3 font-medium transition-colors duration-200 ${
              activeTab === 'basic'
                ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                : 'text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Info
          </button>
          <button
            className={`px-6 py-3 font-medium transition-colors duration-200 ${
              activeTab === 'contact'
                ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                : 'text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('contact')}
          >
            Contact Info
          </button>
          <button
            className={`px-6 py-3 font-medium transition-colors duration-200 ${
              activeTab === 'medical'
                ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                : 'text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('medical')}
          >
            Medical Info
          </button>
          <button
            className={`px-6 py-3 font-medium transition-colors duration-200 ${
              activeTab === 'academic'
                ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                : 'text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('academic')}
          >
            Academic Info
          </button>
        </div>

        {activeTab === 'basic' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">First Name</p>
              <p className="font-medium">{selectedStudent.first_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Last Name</p>
              <p className="font-medium">{selectedStudent.last_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                {selectedStudent.email}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Gender</p>
              <p className="font-medium">
                {genderOptions.find(g => g.value === selectedStudent.gender)?.label || 'Not specified'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                {selectedStudent.date_of_birth ? new Date(selectedStudent.date_of_birth).toLocaleDateString() : 'Not specified'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Enrollment Status</p>
              <p className="font-medium">
                {enrollmentStatusOptions.find(s => s.value === selectedStudent.enrollment_status)?.label || 'Active'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Parent Name</p>
              <p className="font-medium">{selectedStudent.parent_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Relationship</p>
              <p className="font-medium">
                {relationshipOptions.find(r => r.value === selectedStudent.parent_relationship)?.label || 'Not specified'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Parent Email</p>
              <p className="font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                {selectedStudent.parent_email || 'Not specified'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Parent Phone</p>
              <p className="font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                {selectedStudent.parent_phone}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Emergency Contact</p>
              <p className="font-medium">{selectedStudent.emergency_contact_name || 'Not specified'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Emergency Phone</p>
              <p className="font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                {selectedStudent.emergency_contact_phone || 'Not specified'}
              </p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                {selectedStudent.address}
              </p>
              {selectedStudent.city && selectedStudent.state && (
                <p className="font-medium mt-1">
                  {selectedStudent.city}, {selectedStudent.state} {selectedStudent.postal_code}
                </p>
              )}
              {selectedStudent.country && (
                <p className="font-medium">{selectedStudent.country}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'medical' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1 md:col-span-2">
              <p className="text-sm text-gray-500">Allergies</p>
              <p className="font-medium flex items-start gap-2">
                <HeartPulseIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                {selectedStudent.allergies || 'No known allergies'}
              </p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-sm text-gray-500">Medical Notes</p>
              <p className="font-medium flex items-start gap-2">
                <HeartPulse className="w-4 h-4 text-gray-400 mt-0.5" />
                {selectedStudent.medical_notes || 'No medical notes'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'academic' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Class</p>
              <p className="font-medium flex items-center gap-2">
                <Book className="w-4 h-4 text-gray-400" />
                {classes.find(cls => cls.id === selectedStudent.class_id)?.name || 'Unknown Class'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Join Date</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                {new Date(selectedStudent.join_date).toLocaleDateString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Previous School</p>
              <p className="font-medium">
                {selectedStudent.previous_school || 'Not specified'}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading students...</span>
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Students</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 w-full md:w-auto justify-center"
          disabled={isSubmitting}
        >
          <Plus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 w-4 h-4" />
          <input
            type="text"
            placeholder="Search students..."
            className="w-full pl-10 bg-gray-200 pr-4 py-2 border-2 border-zinc-950 rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="bg-gray-200 rounded-lg px-4 py-2"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="All Classes">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No students found. Add a new student to get started.
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-5 gap-4 p-4 bg-gray-100 rounded-lg font-medium">
              <div>Name</div>
              <div>Class</div>
              <div>Parent Name</div>
              <div>Parent Email</div>
              <div className="text-right">Action</div>
            </div>
            
            <div className="divide-y">
              {filteredStudents.map((student) => (
                <div key={student.id} className="p-4">
                  <div className="md:grid md:grid-cols-5 md:gap-4 space-y-2 md:space-y-0">
                    <div className="font-medium">{student.first_name} {student.last_name}</div>
                    <div className="text-gray-600">
                      <span className="md:hidden">Class: </span>
                      {classes.find(cls => cls.id === student.class_id)?.name || 'Unknown Class'}
                    </div>
                    <div className="text-gray-600">
                      <span className="md:hidden">Parent Name: </span>
                      {student.parent_name}
                    </div>
                    <div className="text-gray-600">
                      <span className="md:hidden">Parent Email: </span>
                      {student.parent_email}
                    </div>
                    <div className="text-right flex gap-2 justify-end">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="text-black bg-gray-300 hover:text-blue-600 px-2 py-1 rounded"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => setStudentToDelete(student)}
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

      <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {studentToDelete?.first_name}'s record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => studentToDelete && deleteStudent(studentToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Student Details</h2>
                <div className="flex gap-2">
                  {!isEditing && (
                    <button
                      onClick={() => startEditing(selectedStudent)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      disabled={isSubmitting}
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedStudent(null);
                      setIsEditing(false);
                      setEditFormData(null);
                      setActiveTab('basic');
                    }}
                    className="text-white bg-red-500 hover:text-gray-700 rounded-full p-1 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <form onSubmit={handleEditSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">First Name *</label>
                      <input
                        type="text"
                        placeholder="First Name"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.first_name || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, first_name: e.target.value} : null)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Last Name *</label>
                      <input
                        type="text"
                        placeholder="Last Name"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.last_name || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, last_name: e.target.value} : null)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Email *</label>
                      <input
                        type="email"
                        placeholder="Email"
                        className={`w-full p-3 rounded-lg bg-white border ${
                          formErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        } transition-all`}
                        value={editFormData?.email || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, email: e.target.value} : null)}
                        required
                        disabled={isSubmitting}
                      />
                      {formErrors.email && (
                        <p className="text-red-500 text-sm">{formErrors.email}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Gender</label>
                      <select
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.gender || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, gender: e.target.value} : null)}
                        disabled={isSubmitting}
                      >
                        <option value="">Select Gender</option>
                        {genderOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Date of Birth</label>
                      <input
                        type="date"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.date_of_birth || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, date_of_birth: e.target.value} : null)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Enrollment Status</label>
                      <select
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.enrollment_status || 'active'}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, enrollment_status: e.target.value} : null)}
                        disabled={isSubmitting}
                      >
                        {enrollmentStatusOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Parent Name *</label>
                      <input
                        type="text"
                        placeholder="Parent Name"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.parent_name || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, parent_name: e.target.value} : null)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Relationship</label>
                      <select
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.parent_relationship || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, parent_relationship: e.target.value} : null)}
                        disabled={isSubmitting}
                      >
                        <option value="">Select Relationship</option>
                        {relationshipOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Parent Email</label>
                      <input
                        type="email"
                        placeholder="Parent Email"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.parent_email || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, parent_email: e.target.value} : null)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Parent Phone *</label>
                      <input
                        type="tel"
                        placeholder="Parent Phone"
                        className={`w-full p-3 rounded-lg bg-white border ${
                          formErrors.parent_phone ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        } transition-all`}
                        value={editFormData?.parent_phone || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, parent_phone: e.target.value} : null)}
                        required
                        disabled={isSubmitting}
                      />
                      {formErrors.parent_phone && (
                        <p className="text-red-500 text-sm">{formErrors.parent_phone}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Emergency Contact</label>
                      <input
                        type="text"
                        placeholder="Emergency Contact Name"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.emergency_contact_name || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, emergency_contact_name: e.target.value} : null)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Emergency Phone</label>
                      <input
                        type="tel"
                        placeholder="Emergency Contact Phone"
                        className={`w-full p-3 rounded-lg bg-white border ${
                          formErrors.emergency_contact_phone ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        } transition-all`}
                        value={editFormData?.emergency_contact_phone || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, emergency_contact_phone: e.target.value} : null)}
                        disabled={isSubmitting}
                      />
                      {formErrors.emergency_contact_phone && (
                        <p className="text-red-500 text-sm">{formErrors.emergency_contact_phone}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Address *</label>
                      <input
                        type="text"
                        placeholder="Address"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.address || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, address: e.target.value} : null)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">City</label>
                      <input
                        type="text"
                        placeholder="City"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.city || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, city: e.target.value} : null)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">State/Province</label>
                      <input
                        type="text"
                        placeholder="State/Province"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.state || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, state: e.target.value} : null)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Postal Code</label>
                      <input
                        type="text"
                        placeholder="Postal Code"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.postal_code || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, postal_code: e.target.value} : null)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Country</label>
                      <input
                        type="text"
                        placeholder="Country"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.country || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, country: e.target.value} : null)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-sm text-gray-500">Allergies</label>
                      <textarea
                        placeholder="List any allergies the student has"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-h-[100px]"
                        value={editFormData?.allergies || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, allergies: e.target.value} : null)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-sm text-gray-500">Medical Notes</label>
                      <textarea
                        placeholder="Any important medical information"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-h-[100px]"
                        value={editFormData?.medical_notes || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, medical_notes: e.target.value} : null)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Class *</label>
                      <select 
                        name="class_id"
                        required
                        className={`w-full p-3 bg-white rounded-lg border ${
                          formErrors.class_id ? 'border-red-500' : 'border-gray-300'
                        } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
                        disabled={isSubmitting}
                        onChange={() => {
                          // Clear class error when user selects something
                          if (formErrors.class_id) {
                            setFormErrors({...formErrors, class_id: undefined});
                          }
                        }}
                      >
                        <option value="">Select Class</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.class_id && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.class_id}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Join Date *</label>
                      <input
                        type="date"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.join_date || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, join_date: e.target.value} : null)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Previous School</label>
                      <input
                        type="text"
                        placeholder="Previous School"
                        className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={editFormData?.previous_school || ''}
                        onChange={(e) => setEditFormData(editFormData ? {...editFormData, previous_school: e.target.value} : null)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  {formErrors.submit && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {formErrors.submit}
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      className="px-6 py-2.5 rounded-lg border border-gray-300 text-white font-medium bg-red-500 hover:bg-red-600 transition-colors"
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
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
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
              ) : renderStudentDetails()}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Add New Student</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-white hover:text-gray-700 rounded-full p-1 hover:bg-gray-100 bg-red-500 transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form
                className="space-y-5"
                onSubmit={(e) => handleSubmit(e)}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">First Name *</label>
                    <input
                      type="text"
                      name="first_name"
                      placeholder="First Name"
                      required
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Last Name *</label>
                    <input
                      type="text"
                      name="last_name"
                      placeholder="Last Name"
                      required
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Email *</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      required
                      className={`w-full p-3 rounded-lg bg-white border ${
                        formErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      } transition-all`}
                      disabled={isSubmitting}
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-sm">{formErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Gender</label>
                    <select
                      name="gender"
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    >
                      <option value="">Select Gender</option>
                      {genderOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Date of Birth</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Parent Name *</label>
                    <input
                      type="text"
                      name="parent_name"
                      placeholder="Parent Name"
                      required
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Relationship</label>
                    <select
                      name="parent_relationship"
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    >
                      <option value="">Select Relationship</option>
                      {relationshipOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Parent Email</label>
                    <input
                      type="email"
                      name="parent_email"
                      placeholder="Parent Email"
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Parent Phone *</label>
                    <input
                      type="tel"
                      name="parent_phone"
                      placeholder="Parent Phone"
                      required
                      className={`w-full p-3 rounded-lg bg-white border ${
                        formErrors.parent_phone ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      } transition-all`}
                      disabled={isSubmitting}
                    />
                    {formErrors.parent_phone && (
                      <p className="text-red-500 text-sm">{formErrors.parent_phone}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Emergency Contact</label>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      placeholder="Emergency Contact Name"
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Emergency Phone</label>
                    <input
                      type="tel"
                      name="emergency_contact_phone"
                      placeholder="Emergency Contact Phone"
                      className={`w-full p-3 rounded-lg bg-white border ${
                        formErrors.emergency_contact_phone ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      } transition-all`}
                      disabled={isSubmitting}
                    />
                    {formErrors.emergency_contact_phone && (
                      <p className="text-red-500 text-sm">{formErrors.emergency_contact_phone}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Address *</label>
                    <input
                      type="text"
                      name="address"
                      placeholder="Address"
                      required
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">City</label>
                    <input
                      type="text"
                      name="city"
                      placeholder="City"
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">State/Province</label>
                    <input
                      type="text"
                      name="state"
                      placeholder="State/Province"
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Postal Code</label>
                    <input
                      type="text"
                      name="postal_code"
                      placeholder="Postal Code"
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Country</label>
                    <input
                      type="text"
                      name="country"
                      placeholder="Country"
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm text-gray-500">Allergies</label>
                    <textarea
                      name="allergies"
                      placeholder="List any allergies the student has"
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-h-[100px]"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm text-gray-500">Medical Notes</label>
                    <textarea
                      name="medical_notes"
                      placeholder="Any important medical information"
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-h-[100px]"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Class *</label>
                    <select 
                      name="class_id"
                      required
                      className={`w-full p-3 bg-white rounded-lg border ${
                        formErrors.class_id ? 'border-red-500' : 'border-gray-300'
                      } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
                      disabled={isSubmitting}
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Join Date *</label>
                    <input
                      type="date"
                      name="join_date"
                      required
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500">Previous School</label>
                    <input
                      type="text"
                      name="previous_school"
                      placeholder="Previous School"
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                {formErrors.submit && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {formErrors.submit}
                  </div>
                )}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-white font-medium bg-red-500 hover:bg-red-600 transition-colors"
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </div>
                    ) : (
                      'Add Student'
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

export default StudentsList;