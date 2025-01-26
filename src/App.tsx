import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import LeftNav from './Components/LeftNav';
import Header from './Components/Header';
import Dashboard from './pages/dashboard';
import Communication from './pages/communication';
import Events from './pages/events';
import ExamResult from './pages/exam-result';
import Messages from './pages/messages';
import News from './pages/news';
import Settings from './pages/settings';
import Timetable from './pages/timetable';

const AppContent = () => {
  const location = useLocation();
  
  const getPageTitle = () => {
    const path = location.pathname;
    const titles: { [key: string]: string } = {
      '/': 'Dashboard',
      '/communication': 'Communication',
      '/events': 'Events',
      '/exam-result': 'Exam Result',
      '/messages': 'Messages',
      '/news': 'News',
      '/settings': 'Settings',
      '/timetable': 'Timetable'
    };
    return titles[path] || 'Dashboard';
  };

  return (
    <div className="flex min-h-screen font-sans bg-[#ffffff]">
      <LeftNav />
      <div className="flex-1 ml-56">
        <Header title={getPageTitle()} />
        <main className="p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/exam-result" element={<ExamResult />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/news" element={<News />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/communication" element={<Communication />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;