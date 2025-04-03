import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import LeftNav from './Components/LeftNav';
import { Menu } from 'lucide-react';
import Header from './Components/Header';
import Dashboard from './pages/dashboard';
import Teachers from './pages/teachers';
import Students from './pages/students';
import StudentGrades from './pages/studentgrades';
import RoleSelection from './pages/roleselection';
import AuthPage from './pages/authpage';
import ProtectedRoute from '../src/routes/ProtectedRoute';
import { useAuth } from '../src/context/AuthContext';
import StudentDashboard from './pages/studentdashboard';
import TeacherDashboard from './pages/teacherdashboard';
import StudentFees from './pages/studentfees';
import ClassSubjectManager from './pages/classsubjectmanager';
import SubjectClassManager from './pages/subjectclassmanager';
import FeeManager from './pages/feemanager';

const AppContent = () => {
    const [isNavOpen, setIsNavOpen] = React.useState(false);
    const location = useLocation();
    const { userRole } = useAuth();
    const schoolId = localStorage.getItem('school_id') || '';
    const schoolName = localStorage.getItem('school_name') || '';
  
    const accessibleRoutes = {
      admin: ['/', '/teachers', '/students', '/studentfees', '/studentgrades', '/classsubjectmanager', '/subjectclassmanager', '/feemanager'],
      teacher: ['/'],
      student: ['/'],
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
      };
      return titles[path] || 'Dashboard';
    };
  
    const hideNavAndHeader = location.pathname === '/role-selection' || location.pathname === '/auth';
  
    return (
      <div className="flex flex-col md:flex-row min-h-screen w-full font-sans bg-[#ffffff]">
        {!hideNavAndHeader && (
          <>
            <button
              className={`md:hidden fixed top-2 left-4 p-2 bg-blue-500 z-40
                ${isNavOpen ? 'hidden' : 'block'} text-white rounded-lg`}
              onClick={() => setIsNavOpen(!isNavOpen)}
            >
              <Menu size={24} />
            </button>
            <div
              className={`
                fixed top-0 left-0 h-screen w-64 md:w-56 bg-blue-500 z-40 transition-transform duration-200 ease-in-out
                ${isNavOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
            >
              <LeftNav userRole={userRole ?? undefined} accessibleRoutes={accessibleRoutes} />
            </div>
          </>
        )}
        <div className={`flex-1 w-full h-full ${!hideNavAndHeader ? 'md:ml-56 pt-20' : ''}`}>
          {!hideNavAndHeader && <Header title={getPageTitle()} />}
          <main className="md:p-6 p-4">
            <Routes>
              <Route path="/role-selection" element={<RoleSelection />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                    <>
                      {userRole === 'admin' && <Dashboard />}
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
                path="/students"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Students schoolId={schoolId} schoolName={schoolName}/>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
        {isNavOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => setIsNavOpen(false)}
          />
        )}
      </div>
    );
  };
  
  export default AppContent;
  