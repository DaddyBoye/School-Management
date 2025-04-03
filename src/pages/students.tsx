import { useState, useEffect } from 'react';
import { supabase } from "../supabase";
import { sendEmail } from '../services/emailService';
import { generatePassword } from '../services/passwordGenerator';
import { Search, Plus, X, Edit2, Mail, Phone, Book, Calendar, MapPin, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/Components/ui/alert-dialog";

interface FormErrors {
  email?: string;
  phone?: string;
  submit?: string;
}

interface Student {
  id: string; // UUID
  user_id: string; // UUID (references auth.users)
  first_name: string; // Student's first name
  last_name: string; // Student's last name
  email: string; // Student's email (unique)
  class_id: string; // Foreign key referencing the classes table
  parent_name: string; // Parent's name
  parent_email: string; // Parent's email
  parent_phone: string; // Parent's phone number
  address: string; // Student's address
  joinDate: string; // Date the student joined (in ISO format, e.g., "2023-10-01")
  school_id: string; // UUID (references schools)
  created_at: string; // Timestamp for record creation
  updated_at: string; // Timestamp for record updates
}

interface Class {
  id: string; // UUID
  name: string; // Class name (e.g., "Class 1A")
  grade: string; // Grade (e.g., "1st Grade")
  school_id: string; // Foreign key referencing the schools table
  student_count: number; // Number of students in the class
}

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

  // Fetch classes and students for the specific school
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch classes for the specific school
        const { data: classesData, error: classesError } = await supabase
          .from("classes")
          .select("*")
          .eq("school_id", schoolId);

        if (classesError) throw classesError;

        setClasses(classesData || []);

        // Fetch students for the specific school
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("*")
          .eq("school_id", schoolId);

        if (studentsError) throw studentsError;

        setStudents(studentsData || []);
      } catch (error) {
        if (error instanceof Error) {
          setError(`Failed to fetch data: ${error.message}`);
        } else {
          setError('Failed to fetch data');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [schoolId]);

  // Filter students based on search term and selected class
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === "All Classes" || student.class_id === selectedClass;
    return matchesSearch && matchesClass;
  });

  const validateStudentData = async (studentData: Student, currentStudentId: string | null = null) => {
    const errors: FormErrors = {};
    
    // Check for existing email
    const { data: emailCheck } = await supabase
      .from("students")
      .select("id, email")
      .eq("email", studentData.email)
      .single();
      
    if (emailCheck && emailCheck.id !== currentStudentId) {
      errors.email = "This email is already being used by another student";
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

      setStudents((students) =>
        students.map((student) =>
          student.id === editFormData.id ? editFormData : student
        )
      );
      setIsEditing(false);
      setSelectedStudent(editFormData);
      setEditFormData(null);
    } catch (error) {
      if (error instanceof Error) {
        setFormErrors({ submit: (error as Error).message });
      } else {
        setFormErrors({ submit: 'An unknown error occurred' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const addStudent = async (newStudent: Omit<Student, 'id'>, schoolName: string) => {
    setIsSubmitting(true);
    setFormErrors({});
  
    console.log("Starting addStudent function...");
    console.log("New Student Data:", newStudent);
  
    try {
      const password = generatePassword(); // Generate a 6-digit password
  
      const { data: { user }, error: authError } = await supabase.auth.signUp({
        email: newStudent.email,
        password: password,
        options: {
          data: {
            role: 'student',
          },
        },
      });
  
      if (authError) {
        console.error("Error creating user in auth.users:", authError);
        if (authError.message.includes('50 seconds')) {
          setFormErrors({ submit: 'Please wait 50 seconds before trying again.' });
        } else {
          setFormErrors({ submit: authError.message });
        }
        throw authError;
      }
  
      if (!user) {
        console.error("User creation failed. No user object returned.");
        throw new Error("Failed to create user in auth.users table.");
      }
  
      console.log("User created successfully. User ID:", user.id);
  
      // Step 2: Add the student to the students table
      console.log("Inserting student into students table...");
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .insert([{ 
          ...newStudent,
          user_id: user.id, // Link to the auth user
          school_id: schoolId, // Associate with the specific school
        }])
        .select()
        .single();
  
      if (studentError) {
        console.error("Error inserting student into students table:", studentError);
        throw studentError;
      }
  
      console.log("Student added successfully:", studentData);
  
      // Step 3: Send welcome email
      console.log('Attempting to send email to:', newStudent.email);
      await sendEmail(
        newStudent.email,
        `${newStudent.first_name} ${newStudent.last_name}`,
        schoolName,
        password,
        'https://esemes.vercel.app/',
        'gabrieladjeiboye@gmail.com',
        'Gabriel Adjei-Boye'
      );
      console.log('Email sent successfully.');
  
      setStudents([...students, studentData]);
      setShowAddModal(false);
    } catch (error) {
      console.error("Error in addStudent function:", error);
  
      if (error instanceof Error) {
        setFormErrors({ submit: error.message });
      } else {
        setFormErrors({ submit: "An unknown error occurred." });
      }
    } finally {
      console.log("addStudent function completed.");
      setIsSubmitting(false);
    }
  };
  
  const startEditing = (student: Student) => {
    setIsEditing(true);
    setEditFormData(student);
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

      {/* Header */}
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

      {/* Filters */}
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

      {/* Students List */}
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

      {/* Delete Confirmation Dialog */}
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

{/* Student Details Modal */}
{selectedStudent && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl">
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
                <input
                  type="text"
                  placeholder="First Name"
                  className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  value={editFormData?.first_name || ''}
                  onChange={(e) => setEditFormData(editFormData ? {...editFormData, first_name: e.target.value} : null)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Last Name"
                  className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  value={editFormData?.last_name || ''}
                  onChange={(e) => setEditFormData(editFormData ? {...editFormData, last_name: e.target.value} : null)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1">
                <input
                  type="email"
                  placeholder="Email"
                  className={`w-full p-3 rounded-lg bg-white border ${
                    formErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                  } transition-all`}
                  value={editFormData?.email || ''}
                  onChange={(e) => setEditFormData(editFormData ? {...editFormData, email: e.target.value} : null)}
                  disabled={isSubmitting}
                />
                {formErrors.email && (
                  <p className="text-red-500 text-sm">{formErrors.email}</p>
                )}
              </div>
              <div className="space-y-1">
                <input
                  type="tel"
                  placeholder="Parent Phone"
                  className={`w-full p-3 rounded-lg bg-white border ${
                    formErrors.phone ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                  } transition-all`}
                  value={editFormData?.parent_phone || ''}
                  onChange={(e) => setEditFormData(editFormData ? {...editFormData, parent_phone: e.target.value} : null)}
                  disabled={isSubmitting}
                />
                {formErrors.phone && (
                  <p className="text-red-500 text-sm">{formErrors.phone}</p>
                )}
              </div>
              <div className="space-y-1">
                <select
                  className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  value={editFormData?.class_id || ''}
                  onChange={(e) => setEditFormData(editFormData ? {...editFormData, class_id: e.target.value} : null)}
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
                <input
                  type="text"
                  placeholder="Parent Name"
                  className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  value={editFormData?.parent_name || ''}
                  onChange={(e) => setEditFormData(editFormData ? {...editFormData, parent_name: e.target.value} : null)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1">
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
                <input
                  type="date"
                  placeholder="Join Date"
                  className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  value={editFormData?.joinDate || ''}
                  onChange={(e) => setEditFormData(editFormData ? {...editFormData, joinDate: e.target.value} : null)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <input
                  type="text"
                  placeholder="Address"
                  className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  value={editFormData?.address || ''}
                  onChange={(e) => setEditFormData(editFormData ? {...editFormData, address: e.target.value} : null)}
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
        ) : (
          <div className="space-y-5">
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
                <p className="text-sm text-gray-500">Class</p>
                <p className="font-medium flex items-center gap-2">
                  <Book className="w-4 h-4 text-gray-400" />
                  {classes.find(cls => cls.id === selectedStudent.class_id)?.name || 'Unknown Class'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Parent Name</p>
                <p className="font-medium">{selectedStudent.parent_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Parent Email</p>
                <p className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {selectedStudent.parent_email}
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
                <p className="text-sm text-gray-500">Join Date</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {new Date(selectedStudent.joinDate).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {selectedStudent.address}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}
{/* Add Student Modal */}
{showAddModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl">
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
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const newStudent: Omit<Student, 'id'> = {
              first_name: formData.get("first_name") as string,
              last_name: formData.get("last_name") as string,
              email: formData.get("email") as string,
              parent_phone: formData.get("parent_phone") as string,
              class_id: formData.get("class") as string,
              parent_name: formData.get("parent_name") as string,
              parent_email: formData.get("parent_email") as string,
              address: formData.get("address") as string,
              joinDate: formData.get("joinDate") as string,
              user_id: "",
              school_id: schoolId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            await addStudent(newStudent, schoolName);
          }}
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
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
              <input
                type="tel"
                name="parent_phone"
                placeholder="Parent Phone"
                required
                className={`w-full p-3 rounded-lg bg-white border ${
                  formErrors.phone ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                } transition-all`}
                disabled={isSubmitting}
              />
              {formErrors.phone && (
                <p className="text-red-500 text-sm">{formErrors.phone}</p>
              )}
            </div>
            <div className="space-y-1">
              <select 
                name="class" 
                required
                className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
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
              <input
                type="email"
                name="parent_email"
                placeholder="Parent Email"
                required
                className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <input
                type="date"
                name="joinDate"
                placeholder="Join Date"
                required
                className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <input
                type="text"
                name="address"
                placeholder="Address"
                required
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