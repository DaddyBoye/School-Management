import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Calendar, Users, UserCheck, UserX, Award, Check, TrendingUp, Loader2, Clock, History, BarChart, Search, Filter } from 'lucide-react';
import { supabase } from "../../supabase";
import { AnimatePresence } from 'framer-motion';
import { ToastNotification } from '@/Components/ToastNotification';

// Define interfaces
interface Student {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  roll_no: string;
  class_id: string;
  attendance_percentage?: number;
  recent_status?: string;
}

interface AttendanceRecord {
  id?: string;
  student_id: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  reason?: string;
  teacher_id: string;
  class_id: string;
}

interface Class {
  id: string;
  name: string;
}

interface SchoolCalendar {
  id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface CalendarTerm {
  id: number;
  calendar_id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_break: boolean;
  term_type: 'semester' | 'quarter' | 'trimester' | 'term' | 'break' | 'holiday';
  is_current?: boolean;
}

// Predefined notes/tags for quick selection
const PREDEFINED_NOTES = [
  { label: 'Sick', value: 'Sick', applicableStatuses: ['Absent', 'Late', 'Excused'] },
  { label: 'Doctor Appointment', value: 'Doctor appointment', applicableStatuses: ['Absent', 'Late', 'Excused'] },
  { label: 'Family Emergency', value: 'Family emergency', applicableStatuses: ['Absent', 'Late', 'Excused'] },
  { label: 'Transport Issue', value: 'Transport issue', applicableStatuses: ['Late'] },
  { label: 'School Activity', value: 'Participating in school activity', applicableStatuses: ['Excused'] },
  { label: 'Field Trip', value: 'On field trip', applicableStatuses: ['Excused'] },
  { label: 'Late Arrival', value: 'Arrived late', applicableStatuses: ['Late'] },
  { label: 'Early Departure', value: 'Left early', applicableStatuses: ['Late'] },
  { label: 'Weather Delay', value: 'Delayed by weather', applicableStatuses: ['Late'] },
  { label: 'Other', value: 'Other reason', applicableStatuses: ['Absent', 'Late', 'Excused'] },
];

const AttendanceQuickEditModal = ({
  student,
  isOpen,
  onClose,
  onSave,
  currentStatus,
  currentNote = ''
}: {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (status: 'Present' | 'Absent' | 'Late' | 'Excused', note?: string) => void;
  currentStatus: 'Present' | 'Absent' | 'Late' | 'Excused' | null;
  currentNote?: string;
}) => {
  const [status, setStatus] = useState<'Present' | 'Absent' | 'Late' | 'Excused' | null>(currentStatus);
  const [note, setNote] = useState(currentNote);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPredefinedNotes, setShowPredefinedNotes] = useState(false);

  // Reset form when student changes
  useEffect(() => {
    setStatus(currentStatus);
    setNote(currentNote);
    setShowPredefinedNotes(false);
  }, [student, currentStatus, currentNote]);

