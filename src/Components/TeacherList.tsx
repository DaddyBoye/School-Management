import { useState } from 'react';
import { MoreVertical, ChevronDown } from 'lucide-react';

const TeacherList = () => {
  const [filters, setFilters] = useState({
    class: '',
    subject: ''
  });

  // More diverse sample data
  const teachers = [
    {
      id: 1,
      name: 'Michael Gyimadu',
      class: 'Grade 5',
      subject: 'English',
      email: 'michaelgyimadu032@gmail.com',
      avatar: '/api/placeholder/32/32'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      class: 'Grade 6',
      subject: 'Math',
      email: 'sarahj@gmail.com',
      avatar: '/api/placeholder/32/32'
    },
    {
      id: 3,
      name: 'James Wilson',
      class: 'Grade 5',
      subject: 'Science',
      email: 'jwilson@gmail.com',
      avatar: '/api/placeholder/32/32'
    },
    {
      id: 4,
      name: 'Emma Davis',
      class: 'Grade 6',
      subject: 'English',
      email: 'emmad@gmail.com',
      avatar: '/api/placeholder/32/32'
    },
    {
      id: 5,
      name: 'Robert Chen',
      class: 'Grade 5',
      subject: 'Math',
      email: 'rchen@gmail.com',
      avatar: '/api/placeholder/32/32'
    }
  ];

  // Get unique values for filters
  const classes = [...new Set(teachers.map(t => t.class))];
  const subjects = [...new Set(teachers.map(t => t.subject))];

  // Filter teachers based on selected filters
  const filteredTeachers = teachers.filter(teacher => {
    const classMatch = !filters.class || teacher.class === filters.class;
    const subjectMatch = !filters.subject || teacher.subject === filters.subject;
    return classMatch && subjectMatch;
  });

  return (
    <div className="w-full px-4 bg-white border rounded-xl shadow-sm">
      <div className="px-4 pt-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-xl text-black font-semibold">Teacher List</div>
          <div className="flex gap-2">
            <div className="relative">
              <select
              className="appearance-none font-semibold bg-gray-100 hover:bg-gray-200 border rounded-lg py-1 px-3 pr-8 text-black text-sm"
              value={filters.class}
              onChange={(e) => setFilters({ ...filters, class: e.target.value })}
              >
              <option value="" className="bg-white text-black">All Classes</option>
              {classes.map(cls => (
                <option key={cls} value={cls} className="bg-white text-black">{cls}</option>
              ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
            <div className="relative">
              <select
              className="appearance-none font-semibold bg-gray-100 hover:bg-gray-200 border rounded-lg py-1 px-3 pr-8 text-black text-sm"
              value={filters.subject}
              onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
              >
              <option value="" className="bg-white text-black">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject} className="bg-white text-black">{subject}</option>
              ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto -mt-4">
          <div className="min-w-full">
            {/* Header */}
            <div className="border-b bg-gray-50">
              <div className="flex">
                <div className="w-1/4 py-2 px-4 text-xs font-medium text-gray-700">Name</div>
                <div className="w-1/6 py-2 px-4 text-xs font-medium text-gray-700">Class</div>
                <div className="w-1/6 py-2 px-4 text-xs font-medium text-gray-700">Subject</div>
                <div className="w-1/3 py-2 px-4 text-xs font-medium text-gray-700">Email</div>
                <div className="w-1/12 py-2 px-4 text-xs font-medium text-gray-700">Action</div>
              </div>
            </div>

            {/* Scrollable container */}
            <div className="max-h-40 overflow-y-auto scrollbar-thiner">
            {/* Teacher Rows */}
              {filteredTeachers.map((teacher) => (
                <div 
                  key={teacher.id} 
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-1/4 py-2 px-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={teacher.avatar}
                          alt={teacher.name}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-xs text-gray-900">{teacher.name}</span>
                      </div>
                    </div>
                    <div className="w-1/6 py-2 px-4 text-xs text-gray-900">{teacher.class}</div>
                    <div className="w-1/6 py-2 px-4 text-xs text-gray-900">{teacher.subject}</div>
                    <div className="w-1/3 py-2 px-4 text-xs text-gray-900">{teacher.email}</div>
                    <div className="w-1/12 py-2 px-4">
                      <button className="p-1 hover:bg-gray-100 rounded bg-white transition-colors">
                        <MoreVertical className="h-3 w-3 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
};

export default TeacherList;