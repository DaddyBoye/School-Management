import React, { useState } from "react";

interface Subject {
  name: string;
  classScore: number;
  examScore: number;
}

interface Student {
  id: number;
  name: string;
  grade: string;
  subjects?: Subject[];
}

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([ ]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newStudentName, setNewStudentName] = useState("");

  const viewReport = (student: Student) => {
    setSelectedStudent(student);
  };

  const closeReport = () => {
    setSelectedStudent(null);
  };

  const updateSubjectScore = (subjectIndex: number, field: keyof Subject, value: number) => {
    if (!selectedStudent) return;
    if (value > 50) value = 50;
    if (value < 0) value = 0;
    
    const updatedSubjects = [...(selectedStudent.subjects || [])];
    updatedSubjects[subjectIndex] = {
      ...updatedSubjects[subjectIndex],
      [field]: value,
    };
    setSelectedStudent({ ...selectedStudent, subjects: updatedSubjects });
  };

  const addStudent = () => {
    if (!newStudentName.trim()) return;
    const newStudent: Student = {
      id: students.length + 1,
      name: newStudentName,
      grade: "Pending",
      subjects: [
        { name: "Math", classScore: 0, examScore: 0 },
        { name: "English", classScore: 0, examScore: 0 },
        { name: "Science", classScore: 0, examScore: 0 },
      ],
    };
    setStudents([...students, newStudent]);
    setNewStudentName("");
  };

  const deleteStudent = (id: number) => {
    setStudents(students.filter(student => student.id !== id));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Students List</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Enter student name"
          value={newStudentName}
          onChange={(e) => setNewStudentName(e.target.value)}
          className="border p-2 mr-2"
        />
        <button className="bg-green-500 text-white px-4 py-2" onClick={addStudent}>
          Add Student
        </button>
      </div>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2">ID</th>
            <th className="border border-gray-300 px-4 py-2">Name</th>
            <th className="border border-gray-300 px-4 py-2">Grade</th>
            <th className="border border-gray-300 px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} className="text-center">
              <td className="border border-gray-300 px-4 py-2">{student.id}</td>
              <td className="border border-gray-300 px-4 py-2">{student.name}</td>
              <td className="border border-gray-300 px-4 py-2">{student.grade}</td>
              <td className="border border-gray-300 px-4 py-2">
                <button className="bg-purple-500 text-white px-3 py-1 mr-2" onClick={() => viewReport(student)}>
                  View Report
                </button>
                <button className="bg-red-500 text-white px-3 py-1" onClick={() => deleteStudent(student.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedStudent && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-2">Report Slip: {selectedStudent.name}</h2>
            <p className="mb-2">Grade: {selectedStudent.grade}</p>
            <table className="w-full border-collapse border border-gray-300 mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2">Subject</th>
                  <th className="border border-gray-300 px-4 py-2">Class Score (50)</th>
                  <th className="border border-gray-300 px-4 py-2">Exam Score (50)</th>
                  <th className="border border-gray-300 px-4 py-2">Total (100)</th>
                </tr>
              </thead>
              <tbody>
                {selectedStudent.subjects?.map((subject, index) => (
                  <tr key={index} className="text-center">
                    <td className="border border-gray-300 px-4 py-2">{subject.name}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={subject.classScore}
                        onChange={(e) => updateSubjectScore(index, "classScore", Number(e.target.value))}
                        className="w-full text-center"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={subject.examScore}
                        onChange={(e) => updateSubjectScore(index, "examScore", Number(e.target.value))}
                        className="w-full text-center"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {((subject.classScore + subject.examScore) / 100) * 100}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="bg-red-500 text-white px-4 py-2" onClick={closeReport}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students; 