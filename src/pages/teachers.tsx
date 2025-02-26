import { useState, useEffect } from 'react';
import { supabase } from "../supabase";
import { sendEmail } from '../services/emailService';
import { generatePassword } from '../services/passwordGenerator';
import { Search, Plus, X, Edit2, Mail, Phone, Book, Calendar, MapPin, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/Components/ui/alert-dialog";

interface Teacher {
  id: string; // UUID
  user_id: string; // UUID (references auth.users)
  first_name: string; // Teacher's first name
  last_name: string; // Teacher's last name
  email: string; // Teacher's email (unique)
  class: string; // Class or grade the teacher is assigned to
  subject: string; // Subject the teacher teaches
  education: string; // Teacher's educational background
  experience: string; // Teacher's experience
  address: string; // Teacher's address
  phone: string; // Teacher's phone number
  joinDate: string; // Date the teacher joined (in ISO format, e.g., "2023-10-01")
  school_id: string; // UUID (references schools)
  created_at: string; // Timestamp for record creation
  updated_at: string; // Timestamp for record updates
}

interface FormErrors {
  email?: string;
  phone?: string;
  submit?: string;
}

const TeachersList = ({ schoolId, schoolName }: { schoolId: string; schoolName: string }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
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

  useEffect(() => {
    fetchTeachers();
  }, [schoolId]);

  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("school_id", schoolId); // Fetch teachers for the specific school

      if (error) throw error;

      setTeachers(data || []);
    } catch (error) {
      if (error instanceof Error) {
        setError(`Failed to fetch teachers: ${error.message}`);
      } else {
        setError('Failed to fetch teachers');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          teacher.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === "All Classes" || teacher.class === selectedClass;
    const matchesSubject = selectedSubject === "All Subjects" || teacher.subject === selectedSubject;
    return matchesSearch && matchesClass && matchesSubject;
  });

  const validateTeacherData = async (teacherData: Teacher, currentTeacherId: string | null = null) => {
    const errors: FormErrors = {};
    
    // Check for existing email
    const { data: emailCheck } = await supabase
      .from("teachers")
      .select("id, email")
      .eq("email", teacherData.email)
      .single();
      
    if (emailCheck && emailCheck.id !== currentTeacherId) {
      errors.email = "This email is already being used by another teacher";
    }

    return errors;
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editFormData) return;

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const validationErrors = await validateTeacherData(editFormData, editFormData.id);
      
      if (Object.keys(validationErrors).length > 0) {
        setFormErrors(validationErrors);
        return;
      }

      const { error } = await supabase
        .from("teachers")
        .update(editFormData)
        .eq("id", editFormData.id);

      if (error) throw error;

      setTeachers((teachers) =>
        teachers.map((teacher) =>
          teacher.id === editFormData.id ? editFormData : teacher
        )
      );
      setIsEditing(false);
      setSelectedTeacher(editFormData);
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

  const addTeacher = async (newTeacher: Omit<Teacher, 'id'>, schoolName: string) => {
    setIsSubmitting(true);
    setFormErrors({});
  
    console.log("Starting addTeacher function...");
    console.log("New Teacher Data:", newTeacher);
  
    try {
      const password = generatePassword(); // Generate a 6-digit password
      console.log('Generated Password:', password);
  
      // Step 1: Create a user in the auth.users table
      console.log("Creating new user in auth.users...");
      const { data: { user }, error: authError } = await supabase.auth.signUp({
        email: newTeacher.email,
        password: password,
        options: {
          data: {
            role: 'teacher',
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
  
      // Step 2: Add the teacher to the teachers table
      console.log("Inserting teacher into teachers table...");
      const { data: teacherData, error: teacherError } = await supabase
        .from("teachers")
        .insert([{ 
          ...newTeacher,
          user_id: user.id, // Link to the auth user
          school_id: schoolId, // Associate with the specific school
        }])
        .select()
        .single();
  
      if (teacherError) {
        console.error("Error inserting teacher into teachers table:", teacherError);
        throw teacherError;
      }
  
      console.log("Teacher added successfully:", teacherData);
  
      // Step 3: Send welcome email
      console.log('Attempting to send email to:', newTeacher.email);
      await sendEmail(
        newTeacher.email,
        `${newTeacher.first_name} ${newTeacher.last_name}`,
        schoolName,
        password,
        'https://esemes.vercel.app/auth',
        'gabrieladjeiboye@gmail.com',
        'Gabriel Adjei-Boye'
      );
      console.log('Email sent successfully.');
  
      setTeachers([...teachers, teacherData]);
      setShowAddModal(false);
    } catch (error) {
      console.error("Error in addTeacher function:", error);
  
      if (error instanceof Error) {
        setFormErrors({ submit: error.message });
      } else {
        setFormErrors({ submit: "An unknown error occurred." });
      }
    } finally {
      console.log("addTeacher function completed.");
      setIsSubmitting(false);
    }
  };
  
  const startEditing = (teacher: Teacher) => {
    setIsEditing(true);
    setEditFormData(teacher);
  };

  const deleteTeacher = async (teacherId: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", teacherId);

      if (error) throw error;

      setTeachers(teachers.filter(teacher => teacher.id !== teacherId));
      setSelectedTeacher(null);
      setTeacherToDelete(null);
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
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="All Classes">All Classes</option>
          <option value="Grade 5">Grade 5</option>
          <option value="Grade 6">Grade 6</option>
        </select>
        <select
          className="bg-gray-200 rounded-lg px-4 py-2"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          <option value="All Subjects">All Subjects</option>
          <option value="English">English</option>
          <option value="Math">Math</option>
          <option value="Science">Science</option>
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
                      {teacher.class}
                    </div>
                    <div className="text-gray-600">
                      <span className="md:hidden">Subject: </span>
                      {teacher.subject}
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
                      <p className="text-gray-500">{selectedTeacher.subject} Teacher</p>
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
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="First Name"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData?.first_name || ''}
                      onChange={(e) => setEditFormData(editFormData ? {...editFormData, first_name: e.target.value} : null)}
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData?.last_name || ''}
                      onChange={(e) => setEditFormData(editFormData ? {...editFormData, last_name: e.target.value} : null)}
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                        formErrors.email ? 'border-red-500' : ''
                      }`}
                      value={editFormData?.email || ''}
                      onChange={(e) => setEditFormData(editFormData ? {...editFormData, email: e.target.value} : null)}
                      disabled={isSubmitting}
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                    )}

                    <input
                      type="tel"
                      placeholder="Phone"
                      className={`border bg-gray-300 rounded-lg px-4 py-2 ${
                        formErrors.phone ? 'border-red-500' : ''
                      }`}
                      value={editFormData?.phone || ''}
                      onChange={(e) => setEditFormData(editFormData ? {...editFormData, phone: e.target.value} : null)}
                      disabled={isSubmitting}
                    />
                    {formErrors.phone && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                    )}
                    <select
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData?.class || ''}
                      onChange={(e) => setEditFormData(editFormData ? {...editFormData, class: e.target.value} : null)}
                      disabled={isSubmitting}
                    >
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                    </select>
                    <select
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData?.subject || ''}
                      onChange={(e) => setEditFormData(editFormData ? {...editFormData, subject: e.target.value} : null)}
                      disabled={isSubmitting}
                    >
                      <option value="English">English</option>
                      <option value="Math">Math</option>
                      <option value="Science">Science</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Education"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData?.education || ''}
                      onChange={(e) => setEditFormData(editFormData ? {...editFormData, education: e.target.value} : null)}
                      disabled={isSubmitting}
                    />
                    <input
                      type="text"
                      placeholder="Experience"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData?.experience || ''}
                      onChange={(e) => setEditFormData(editFormData ? {...editFormData, experience: e.target.value} : null)}
                      disabled={isSubmitting}
                    />
                    <input
                      type="text"
                      placeholder="Address"
                      className="border bg-gray-300 rounded-lg px-4 py-2 md:col-span-2"
                      value={editFormData?.address || ''}
                      onChange={(e) => setEditFormData(editFormData ? {...editFormData, address: e.target.value} : null)}
                      disabled={isSubmitting}
                    />
                  </div>
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
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 bg-gray-300 hover:text-gray-700 rounded"
                  disabled={isSubmitting}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const newTeacher: Omit<Teacher, 'id'> = {
                    first_name: formData.get("first_name") as string,
                    last_name: formData.get("last_name") as string,
                    email: formData.get("email") as string,
                    phone: formData.get("phone") as string,
                    class: formData.get("class") as string,
                    subject: formData.get("subject") as string,
                    education: formData.get("education") as string,
                    experience: formData.get("experience") as string,
                    address: formData.get("address") as string,
                    joinDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
                    user_id: "", // Will be populated after creating the auth user
                    school_id: schoolId, // Passed from the parent component
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  await addTeacher(newTeacher, schoolName);
                }}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="first_name"
                    placeholder="First Name"
                    required
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                    disabled={isSubmitting}
                  />
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Last Name"
                    required
                    className="border bg-gray-300 rounded-lg px-4 py-2"
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
                    disabled={isSubmitting}
                  />
                  {formErrors.phone && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                  )}

                  {/* Show general submit error if any */}
                  {formErrors.submit && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.submit}</p>
                  )}

                  <select 
                    name="class" 
                    required
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                    disabled={isSubmitting}
                  >
                    <option value="">Select Class</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>
                  </select>
                  <select 
                    name="subject" 
                    required
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                    disabled={isSubmitting}
                  >
                    <option value="">Select Subject</option>
                    <option value="English">English</option>
                    <option value="Math">Math</option>
                    <option value="Science">Science</option>
                  </select>
                  <input
                    type="text"
                    name="education"
                    placeholder="Education"
                    required
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                    disabled={isSubmitting}
                  />
                  <input
                    type="text"
                    name="experience"
                    placeholder="Experience"
                    required
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                    disabled={isSubmitting}
                  />
                  <input
                    type="text"
                    name="address"
                    placeholder="Address"
                    required
                    className="border bg-gray-300 rounded-lg px-4 py-2 md:col-span-2"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 border bg-red-600 text-white rounded-lg"
                    onClick={() => setShowAddModal(false)}
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