import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import LeftNav from './Components/LeftNav';
import { Menu } from 'lucide-react';
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
  const [isNavOpen, setIsNavOpen] = React.useState(false);
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
    <div className="flex flex-col md:flex-row h-full w-full font-sans bg-[#ffffff]">
      {/* Mobile menu button */}
      <button 
        className={`md:hidden fixed top-2 left-4 p-2 bg-blue-500 z-40
          ${isNavOpen ? 'hidden' : 'block'} text-white rounded-lg`}
        onClick={() => setIsNavOpen(!isNavOpen)}
      >
        <Menu size={24} />
      </button>
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen w-64 md:w-56 bg-blue-500 z-40 transition-transform duration-200 ease-in-out
        ${isNavOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <LeftNav />
      </div>
      <div className="flex-1 w-full h-full md:ml-56 pt-20">
        <Header title={getPageTitle()} />
        <main className="md:p-6 p-4">
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
      {/* Overlay for mobile */}
      {isNavOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsNavOpen(false)}
        />
      )}
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