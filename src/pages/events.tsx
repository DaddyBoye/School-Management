import { useState } from 'react';
import { Search, Plus, X, Edit2, Mail, Phone, Book, Calendar, MapPin } from 'lucide-react';

const TeachersList = () => {
  const [teachers, setTeachers] = useState([
    {
      id: 1,
      name: "Michael Gyimadu",
      email: "michaelgyimadu032@gmail.com",
      phone: "+233 54 123 4567",
      class: "Grade 5",
      subject: "English",
      joinDate: "2022-09-01",
      address: "123 Education Street, Accra",
      education: "Master's in Education",
      experience: "5 years"
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarahj@gmail.com",
      phone: "+233 54 987 6543",
      class: "Grade 6",
      subject: "Math",
      joinDate: "2021-08-15",
      address: "456 Teaching Avenue, Kumasi",
      education: "Bachelor's in Mathematics",
      experience: "3 years"
    }
  ]);

  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === "All Classes" || teacher.class === selectedClass;
    const matchesSubject = selectedSubject === "All Subjects" || teacher.subject === selectedSubject;
    return matchesSearch && matchesClass && matchesSubject;
  });

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setTeachers(teachers.map(teacher => 
      teacher.id === editFormData.id ? editFormData : teacher
    ));
    setIsEditing(false);
    setSelectedTeacher(editFormData);
    setEditFormData(null);
  };

  const startEditing = (teacher) => {
    setEditFormData({ ...teacher });
    setIsEditing(true);
  };

  return (
    <div className="text-black h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Teachers</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 w-full md:w-auto justify-center"
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
                <div className="font-medium">{teacher.name}</div>
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
                <div className="text-right">
                  <button
                    onClick={() => setSelectedTeacher(teacher)}
                    className="text-black bg-gray-300 hover:text-blue-600"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
                        {selectedTeacher.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{selectedTeacher.name}</h3>
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
                      placeholder="Full Name"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    />
                    <select
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData.class}
                      onChange={(e) => setEditFormData({...editFormData, class: e.target.value})}
                    >
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                    </select>
                    <select
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData.subject}
                      onChange={(e) => setEditFormData({...editFormData, subject: e.target.value})}
                    >
                      <option value="English">English</option>
                      <option value="Math">Math</option>
                      <option value="Science">Science</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Education"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData.education}
                      onChange={(e) => setEditFormData({...editFormData, education: e.target.value})}
                    />
                    <input
                      type="text"
                      placeholder="Experience"
                      className="border bg-gray-300 rounded-lg px-4 py-2"
                      value={editFormData.experience}
                      onChange={(e) => setEditFormData({...editFormData, experience: e.target.value})}
                    />
                    <input
                      type="text"
                      placeholder="Address"
                      className="border bg-gray-300 rounded-lg px-4 py-2 md:col-span-2"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 border bg-red-600 rounded-lg"
                      onClick={() => {
                        setIsEditing(false);
                        setEditFormData(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Save Changes
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
                  className="text-gray-500 bg-gray-300 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    className="border bg-gray-300 rounded-lg px-4 py-2"
                  />
                  <select className="border bg-gray-300 rounded-lg px-4 py-2">
                    <option value="">Select Class</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>
                  </select>
                  <select className="border bg-gray-300 rounded-lg px-4 py-2">
                    <option value="">Select Subject</option>
                    <option value="English">English</option>
                    <option value="Math">Math</option>
                    <option value="Science">Science</option>
                  </select>

<input
  type="text"
  placeholder="Education"
  className="border bg-gray-300 rounded-lg px-4 py-2"
/>
<input
  type="text"
  placeholder="Experience"
  className="border bg-gray-300 rounded-lg px-4 py-2"
/>
<input
  type="text"
  placeholder="Address"
  className="border bg-gray-300 rounded-lg px-4 py-2 md:col-span-2"
/>
</div>
<div className="flex justify-end gap-2">
<button
  type="button"
  className="px-4 py-2 border bg-red-600 rounded-lg"
  onClick={() => setShowAddModal(false)}
>
  Cancel
</button>
<button
  type="submit"
  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
>
  Add Teacher
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