import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import LeftNav from './Components/LeftNav';
import { Menu } from 'lucide-react';
import Header from './Components/Header';
import Dashboard from './pages/admin/dashboard';
import Teachers from './pages/admin/teachers';
import Students from './pages/admin/students';
import StudentGrades from './pages/admin/studentgrades';
import RoleSelection from './pages/roleselection';
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();
  const { user, userRole, loading } = useAuth();
  const schoolId = localStorage.getItem('school_id') || '';
  const schoolName = localStorage.getItem('school_name') || '';

  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      setIsMobile(newIsMobile);
      
      // Only auto-close if going from desktop to mobile
      if (!newIsMobile && isMobile) {
        setIsNavOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Close nav when route changes (only on mobile)
  useEffect(() => {
    if (isMobile) {
      setIsNavOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Role-based styling for the menu button
  const getButtonStyle = () => {
    switch (userRole) {
      case 'admin':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'teacher':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'student':
        return 'bg-purple-600 hover:bg-purple-700 text-white';
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  const accessibleRoutes = {
    admin: ['/', '/teachers', '/students', '/studentfees', '/studentgrades', '/classsubjectmanager', '/subjectclassmanager', '/feemanager', '/timetablemanager', '/adminattendance'],
    teacher: ['/', '/teacherstudentview', '/teachergrades', '/teacherrankings', '/teacherattendance', '/teachertimetable'],
    student: ['/', '/studentgradesview', '/studentfeeview', '/studenttimetable'],
  };
  
  const getPageTitle = () => {
    const path = location.pathname;
    const titles: { [key: string]: string } = {
      '/': 'Dashboard',
      '/teachers': 'Teachers',
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

  const hideNavAndHeader = location.pathname === '/role-selection' || location.pathname === '/auth';

  // Close nav when route changes
  React.useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname]);

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
            className={`md:hidden fixed top-4 left-4 p-2 z-40 rounded-lg shadow-lg transition-all duration-200 ${getButtonStyle()} ${
              (isNavOpen || !isMobile) ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
            }`}
            onClick={() => setIsNavOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={24} />
          </button>
          {/* Overlay - only show on mobile when nav is open */}
          {isMobile && (
            <div
              className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
                isNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => setIsNavOpen(false)}
            />
          )}
          {/* LeftNav with animation */}
          <div
            className={`fixed top-0 left-0 h-screen w-64 md:w-56 z-40 transition-all duration-300 ease-in-out ${
              isMobile ? (isNavOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
            }`}
          >
            <LeftNav 
              userRole={userRole ?? undefined} 
              accessibleRoutes={accessibleRoutes} 
              schoolName={schoolName} 
            />
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
            <Route path="/role-selection" element={<RoleSelection />} />
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
            <Route
              path="/teachers"
              element={
                <ProtectedRoute roles={['admin']}>
                  {schoolId && schoolName ? (
                    <Teachers schoolId={schoolId} schoolName={schoolName} />
                  ) : (
                    <div>Error: School ID or School Name is missing</div>
                  )}
                </ProtectedRoute>
              }
            />
            <Route
              path="/studentfees"
              element={
                <ProtectedRoute roles={['admin']}>
                  <StudentFees schoolId={schoolId} currentSemester="2025 Spring" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studentgrades"
              element={
                <ProtectedRoute roles={['admin']}>
                  <StudentGrades schoolId={schoolId} currentSemester="2025 Spring" />
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
                  <FeeManager schoolId={schoolId}/>
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
    </div>
  );
};

export default AppContent;