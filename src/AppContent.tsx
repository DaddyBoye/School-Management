import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import LeftNav from './Components/LeftNav';
import { Menu } from 'lucide-react';
import Header from './Components/Header';
import Dashboard from './pages/dashboard';
import Teachers from './pages/teachers';
import ExamResult from './pages/exam-result';
import Messages from './pages/messages';
import Payroll from './pages/payroll';
import Settings from './pages/settings';
import Timetable from './pages/timetable';
import RoleSelection from './pages/roleselection';
import AuthPage from './pages/authpage';
import Attendance from './pages/attendance';
import ProtectedRoute from '../src/routes/ProtectedRoute';
import { useAuth } from '../src/context/AuthContext';

const AppContent = () => {
    const [isNavOpen, setIsNavOpen] = React.useState(false);
    const location = useLocation();
    const { userRole } = useAuth();
    const schoolId = localStorage.getItem('school_id');
    const schoolName = localStorage.getItem('school_name');
  
    const accessibleRoutes = {
      admin: ['/', '/teachers', '/messages', '/timetable', '/attendance', '/exam-result', '/settings', '/payroll'],
      teacher: ['/', '/messages', '/timetable', '/attendance', '/exam-result'],
      student: ['/', '/messages', '/timetable', '/exam-result', '/attendance'],
      parent: ['/', '/messages', '/exam-result'],
    };
  
    const getPageTitle = () => {
      const path = location.pathname;
      const titles: { [key: string]: string } = {
        '/': 'Dashboard',
        '/teachers': 'Teachers',
        '/exam-result': 'Exam Result',
        '/messages': 'Messages',
        '/payroll': 'Payroll',
        '/settings': 'Settings',
        '/timetable': 'Timetable',
        '/attendance': 'Attendance',
      };
      return titles[path] || 'Dashboard';
    };
  
    const hideNavAndHeader = location.pathname === '/role-selection' || location.pathname === '/auth';
  
    return (
      <div className="flex flex-col md:flex-row h-full w-full font-sans bg-[#ffffff]">
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
                    <Dashboard />
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
                path="/exam-result"
                element={
                  <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                    <ExamResult />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                    <Messages />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payroll"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Payroll />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/timetable"
                element={
                  <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                    <Timetable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute roles={['admin', 'student']}>
                    <Attendance />
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
  