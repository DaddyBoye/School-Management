import React, {useEffect} from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import LeftNav from './Components/LeftNav';
import { Menu } from 'lucide-react';
import Header from './Components/Header';
import Dashboard from './pages/admin/dashboard';
import Teachers from './pages/admin/teachers';
import Students from './pages/admin/students';
import StudentGrades from './pages/admin/studentgrades';
import SchoolRoleSelection from './pages/SchoolRoleSelection'; 
import AuthPage from './pages/authpage';
import ProtectedRoute from '../src/routes/ProtectedRoute';
import { useAuth } from '../src/context/AuthContext';
import StudentDashboard from './pages/students/studentdashboard';
import TeacherDashboard from './pages/teachers/teacherdashboard';
import StudentFees from './pages/admin/studentfees';
import ClassSubjectManager from './pages/admin/classsubjectmanager';
import SubjectClassManager from './pages/admin/subjectclassmanager';
import FeeManager from './pages/admin/feemanager';
import TimetableManager from './pages/admin/timetablemanager';
import TeacherStudentView from './pages/teachers/teacherstudentview';
import TeacherGrades from './pages/teachers/teachergrades';
import TeacherStudentRankings from './pages/teachers/teacherrankings';
import TeacherAttendance from './pages/teachers/teacherattendance';
import TeacherTimetable from './pages/teachers/teachertimetable';
import StudentGradesView from './pages/students/studentgradesview';
import StudentFeeView from './pages/students/studentfeeview';
import StudentTimetable from './pages/students/studenttimetable';
import AdminAttendance from './pages/admin/adminattendance';

