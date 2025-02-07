import React, { useState } from "react";

interface Teacher {
  id: number;
  name: string;
  subject: string;
}

const Teachers: React.FC = () => {
  // Initial teachers list
  const [teachers, setTeachers] = useState<Teacher[]>([
    { id: 1, name: "John Doe", subject: "Mathematics" },
    { id: 2, name: "Jane Smith", subject: "English" },
    { id: 3, name: "Michael Brown", subject: "Science" },
  ]);

  // State for new teacher input
  const [newTeacher, setNewTeacher] = useState<Teacher>({
    id: 0,
    name: "",
    subject: "",
  });

  // State to track editing teacher
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // 🔹 Function to Add a New Teacher
  const addTeacher = () => {
    if (!newTeacher.name || !newTeacher.subject) return;
    
    const newId = teachers.length > 0 ? teachers[teachers.length - 1].id + 1 : 1;
    setTeachers([...teachers, { ...newTeacher, id: newId }]);
    setNewTeacher({ id: 0, name: "", subject: "" }); // Reset input fields
  };

  // 🔹 Function to Delete a Teacher
  const deleteTeacher = (id: number) => {
    setTeachers(teachers.filter((teacher) => teacher.id !== id));
  };

  // 🔹 Function to Start Editing a Teacher
  const startEditing = (teacher: Teacher) => {
    setEditingTeacher(teacher);
  };

  // 🔹 Function to Update a Teacher
  const updateTeacher = () => {
    if (!editingTeacher) return;
    
    setTeachers(
      teachers.map((teacher) =>
        teacher.id === editingTeacher.id ? editingTeacher : teacher
      )
    );
    setEditingTeacher(null); // Reset editing state
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Teachers List</h1>

      {/* 🔹 Add New Teacher Form */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Teacher Name"
          className="border p-2 mr-2"
          value={newTeacher.name}
          onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Subject"
          className="border p-2 mr-2"
          value={newTeacher.subject}
          onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
        />
        <button className="bg-blue-500 text-white px-4 py-2" onClick={addTeacher}>
          Add Teacher
        </button>
      </div>

      {/* 🔹 Edit Teacher Form (Only visible when editing) */}
      {editingTeacher && (
        <div className="mb-4">
          <input
            type="text"
            className="border p-2 mr-2"
            value={editingTeacher.name}
            onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
          />
          <input
            type="text"
            className="border p-2 mr-2"
            value={editingTeacher.subject}
            onChange={(e) =>
              setEditingTeacher({ ...editingTeacher, subject: e.target.value })
            }
          />
          <button className="bg-green-500 text-white px-4 py-2" onClick={updateTeacher}>
            Update Teacher
          </button>
        </div>
      )}

      {/* 🔹 Teachers Table */}
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2">ID</th>
            <th className="border border-gray-300 px-4 py-2">Name</th>
            <th className="border border-gray-300 px-4 py-2">Subject</th>
            <th className="border border-gray-300 px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((teacher) => (
            <tr key={teacher.id} className="text-center">
              <td className="border border-gray-300 px-4 py-2">{teacher.id}</td>
              <td className="border border-gray-300 px-4 py-2">{teacher.name}</td>
              <td className="border border-gray-300 px-4 py-2">{teacher.subject}</td>
              <td className="border border-gray-300 px-4 py-2">
                <button
                  className="bg-yellow-500 text-white px-3 py-1 mr-2"
                  onClick={() => startEditing(teacher)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-500 text-white px-3 py-1"
                  onClick={() => deleteTeacher(teacher.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Teachers;