  const handleSave = async () => {
    if (!status) return;
    
    setIsSubmitting(true);
    try {
      await onSave(status, note);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoteSelect = (selectedNote: string) => {
    setNote(prev => {
      if (prev.includes(selectedNote)) {
        return prev;
      }
      return prev ? `${prev}, ${selectedNote}` : selectedNote;
    });
    setShowPredefinedNotes(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case '1':
        case 'p':
          setStatus('Present');
          break;
        case '2':
        case 'a':
          setStatus('Absent');
          break;
        case '3':
        case 'l':
          setStatus('Late');
          break;
        case '4':
        case 'e':
          setStatus('Excused');
          break;
        case 'Enter':
          handleSave();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, status, note]);

  if (!isOpen || !student) return null;

  const filteredPredefinedNotes = PREDEFINED_NOTES.filter(note => 
    status ? note.applicableStatuses.includes(status) : true
  );

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-30 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-md animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {currentStatus ? 'Edit Attendance' : 'Record Attendance'}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 bg-slate-100 hover:text-gray-700 p-1 rounded-full transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-lg">
                {student.first_name.charAt(0)}{student.last_name.charAt(0)}
              </div>
              <div>
                <h3 className="font-medium text-gray-800">
                  {student.first_name} {student.last_name}
                </h3>
                <p className="text-sm text-gray-500">Roll No: {student.roll_no}</p>
              </div>
            </div>
          </div>

          {/* Quick Status Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setStatus('Present')}
              className={`px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                status === 'Present'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              } transition-all`}
            >
              <Check className="w-5 h-5" />
              Present
              <span className="text-xs opacity-70">(1/P)</span>
            </button>
            <button
              onClick={() => setStatus('Absent')}
              className={`px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                status === 'Absent'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-red-100 text-red-800 hover:bg-red-200'
              } transition-all`}
            >
              <UserX className="w-5 h-5" />
              Absent
              <span className="text-xs opacity-70">(2/A)</span>
            </button>
            <button
              onClick={() => setStatus('Late')}
              className={`px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                status === 'Late'
                  ? 'bg-yellow-500 text-white shadow-md'
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              } transition-all`}
            >
              <Clock className="w-5 h-5" />
              Late
              <span className="text-xs opacity-70">(3/L)</span>
            </button>
            <button
              onClick={() => setStatus('Excused')}
              className={`px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                status === 'Excused'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
              } transition-all`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Excused
              <span className="text-xs opacity-70">(4/E)</span>
            </button>
          </div>

          {/* Note Field */}
          {status && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note/Reason
                <button
                  type="button"
                  onClick={() => setShowPredefinedNotes(!showPredefinedNotes)}
                  className="ml-2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600"
                >
                    {status !== 'Present' && (showPredefinedNotes ? 'Hide Suggestions' : 'Show Suggestions')}
                </button>
              </label>
              
              {showPredefinedNotes && status !== 'Present' &&(
                <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {filteredPredefinedNotes.map((noteItem) => (
                      <button
                        key={noteItem.value}
                        type="button"
                        onClick={() => handleNoteSelect(noteItem.value)}
                        className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-100"
                      >
                        {noteItem.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <textarea
                className="w-full px-4 py-3 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any notes or reasons..."
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">Optional note for this status</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            disabled={!status || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                {currentStatus ? 'Update' : 'Save'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const BulkAttendanceModal = ({ 
  isOpen, 
  onClose, 
  students, 
  selectedStatus, 
  excludedStudents, 
  toggleStudent, 
  handleSubmit 
}: {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  selectedStatus: 'Present' | 'Absent' | 'Late' | 'Excused';
  excludedStudents: string[];
  toggleStudent: (studentId: string) => void;
  handleSubmit: () => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = students.filter(student => 
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.roll_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  // Status color mapping for visual consistency
  const statusColors = {
    'Present': 'bg-green-100 text-green-800',
    'Absent': 'bg-red-100 text-red-800',
    'Late': 'bg-yellow-100 text-yellow-800',
    'Excused': 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Bulk Attendance Update</h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 bg-slate-300 hover:bg-gray-100 hover:text-gray-700 p-2 rounded-full transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700 mb-2">
              You are about to mark all students as 
              <span className={`font-bold capitalize px-3 py-1 rounded ml-2 ${statusColors[selectedStatus]}`}>
                {selectedStatus.toLowerCase()}
              </span>
              except the ones you select below:
            </p>
            <div className="text-sm text-gray-500">
              Selected students will retain their current attendance status
            </div>
          </div>

          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search by name or roll number..."
              className="w-full px-4 py-3 pl-10 border bg-white border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-3.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1.5 bg-white text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-200">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938-9H18a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
                </svg>
                <p className="font-medium mb-1">No students found</p>
                <p className="text-sm">Try different search terms</p>
              </div>
            ) : (
              filteredStudents.map(student => (
                <div 
                  key={student.user_id} 
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                    excludedStudents.includes(student.user_id) 
                      ? 'bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleStudent(student.user_id)}
                  role="checkbox"
                  aria-checked={excludedStudents.includes(student.user_id)}
                  tabIndex={0}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      excludedStudents.includes(student.user_id)
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {student.first_name} {student.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">Roll No: {student.roll_no}</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                    excludedStudents.includes(student.user_id)
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-gray-300'
                  }`}>
                    {excludedStudents.includes(student.user_id) && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-between gap-3 items-center">
          {excludedStudents.length > 0 && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">{excludedStudents.length}</span> student{excludedStudents.length !== 1 ? 's' : ''} excluded
            </div>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              Confirm Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AttendanceHistoryModal = ({
  isOpen,
  onClose,
  student,
  attendanceRecords,
  classId
}: {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  attendanceRecords: AttendanceRecord[];
  classId: string;
}) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!student || !isOpen) return;
    
    setIsLoading(true);
    
    // Simulate API loading
    setTimeout(() => {
      const now = new Date();
      let startDate = new Date();

      if (timeRange === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setDate(now.getDate() - 30);
      }

      const filtered = attendanceRecords.filter(record => 
        record.student_id === student.user_id && 
        record.class_id === classId &&
        (timeRange === 'all' || new Date(record.date) >= startDate)
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setFilteredRecords(filtered);
      setIsLoading(false);
    }, 500);
    
  }, [student, attendanceRecords, classId, timeRange, isOpen]);

  if (!isOpen || !student) return null;

  const statusColors = {
    Present: 'bg-green-100 text-green-800',
    Absent: 'bg-red-100 text-red-800',
    Late: 'bg-yellow-100 text-yellow-800',
    Excused: 'bg-blue-100 text-blue-800'
  };
  
  const statusIcons = {
    Present: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    Absent: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    Late: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    Excused: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  // Calculate attendance statistics
  const totalDays = filteredRecords.length;
  const presentDays = filteredRecords.filter(r => r.status === 'Present').length;
  const absentDays = filteredRecords.filter(r => r.status === 'Absent').length;
  const lateDays = filteredRecords.filter(r => r.status === 'Late').length;
  
  const attendancePercentage = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Attendance History
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-600">
                  {student.first_name} {student.last_name}
                </p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Roll No: {student.roll_no}
                </span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-500 bg-slate-200 hover:bg-gray-100 hover:text-gray-700 p-2 rounded-full transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                timeRange === 'week' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                timeRange === 'month' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                timeRange === 'all' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Time
            </button>
          </div>
          
          {/* Attendance Summary Cards */}
          {!isLoading && filteredRecords.length > 0 && (
            <div className="grid grid-cols-5 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-500 mb-1">Total Days</div>
                <div className="text-2xl font-bold text-gray-800">{totalDays}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-sm text-green-600 mb-1">Present</div>
                <div className="text-2xl font-bold text-green-700">{presentDays}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-sm text-red-600 mb-1">Absent</div>
                <div className="text-2xl font-bold text-red-700">{absentDays}</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <div className="text-sm text-yellow-600 mb-1">Late</div>
                <div className="text-2xl font-bold text-yellow-700">{lateDays}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-sm text-blue-600 mb-1">Attendance</div>
                <div className="text-2xl font-bold text-blue-700">{attendancePercentage}%</div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-500">Loading attendance records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-medium mb-1">No attendance records found</p>
              <p className="text-sm">No data available for the selected time period</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRecords.map(record => (
                <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusColors[record.status]}`}>
                        {statusIcons[record.status]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {new Date(record.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        {record.reason && record.reason !== 'No reason provided' && (
                          <div className="mt-2 bg-gray-50 p-3 rounded-md">
                            <p className="text-sm font-medium text-gray-700 mb-1">Teacher's Note:</p>
                            <p className="text-sm text-gray-600">{record.reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColors[record.status]}`}>
                      {record.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface TeacherAttendanceProps {
  teacherId: string;
  schoolId: string;
}

const TeacherAttendance: React.FC<TeacherAttendanceProps> = ({ teacherId, schoolId }) => {  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [excludedStudents, setExcludedStudents] = useState<string[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceReasons, setAttendanceReasons] = useState<Record<string, string>>({});
  const [assignedClass, setAssignedClass] = useState<Class | null>(null);
  const [pendingChanges, setPendingChanges] = useState<{
    studentId: string | null;
    status: 'Present' | 'Absent' | 'Late' | 'Excused' | null;
    note: string;
  }>({ studentId: null, status: null, note: '' });
  
  // UI state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [bulkStatus, setBulkStatus] = useState<'Present' | 'Absent' | 'Late' | 'Excused' | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState({
    initial: true,
    students: false,
    attendance: false,
    bulkAction: false
  });
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Present' | 'Absent' | 'Late' | 'Excused' | 'Not Marked'>('All');
  const [schoolCalendars, setSchoolCalendars] = useState<SchoolCalendar[]>([]);
  const [calendarTerms, setCalendarTerms] = useState<CalendarTerm[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<number | null>(null);
  const [filterTerm, setFilterTerm] = useState<number | null>(null);

  // Notification state
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'connection-error';
  }>>([]);

  const showNotification = (message: string, type: 'success' | 'error' | 'connection-error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  // Apply filters whenever students, searchQuery, or statusFilter changes
  useEffect(() => {
    if (!students.length) return;

    const filtered = students.filter(student => {
      // Search filter
      const matchesSearch = 
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.roll_no.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const studentStatus = getStudentStatus(student.user_id);
      const matchesStatus = 
        statusFilter === 'All' ||
        (statusFilter === 'Not Marked' && !studentStatus) ||
        (statusFilter === studentStatus);
      
      return matchesSearch && matchesStatus;
    });

    // Sort alphabetically by last name, then first name
    const sorted = [...filtered].sort((a, b) => {
      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    setFilteredStudents(sorted);
  }, [students, searchQuery, statusFilter]);

  // Check connection and fetch initial data
  const checkConnectionAndFetchData = async () => {
    try {
      setConnectionError(false);
      // Simple ping to Supabase to check connection
      const { error } = await supabase
        .from('teachers')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      await fetchSchoolCalendars();
      await fetchTeacherClassAndStudents();
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionError(true);
      showNotification('No internet connection detected', 'connection-error');
    }
  };

  // Fetch teacher's assigned class and students
  const fetchTeacherClassAndStudents = async () => {
    try {
      setLoading(prev => ({ ...prev, initial: true, students: true }));
      
      // 1. Get the teacher's assigned class
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('class_id, classes!teachers_class_id_fkey(id, name)')
        .eq('user_id', teacherId)
        .single();

      if (teacherError) throw teacherError;
      if (!teacherData) throw new Error('Teacher not found');

      const teacherClass = Array.isArray(teacherData.classes) 
        ? teacherData.classes[0] 
        : teacherData.classes;

      if (!teacherClass) throw new Error('Teacher not assigned to any class');

      setAssignedClass(teacherClass);

      // 2. Get students for this class only
      await fetchStudents(teacherClass.id);
      
      // 3. Get attendance records for this class only
      await fetchAttendanceRecords(teacherClass.id);

    } catch (error) {
      console.error('Error fetching teacher data:', error);
      if (typeof error === 'object' && error !== null && 'message' in error && 
          ((error as any).message.includes('Failed to fetch') || 
           (error as any).message.includes('NetworkError'))) {
        setConnectionError(true);
        showNotification('No internet connection detected', 'connection-error');
      } else {
        showNotification('Failed to load teacher data', 'error');
      }
    } finally {
      setLoading(prev => ({ ...prev, initial: false, students: false }));
    }
  };

  // Fetch students for assigned class
  const fetchStudents = async (classId: string) => {
    try {
      setLoading(prev => ({ ...prev, students: true }));
  
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .eq('school_id', schoolId)
        .order('roll_no', { ascending: true });
    
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      if (!connectionError) {
        showNotification('Failed to load students', 'error');
      }
    } finally {
      setLoading(prev => ({ ...prev, students: false }));
    }
  };
  
  // Fetch attendance records for assigned class
  const fetchAttendanceRecords = async (classId: string) => {
    try {
      setLoading(prev => ({ ...prev, attendance: true }));
      
      // Calculate date range based on selected time range
      const now = new Date();
      let startDate = new Date();
      
      if (timeRange === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setDate(now.getDate() - 30);
      }

      let query = supabase
        .from('attendance_records')
        .select('*')
        .eq('class_id', classId)
        .eq('school_id', schoolId)
        .order('date', { ascending: false });

      // Apply term filter if selected
      if (filterTerm) {
        const term = calendarTerms.find(t => t.id === filterTerm);
        if (term) {
          query = query
            .gte('date', term.start_date)
            .lte('date', term.end_date);
        }
      } else {
        // Apply regular time range filter
        query = query
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', now.toISOString().split('T')[0]);
      }

      const { data: attendanceData, error: attendanceError } = await query;

      if (attendanceError) throw attendanceError;
      setAttendanceRecords(attendanceData || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      if (!connectionError) {
        showNotification('Failed to load attendance records', 'error');
      }
    } finally {
      setLoading(prev => ({ ...prev, attendance: false }));
    }
  };

  const fetchSchoolCalendars = async () => {
    try {
      const { data, error } = await supabase
        .from('school_calendar')
        .select('*')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setSchoolCalendars(data || []);
      
      // Set the first active calendar as selected by default
      const activeCalendar = data?.find(c => c.is_active);
      if (activeCalendar) {
        setSelectedCalendar(activeCalendar.id);
      }
    } catch (error) {
      console.error('Error fetching school calendars:', error);
      showNotification('Failed to load school calendars', 'error');
    }
  };

  const fetchCalendarTerms = async (calendarId: number) => {
    try {
      const { data, error } = await supabase
        .from('calendar_terms')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setCalendarTerms(data || []);
    } catch (error) {
      console.error('Error fetching calendar terms:', error);
      showNotification('Failed to load calendar terms', 'error');
    }
  };

  const toggleStudent = (studentId: string) => {
    setExcludedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  const handleBulkAction = () => {
    setExcludedStudents([]);
    setShowBulkModal(true);
  };

  // Update the updateAttendanceStatus function to handle comments better:
  const updateAttendanceStatus = async (
    studentId: string, 
    status: 'Present' | 'Absent' | 'Late' | 'Excused', 
    reason?: string
  ) => {
    if (!assignedClass) return;
  
    try {
      // Clear reason if status is Present
      const finalReason = status === 'Present' ? undefined : reason;
  
      // Check if record already exists
      const existingRecord = attendanceRecords.find(
        record => record.student_id === studentId && 
                 record.date === selectedDate &&
                 record.class_id === assignedClass.id
      );
  
      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('attendance_records')
          .update({
            status,
            reason: finalReason,
            updated_at: new Date().toISOString(),
            school_id: schoolId // Add school filter
          })
          .eq('id', existingRecord.id)
          .eq('class_id', assignedClass.id)
          .eq('school_id', schoolId);
  
        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('attendance_records')
          .insert({
            student_id: studentId,
            date: selectedDate,
            status,
            reason: finalReason,
            teacher_id: teacherId,
            class_id: assignedClass.id,
            school_id: schoolId
          });
  
        if (error) throw error;
      }
  
      // Refresh data
      fetchAttendanceRecords(assignedClass.id);
      showNotification('Attendance updated successfully', 'success');
    } catch (error) {
      console.error('Error updating attendance:', error);
      showNotification('Failed to update attendance', 'error');
    }
  };

  // Apply bulk status with class constraint
  const applyBulkStatus = async (excludedStudents: string[] = []) => {
    if (!bulkStatus || !assignedClass) return;

    try {
      setLoading(prev => ({ ...prev, bulkAction: true }));
      
      // Get existing records for the selected date and class
      const existingRecords = attendanceRecords.filter(
        record => record.date === selectedDate && 
                record.class_id === assignedClass.id
      );

      // Prepare batch operations
      const updates = students
        .filter(student => !excludedStudents.includes(student.user_id))
        .map(async (student) => {
          const existingRecord = existingRecords.find(
            record => record.student_id === student.user_id
          );

          if (existingRecord) {
            // Update existing record
            const { error } = await supabase
              .from('attendance_records')
              .update({
                status: bulkStatus,
                updated_at: new Date().toISOString(),
                school_id: schoolId // Add school filter
              })
              .eq('id', existingRecord.id)
              .eq('class_id', assignedClass.id)
              .eq('school_id', schoolId);

            if (error) throw error;
          } else {
            // Create new record
            const { error } = await supabase
              .from('attendance_records')
              .insert({
                student_id: student.user_id,
                date: selectedDate,
                status: bulkStatus,
                teacher_id: teacherId,
                class_id: assignedClass.id,
                school_id: schoolId // Add school filter
              });

            if (error) throw error;
          }
        });

      await Promise.all(updates);
      
      // Refresh attendance data
      fetchAttendanceRecords(assignedClass.id);
      showNotification(`Bulk status applied: ${bulkStatus}`, 'success');
      setBulkStatus(null);
      setExcludedStudents([]);
      setShowBulkModal(false);
    } catch (error) {
      console.error('Error applying bulk status:', error);
      showNotification('Failed to apply bulk status', 'error');
    } finally {
      setLoading(prev => ({ ...prev, bulkAction: false }));
    }
  };

  // Calculate attendance stats for assigned class
  const calculateStats = () => {
    if (!assignedClass || students.length === 0) {
      return {
        totalStudents: 0,
        presentToday: 0,
        absentToday: 0,
        lateToday: 0,
        excusedToday: 0,
        attendanceRate: 0
      };
    }

    const todayRecords = attendanceRecords.filter(
      record => record.date === selectedDate && 
               record.class_id === assignedClass.id
    );

    const presentToday = todayRecords.filter(
      record => record.status === 'Present'
    ).length;
    
    const absentToday = todayRecords.filter(
      record => record.status === 'Absent'
    ).length;
    
    const lateToday = todayRecords.filter(
      record => record.status === 'Late'
    ).length;
    
    const excusedToday = todayRecords.filter(
      record => record.status === 'Excused'
    ).length;

    const attendanceRate = students.length > 0 
      ? Math.round((presentToday / students.length) * 100) 
      : 0;

    return {
      totalStudents: students.length,
      presentToday,
      absentToday,
      lateToday,
      excusedToday,
      attendanceRate
    };
  };

  // Get attendance chart data for assigned class
  const getAttendanceChartData = () => {
    const chartData: { date: string; present: number; absent: number; late: number }[] = [];
    const dateMap: Record<string, { present: number; absent: number; late: number }> = {};

    attendanceRecords.forEach(record => {
      if (!dateMap[record.date]) {
        dateMap[record.date] = { present: 0, absent: 0, late: 0 };
      }
      
      if (record.status === 'Present') {
        dateMap[record.date].present += 1;
      } else if (record.status === 'Absent') {
        dateMap[record.date].absent += 1;
      } else if (record.status === 'Late') {
        dateMap[record.date].late += 1;
      }
    });

    for (const date in dateMap) {
      chartData.push({
        date,
        ...dateMap[date]
      });
    }

    return chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Get student's status for selected date in assigned class
  const getStudentStatus = (studentId: string) => {
    return attendanceRecords.find(
      record => record.student_id === studentId && 
               record.date === selectedDate &&
               record.class_id === assignedClass?.id
    )?.status || null;
  };

  // Get student's attendance percentage in assigned class
  const getStudentAttendancePercentage = (studentId: string) => {
    if (!assignedClass) return null;
    
    const studentRecords = attendanceRecords.filter(
      record => record.student_id === studentId && 
               record.class_id === assignedClass.id
    );
    
    if (studentRecords.length === 0) return null;
    
    const presentCount = studentRecords.filter(
      record => record.status === 'Present'
    ).length;
    
    return Math.round((presentCount / studentRecords.length) * 100);
  };

  // Get recent absences for assigned class
  const getRecentAbsences = () => {
    if (!assignedClass) return [];
    
    return attendanceRecords
      .filter(record => 
        (record.status === 'Absent' || record.status === 'Late') &&
        record.class_id === assignedClass.id
      )
      .slice(0, 5)
      .map(record => {
        const student = students.find(s => s.user_id === record.student_id);
        return {
          student: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
          rollNo: student?.roll_no || '',
          date: record.date,
          status: record.status,
          reason: record.reason || 'No reason provided'
        };
      });
  };

  // Get top attendees for assigned class
  const getTopAttendees = () => {
    if (!assignedClass) return [];
    
    return [...students]
      .map(student => ({
        ...student,
        attendancePercentage: getStudentAttendancePercentage(student.user_id) || 0
      }))
      .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
      .slice(0, 3);
  };

  // Render rank with special styling for top 3

  // Render status badge
  const renderStatusBadge = (status: string | null) => {
    switch (status) {
      case 'Present':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Present</span>;
      case 'Absent':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Absent</span>;
      case 'Late':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Late</span>;
      case 'Excused':
        return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Excused</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">Not marked</span>;
    }
  };

  // Open attendance history for a student
  const openAttendanceHistory = (student: Student) => {
    setSelectedStudent(student);
    setShowHistoryModal(true);
  };

  useEffect(() => {
    checkConnectionAndFetchData();
  }, [teacherId]);

useEffect(() => {
  if (selectedCalendar) {
    fetchCalendarTerms(selectedCalendar);
  } else {
    setCalendarTerms([]);
  }
}, [selectedCalendar]);

useEffect(() => {
  if (assignedClass) {
    fetchAttendanceRecords(assignedClass.id);
  }
}, [selectedDate, timeRange, filterTerm]);

  const stats = calculateStats();
  const chartData = getAttendanceChartData();
  const recentAbsences = getRecentAbsences();
  const topAttendees = getTopAttendees();

  // Loading Skeleton
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-100 border border-gray-200 rounded-xl p-5 h-32 animate-pulse"></div>
        ))}
      </div>
      
      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden animate-pulse">
            <div className="p-4 border-b bg-gray-50 h-16"></div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="h-16 bg-gray-100 rounded w-full"></div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden animate-pulse h-64">
            <div className="p-4 border-b bg-gray-50 h-16"></div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden animate-pulse h-64">
            <div className="p-4 border-b bg-gray-50 h-16"></div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden animate-pulse h-64">
            <div className="p-4 border-b bg-gray-50 h-16"></div>
          </div>
        </div>
      </div>
    </div>
  );

  // Connection Error UI
  if (connectionError) {
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
            onClick={checkConnectionAndFetchData}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // No Class Assigned UI
  if (!loading.initial && !assignedClass) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="p-8 text-center bg-blue-50 border border-blue-200 rounded-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-blue-700 mb-2">No Class Assigned</h2>
          <p className="text-blue-600 mb-4">
            You haven't been assigned to any class yet.
          </p>
          <div className="text-sm text-blue-500">
            Please contact your school administrator for assistance.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <UserCheck className="w-7 h-7 text-blue-600" />
              Attendance Management
            </h1>
            {assignedClass && (
              <p className="text-gray-600 mt-1 text-lg">
                Class: <span className="font-medium">{assignedClass.name}</span> • 
                <span className="text-blue-600 font-medium"> {students.length} students</span>
              </p>
            )}
          </div>
        </div>
  
        {loading.initial ? (
          <LoadingSkeleton />
        ) : (
          <>
          {/* Control panel */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Attendance Controls</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Class Display */}
              <div className="space-y-2">
                <label id="class-label" className="block text-sm font-medium text-gray-700">Current Class</label>
                <div 
                  className="w-full bg-blue-50 rounded-lg px-4 py-3 border border-blue-200 text-blue-700 font-medium flex items-center"
                  aria-labelledby="class-label"
                  role="status"
                >
                  <div className="flex-shrink-0 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                      <line x1="6" y1="1" x2="6" y2="4"></line>
                      <line x1="10" y1="1" x2="10" y2="4"></line>
                      <line x1="14" y1="1" x2="14" y2="4"></line>
                    </svg>
                  </div>
                  <span>{assignedClass ? assignedClass.name : 'Loading...'}</span>
                </div>
              </div>
            
              {/* Date Selector */}
              <div className="space-y-2">
                <label htmlFor="attendance-date" className="block text-sm font-medium text-gray-700">Select Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="attendance-date"
                    type="date"
                    className="w-full bg-white rounded-lg pl-10 pr-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <button 
                      onClick={() => {
                        const datePicker = document.getElementById('attendance-date');
                        if (datePicker instanceof HTMLInputElement) datePicker.showPicker();
                      }}
                      className="text-gray-400 bg-slate-100 hover:text-gray-600"
                      type="button"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Academic Calendar Selector */}
              <div className="space-y-2">
                <label htmlFor="academic-calendar" className="block text-sm font-medium text-gray-700">Academic Calendar</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <select
                    id="academic-calendar"
                    className="w-full bg-white rounded-lg pl-10 pr-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    value={selectedCalendar || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedCalendar(value);
                      setFilterTerm(null);
                    }}
                    disabled={loading.attendance}
                  >
                    <option value="">Select Calendar</option>
                    {schoolCalendars.map(calendar => (
                      <option key={calendar.id} value={calendar.id}>
                        {calendar.name} ({new Date(calendar.start_date).getFullYear()})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Term Selector */}
              <div className="space-y-2">
                <label htmlFor="term-selector" className="block text-sm font-medium text-gray-700">Term</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <select
                    id="term-selector"
                    className="w-full bg-white rounded-lg pl-10 pr-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    value={filterTerm || ''}
                    onChange={(e) => setFilterTerm(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={loading.attendance || !selectedCalendar}
                  >
                    <option value="">All Terms</option>
                    {calendarTerms.map(term => (
                      <option key={term.id} value={term.id}>
                        {term.name} ({new Date(term.start_date).toLocaleDateString()} - {new Date(term.end_date).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              {/* Time Range Selector */}
              <div className="space-y-2">
                <label htmlFor="time-range" className="block text-sm font-medium text-gray-700">View Range</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <select
                    id="time-range"
                    className="w-full bg-white rounded-lg pl-10 pr-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month')}
                    aria-label="Select time range"
                  >
                    <option value="day">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            
              {/* Bulk Actions */}
              <div className="space-y-2">
                <label htmlFor="bulk-status" className="block text-sm font-medium text-gray-700">Bulk Actions</label>
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <select
                      id="bulk-status"
                      className="w-full bg-white rounded-lg px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                      value={bulkStatus || ''}
                      onChange={(e) => {
                        const status = e.target.value as 'Present' | 'Absent' | 'Late' | 'Excused' | '';
                        setBulkStatus(status ? status as any : null);
                      }}
                      disabled={loading.bulkAction}
                      aria-label="Select bulk status action"
                    >
                      <option value="">Select Status</option>
                      <option value="Present">Mark All Present</option>
                      <option value="Absent">Mark All Absent</option>
                      <option value="Late">Mark All Late</option>
                      <option value="Excused">Mark All Excused</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <button
                    onClick={handleBulkAction}
                    disabled={!bulkStatus || loading.bulkAction}
                    className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[90px]"
                    aria-label="Apply bulk action"
                  >
                    {loading.bulkAction ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="sr-only">Loading</span>
                      </>
                    ) : (
                      'Apply'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
  
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mb-6">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Total Students</p>
                    <h3 className="text-3xl font-bold mt-2 text-gray-800">{stats.totalStudents}</h3>
                    <p className="text-sm text-gray-500 mt-1">in your class</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-full">
                    <Users className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Present Today</p>
                    <h3 className="text-3xl font-bold mt-2 text-green-600">{stats.presentToday}</h3>
                    <p className="text-sm text-gray-500 mt-1">{stats.attendanceRate}% attendance</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Absent Today</p>
                    <h3 className="text-3xl font-bold mt-2 text-red-600">{stats.absentToday}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {stats.totalStudents > 0 ? Math.round((stats.absentToday / stats.totalStudents) * 100) : 0}% absence
                    </p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-full">
                    <UserX className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Late Today</p>
                    <h3 className="text-3xl font-bold mt-2 text-yellow-600">{stats.lateToday}</h3>
                    <p className="text-sm text-gray-500 mt-1">students arrived late</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>
  
            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Student List - now wider (lg:col-span-2) */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-0 shadow-md rounded-xl overflow-hidden">
                  <CardHeader className="bg-white border-b pb-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-800">
                        <Users className="w-5 h-5 text-blue-600" />
                        Class Attendance - {selectedDate}
                      </CardTitle>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search Bar */}
                        <div className="relative bg-slate-100">
                          <div className="absolute inset-y-0 left-0 pl-3  flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="Search students..."
                            className="pl-10 pr-4 py-2 border bg-slate-100 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        {/* Status Filter */}
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter className="h-4 w-4 text-gray-400" />
                          </div>
                          <select
                            className="pl-10 pr-4 py-2 border bg-slate-100 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none w-full"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                          >
                            <option value="All">All Statuses</option>
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Late">Late</option>
                            <option value="Excused">Excused</option>
                            <option value="Not Marked">Not Marked</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex ml-2 items-center pr-3 pointer-events-none">
                            <svg className="h-4 w-4 text-gray-400 ml-2" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-5 pb-3">
                    {loading.students ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="border rounded-lg overflow-hidden">
                            <div className="p-4 bg-white flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                                <div className="space-y-2">
                                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                              </div>
                              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="text-center py-12 px-4">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <UserX className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-700 mb-1">
                          {students.length === 0 ? 'No Students Found' : 'No Matching Students'}
                        </h3>
                        <p className="text-gray-500">
                          {students.length === 0 
                            ? 'No students are currently enrolled in your class.' 
                            : 'No students match your search and filter criteria.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredStudents.map((student) => (
                          <div key={student.user_id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors">
                            <div className="p-4 bg-white flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-lg">
                                  {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-800">
                                    {student.first_name} {student.last_name}
                                  </h3>
                                  <p className="text-sm text-gray-500">Roll No: {student.roll_no}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div>
                                  {renderStatusBadge(getStudentStatus(student.user_id))}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openAttendanceHistory(student)}
                                    className="text-gray-500 bg-gray-100 p-2 rounded-full hover:bg-gray-200 hover:text-blue-600 transition-colors"
                                    title="View attendance history"
                                    aria-label="View attendance history"
                                  >
                                    <History className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPendingChanges({
                                        studentId: student.user_id,
                                        status: getStudentStatus(student.user_id) as any || null,
                                        note: attendanceReasons[student.user_id] || ''
                                      });
                                    }}
                                    className={`p-2 rounded-full transition-colors ${
                                      getStudentStatus(student.user_id)
                                        ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                        : 'text-white bg-green-500 hover:bg-green-600'
                                    }`}
                                    aria-label={getStudentStatus(student.user_id) ? "Edit attendance" : "Add attendance"}
                                  >
                                    {getStudentStatus(student.user_id) ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
  
                {/* Attendance Trends Chart */}
                <Card className="border-0 shadow-md rounded-xl overflow-hidden">
                  <CardHeader className="bg-white border-b pb-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-800">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Attendance Trends ({timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This Week' : 'This Month'})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {loading.attendance ? (
                      <div className="h-64 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                      </div>
                    ) : chartData.length === 0 ? (
                      <div className="text-center py-12 px-4">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <BarChart className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-700 mb-1">No Data Available</h3>
                        <p className="text-gray-500">No attendance data for the selected period.</p>
                      </div>
                    ) : (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend />
                            <Line type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={2} name="Present" dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late" dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
  
              {/* Right Sidebar - now narrower (lg:col-span-1) */}
              <div className="lg:col-span-1 space-y-6">
                {/* Top Attendees */}
                <Card className="border-0 shadow-md rounded-xl overflow-hidden">
                  <CardHeader className="bg-white border-b pb-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-800">
                      <Award className="w-5 h-5 text-yellow-500" />
                      Top Attendees
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {loading.attendance || loading.students ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg animate-pulse">
                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-32 bg-gray-200 rounded"></div>
                              <div className="h-3 w-24 bg-gray-200 rounded"></div>
                            </div>
                            <div className="h-4 w-12 bg-gray-200 rounded"></div>
                          </div>
                        ))}
                      </div>
                    ) : topAttendees.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="mx-auto w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <Award className="w-7 h-7 text-gray-400" />
                        </div>
                        <p className="text-gray-600">No attendance data to display.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {topAttendees.map((student, index) => (
                          <div key={student.user_id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-blue-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-800">
                                {student.first_name} {student.last_name}
                              </h3>
                              <p className="text-sm text-gray-500">Roll No: {student.roll_no}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-green-600 text-lg">
                                {student.attendancePercentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
  
                {/* Recent Absences */}
                <Card className="border-0 shadow-md rounded-xl overflow-hidden">
                  <CardHeader className="bg-white border-b pb-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-800">
                      <UserX className="w-5 h-5 text-red-500" />
                      Recent Absences/Lates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {loading.attendance || loading.students ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="p-3 border-b last:border-b-0 animate-pulse">
                            <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 w-24 bg-gray-200 rounded"></div>
                          </div>
                        ))}
                      </div>
                    ) : recentAbsences.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <div className="mx-auto w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <Check className="w-7 h-7 text-green-500" />
                        </div>
                        <p className="text-gray-600">No recent absences or lates. Great attendance!</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {recentAbsences.map((absence, index) => (
                          <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium text-gray-800">{absence.student}</h3>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {absence.date}
                                </p>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                absence.status === 'Absent' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {absence.status}
                              </div>
                            </div>
                            {absence.reason && (
                              <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                                <span className="font-medium">Reason:</span> {absence.reason}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}        
  
        {/* Bulk Action Modal */}
        <BulkAttendanceModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          students={students}
          selectedStatus={bulkStatus!}
          excludedStudents={excludedStudents}
          toggleStudent={toggleStudent}
          handleSubmit={() => applyBulkStatus(excludedStudents)}
        />
  
        {/* Quick Edit Modal */}
        <AttendanceQuickEditModal
          isOpen={!!pendingChanges.studentId}
          onClose={() => setPendingChanges({ studentId: null, status: null, note: '' })}
          student={students.find(s => s.user_id === pendingChanges.studentId) || null}
          currentStatus={pendingChanges.status}
          currentNote={pendingChanges.note}
          onSave={async (status, note) => {
            if (pendingChanges.studentId) {
              await updateAttendanceStatus(
                pendingChanges.studentId,
                status,
                note || undefined
              );
              setAttendanceReasons(prev => ({
                ...prev,
                [pendingChanges.studentId!]: note || ''
              }));
            }
          }}
        />

        {/* Attendance History Modal */}
        <AttendanceHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          student={selectedStudent}
          attendanceRecords={attendanceRecords}
          classId={assignedClass?.id || ''}
        />
  
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
}
export default TeacherAttendance;