const AppContent = () => {
  const [isNavOpen, setIsNavOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, loading, currentTerm } = useAuth();
  const schoolId = localStorage.getItem('school_id') || '';
  const schoolName = localStorage.getItem('school_name') || '';

  useEffect(() => {
    if (!loading && !user && !['/welcome', '/auth'].includes(location.pathname)) {
      navigate('/welcome');
    }
  }, [user, loading, location.pathname, navigate]);

  // Prevent body scroll when nav is open on mobile
  useEffect(() => {
    if (isNavOpen) {
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      // Restore scrolling
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isNavOpen]);

  // Close nav when screen size changes from mobile to desktop
  useEffect(() => {
    const handleResize = () => {
      // Close nav when switching from mobile to desktop (768px is md breakpoint)
      if (window.innerWidth >= 768 && isNavOpen) {
        setIsNavOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isNavOpen]);

  const accessibleRoutes = {
    admin: ['/', '/staff', '/students', '/studentfees', '/studentgrades', '/classsubjectmanager', '/subjectclassmanager', '/feemanager', '/timetablemanager', '/adminattendance'],
    teacher: ['/', '/teacherstudentview', '/teachergrades', '/teacherrankings', '/teacherattendance', '/teachertimetable'],
    student: ['/', '/studentgradesview', '/studentfeeview', '/studenttimetable'],
  };
  
  const getPageTitle = () => {
    const path = location.pathname;
    const titles: { [key: string]: string } = {
      '/': 'Dashboard',
      '/staff': 'Staff',
      '/studentfees': 'Student Fees',
      '/studentgrades': 'Student Grades',
      '/students': 'Students',
      '/classsubjectmanager': 'Teacher Assignments',
      '/subjectclassmanager': 'Subject Class Manager',
      '/feemanager': 'Fee Manager',
      '/adminattendance': 'Attendance',
      '/teacherstudentview': 'My Students',
      '/teachergrades': 'Student Grades',
      '/teacherrankings': 'Student Rankings',
      '/teacherattendance': 'Attendance',
      '/timetablemanager': 'Timetables',
      '/teachertimetable': 'My Timetable',
      '/studentgradesview': 'My Grades',
      '/studentfeeview': 'My Fees',
      '/studenttimetable': 'My Timetable',
    };
    return titles[path] || 'Dashboard';
  };

  const hideNavAndHeader = location.pathname === '/welcome' || location.pathname === '/auth';
  
    if (loading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      );
    }

    return (
      <div className="flex flex-col md:flex-row min-h-screen min-w-fit font-sans bg-[#ffffff]">
        {!hideNavAndHeader && (
          <>
            <button
              className={`md:hidden fixed top-4 left-4 p-2 bg-blue-500 z-40
                ${isNavOpen ? 'hidden' : 'block'} text-white rounded-lg transition-opacity duration-300`}
              onClick={() => setIsNavOpen(!isNavOpen)}
            >
              <Menu size={24} />
            </button>
            <div
            className={`
              fixed top-0 left-0 h-screen w-64 md:w-56 bg-blue-500 z-40 
              transition-all duration-300 ease-in-out
              ${isNavOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 md:translate-x-0 md:opacity-100'}
            `}
            >
              <LeftNav userRole={userRole ?? undefined} accessibleRoutes={accessibleRoutes} onClose={() => setIsNavOpen(false)}/>
            </div>
          </>
        )}
        <div className={`flex-1 w-full h-full ${!hideNavAndHeader ? 'md:ml-56 pt-20' : ''}`}>
          {!hideNavAndHeader &&
            <Header 
              title={getPageTitle()} 
              userId={user?.id} 
              userRole={userRole} 
              userEmail={user?.email}
            />
          }
          <main className="md:p-6 p-4">
            <Routes>
              <Route path="/welcome" element={<SchoolRoleSelection />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                    <>
                      {userRole === 'admin' && <Dashboard schoolId={schoolId}/>}
                      {userRole === 'teacher' && <TeacherDashboard />}
                      {userRole === 'student' && <StudentDashboard />}
                    </>
                  </ProtectedRoute>
                }
              />
                <Route path="/staff" element={
                  <ProtectedRoute roles={['admin']}>
                    <Teachers schoolId={schoolId} schoolName={schoolName} />
                  </ProtectedRoute>
                } />
               <Route
                path="/studentfees"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <StudentFees schoolId={schoolId} adminId={user?.id || ''} currentTerm={currentTerm} />
                  </ProtectedRoute>
                }
              />
               <Route
                path="/studentgrades"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <StudentGrades schoolId={schoolId} currentTerm={currentTerm}/>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/classsubjectmanager"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <ClassSubjectManager schoolId={schoolId} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subjectclassmanager"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <SubjectClassManager schoolId={schoolId} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/feemanager"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <FeeManager schoolId={schoolId} currentTerm={currentTerm}/>
                  </ProtectedRoute>
                }
                />
              <Route
                path="/timetablemanager"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <TimetableManager schoolId={schoolId}/>
                  </ProtectedRoute>
                }
                />
              <Route
                path="/students"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Students schoolId={schoolId} schoolName={schoolName}/>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/adminattendance"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminAttendance schoolId={schoolId}/>
                  </ProtectedRoute>
                }
              />          
              <Route
                path="/teacherstudentview"
                element={
                  <ProtectedRoute roles={['teacher']}>
                    <TeacherStudentView 
                      teacherId={user?.id || ''} 
                      schoolId={schoolId}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teachergrades"
                element={
                  <ProtectedRoute roles={['teacher']}>
                    <TeacherGrades 
                      teacherId={user?.id || ''} 
                      schoolId={schoolId}
                      currentTerm={currentTerm}
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/teacherrankings"
                element={
                  <ProtectedRoute roles={['teacher']}>
                    <TeacherStudentRankings 
                      teacherId={user?.id || ''} 
                      schoolId={schoolId}
                      currentTerm={currentTerm}
                    />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/teacherattendance"
                element={
                  <ProtectedRoute roles={['teacher']}>
                    <TeacherAttendance 
                      teacherId={user?.id || ''} 
                      schoolId={schoolId}
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/teachertimetable"
                element={
                  <ProtectedRoute roles={['teacher']}>
                    <TeacherTimetable 
                      teacherId={user?.id || ''} 
                      schoolId={schoolId}
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/studentgradesview"
                element={
                  <ProtectedRoute roles={['student']}>
                    <StudentGradesView 
                      studentId={user?.id || ''} 
                      schoolId={schoolId}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/studentfeeview"
                element={
                  <ProtectedRoute roles={['student']}>
                    <StudentFeeView 
                      studentId={user?.id || ''} 
                      schoolId={schoolId}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/studenttimetable"
                element={
                  <ProtectedRoute roles={['student']}>
                    <StudentTimetable 
                      studentId={user?.id || ''} 
                      schoolId={schoolId}
                    />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
        {isNavOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300"
            onClick={() => setIsNavOpen(false)}
          />
        )}
      </div>
    );
  };
  
  export default AppContent;

