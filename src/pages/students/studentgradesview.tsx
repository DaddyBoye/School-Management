import React, { useState, useEffect } from 'react';
import { supabase } from "../../supabase";
import { 
  BookOpen, 
  BarChart2, 
  Loader2,
  ChevronDown,
  ChevronRight,
  Users,
  Bookmark
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DownloadOutlined } from '@ant-design/icons';

interface Grade {
  id: string;
  student_id: string;
  subject_id: string;
  score: number;
  max_score: number;
  category_id: string;
  teacher_id: string;
  semester: string;
  comments?: string;
  date_given: string;
  category_name?: string; // Added to support category_name property
}

interface SubjectInfo {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  teacher_id: string;
  teacher_name: string;
  categories: {
    id: string;
    name: string;
    weight: number;
  }[];
  grades: Grade[];
  average: number | null;
}

interface StudentGradesViewProps {
  studentId: string;
  schoolId: string;
  currentSemester?: string;
}

const StudentGradesView: React.FC<StudentGradesViewProps> = ({ 
  studentId, 
  schoolId,
  currentSemester = new Date().getFullYear() + ' Spring'
}) => {
  // Data state
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [selectedSemester, setSelectedSemester] = useState(currentSemester);
  
  // Fetch all student data (subjects, teachers, categories, and grades)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // 1. First get the student's class
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('class_id')
          .eq('user_id', studentId)
          .single();

        if (studentError) throw studentError;
        if (!studentData) throw new Error('Student not found');

        const classId = studentData.class_id;

        // 2. Get all subjects for the student's class
        const { data: classSubjectsData, error: classSubjectsError } = await supabase
          .from('class_subjects')
          .select(`
            subject_id,
            subjects!inner(name, code)
          `)
          .eq('class_id', classId);

        if (classSubjectsError) throw classSubjectsError;

        // 3. Get all teachers for these subjects
        const { data: teachersData, error: teachersError } = await supabase
          .from('teacher_subjects')
          .select(`
            subject_id,
            teacher_id,
            teachers!inner(user_id, first_name, last_name)
          `)
          .eq('class_id', classId)
          .eq('school_id', schoolId);

        if (teachersError) throw teachersError;

        // 4. Get grade categories for these subjects
        const subjectIds = classSubjectsData.map(cs => cs.subject_id);
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('grade_categories')
          .select('*')
          .in('subject_id', subjectIds);

        if (categoriesError) throw categoriesError;

        // 5. Get existing grades for the student (for the selected semester)
        const { data: gradesData, error: gradesError } = await supabase
          .from('grades')
          .select('*')
          .eq('student_id', studentId)
          .eq('semester', selectedSemester)
          .order('date_given', { ascending: false });

        if (gradesError) throw gradesError;

        // 6. Get category names for the grades
        const categoryIds = [...new Set((gradesData?.map(g => g.category_id) || []))];
        const { data: gradeCategoriesData, error: gradeCategoriesError } = await supabase
          .from('grade_categories')
          .select('id, name')
          .in('id', categoryIds);

        if (gradeCategoriesError) throw gradeCategoriesError;

        // Create a map of category IDs to names
        const categoryMap = new Map((gradeCategoriesData?.map(c => [c.id, c.name]) || []));

        // Organize all this data into a coherent structure
        const organizedSubjects: SubjectInfo[] = [];

        classSubjectsData.forEach(classSubject => {
          const subjectId = classSubject.subject_id;
          const subjectName = Array.isArray(classSubject.subjects) 
            ? classSubject.subjects[0].name 
            : (classSubject.subjects as { name: string; code: string }).name;
          const subjectCode = Array.isArray(classSubject.subjects) 
            ? classSubject.subjects[0].code 
            : (classSubject.subjects as { name: string; code: string }).code;

          // Find teachers for this subject
          const subjectTeachers = teachersData
            .filter(t => t.subject_id === subjectId)
            .map(t => ({
              teacher_id: t.teacher_id,
              teacher_name: Array.isArray(t.teachers) 
                ? `${t.teachers[0].first_name} ${t.teachers[0].last_name}`
                : `${(t.teachers as { first_name: string; last_name: string }).first_name} ${(t.teachers as { first_name: string; last_name: string }).last_name}`
            }));

          // Find categories for this subject
          const subjectCategories = categoriesData
            .filter(c => c.subject_id === subjectId)
            .map(c => ({
              id: c.id,
              name: c.name,
              weight: c.weight
            }));

          // Find grades for this subject
          const subjectGrades = (gradesData || [])
            .filter(g => g.subject_id === subjectId)
            .map(g => ({
              ...g,
              category_name: categoryMap.get(g.category_id) || 'Unknown'
            }));

          // Calculate average for this subject
          let subjectAverage: number | null = null;
          if (subjectGrades.length > 0) {
            // Calculate weighted average based on categories
            let weightedSum = 0;
            let totalWeight = 0;

            subjectCategories.forEach(category => {
              const categoryGrades = subjectGrades.filter(g => g.category_id === category.id);
              if (categoryGrades.length > 0) {
                const categoryAvg = categoryGrades.reduce((sum, grade) => {
                  return sum + (grade.score / grade.max_score * 100);
                }, 0) / categoryGrades.length;
                weightedSum += categoryAvg * category.weight;
                totalWeight += category.weight;
              }
            });

            subjectAverage = totalWeight > 0 ? weightedSum / totalWeight : null;
          }

          organizedSubjects.push({
            subject_id: subjectId,
            subject_name: subjectName,
            subject_code: subjectCode,
            teacher_id: subjectTeachers[0]?.teacher_id || '',
            teacher_name: subjectTeachers[0]?.teacher_name || 'Not assigned',
            categories: subjectCategories,
            grades: subjectGrades,
            average: subjectAverage
          });
        });

        setSubjects(organizedSubjects);

      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (studentId && schoolId) {
      fetchData();
    }
  }, [studentId, schoolId, selectedSemester]);

  // Helper functions
  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return '#8c8c8c';
    if (score >= 90) return '#52c41a';
    if (score >= 80) return '#73d13d';
    if (score >= 70) return '#faad14';
    if (score >= 60) return '#ff7a45';
    return '#ff4d4f';
  };

  const getLetterGrade = (percentage: number | null) => {
    if (percentage === null) return 'N/A';
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const calculateOverallAverage = () => {
    if (subjects.length === 0) return null;
    
    const validSubjects = subjects.filter(s => s.average !== null);
    if (validSubjects.length === 0) return null;
    
    return validSubjects.reduce((sum, subject) => sum + (subject.average || 0), 0) / validSubjects.length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading your academic information...</span>
        </div>
      </div>
    );
  }

  const overallAverage = calculateOverallAverage();

  const generatePDFReport = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(`Academic Report - ${selectedSemester}`, 14, 22);

    // Student Info
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);

    // Summary Table
    autoTable(doc, {
      head: [['Subject', 'Teacher', 'Average', 'Grade']],
      body: subjects.map(subject => [
        `${subject.subject_name} (${subject.subject_code})`,
        subject.teacher_name,
        subject.average ? `${subject.average.toFixed(1)}%` : 'N/A',
        subject.average ? getLetterGrade(subject.average) : 'N/A'
      ]),
      startY: 40,
      theme: 'grid',
      headStyles: {
        fillColor: [114, 46, 209],
        textColor: 255
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 'auto' }
      }
    });

    // Add subject details
    let yPos = doc.lastAutoTable.finalY + 10;
    
    subjects.forEach((subject) => {
      // Add subject header
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text(`${subject.subject_name} (${subject.subject_code})`, 14, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Teacher: ${subject.teacher_name} | Average: ${subject.average?.toFixed(1) || 'N/A'}% (${getLetterGrade(subject.average)})`, 14, yPos);
      yPos += 10;
      
      // Add categories
      doc.setFontSize(10);
      doc.setTextColor(40);
      doc.text('Assessment Categories:', 14, yPos);
      yPos += 8;
      
      subject.categories.forEach(category => {
        doc.text(`- ${category.name}: ${category.weight}%`, 20, yPos);
        yPos += 7;
      });
      
      yPos += 5;
      
      // Add grades table if available
      if (subject.grades.length > 0) {
        autoTable(doc, {
          head: [['Assignment', 'Category', 'Score', 'Date', 'Comments']],
          body: subject.grades.map(grade => [
            `${grade.category_name ?? ''} #${subject.grades.filter(g => g.category_id === grade.category_id).findIndex(g => g.id === grade.id) + 1}`,
            grade.category_name ?? '',
            `${grade.score}/${grade.max_score} (${((grade.score / grade.max_score) * 100).toFixed(1)}%)`,
            new Date(grade.date_given).toLocaleDateString(),
            grade.comments ?? 'None'
          ]),
          startY: yPos,
          theme: 'grid',
          headStyles: {
            fillColor: [64, 64, 64],
            textColor: 255
          },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 'auto' }
          }
        });
        yPos = doc.lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('No grades recorded yet', 14, yPos);
        yPos += 10;
      }
      
      yPos += 10;
    });

    // Add overall summary
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text('Performance Summary', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Overall Average: ${overallAverage?.toFixed(1) || 'N/A'}% (${getLetterGrade(overallAverage)})`, 14, 30);
    
    // Add performance chart (simplified)
    const chartHeight = 100;
    const chartWidth = 160;
    const chartX = 20;
    const chartY = 40;
    const barWidth = chartWidth / subjects.length;
    
    // Draw chart background
    doc.setDrawColor(200);
    doc.setFillColor(240, 240, 240);
    doc.rect(chartX, chartY, chartWidth, chartHeight, 'F');
    
    // Draw bars
    subjects.forEach((subject, i) => {
      if (subject.average) {
        const barHeight = (subject.average / 100) * chartHeight;
        const x = chartX + (i * barWidth);
        const y = chartY + chartHeight - barHeight;
        
        doc.setFillColor(getScoreColor(subject.average));
        doc.rect(x, y, barWidth - 2, barHeight, 'F');
        
        // Add subject label
        doc.setFontSize(6);
        doc.setTextColor(40);
        doc.text(
          subject.subject_code, 
          x + (barWidth / 2) - 5, 
          chartY + chartHeight + 5,
          { angle: 45 }
        );
      }
    });

    // Save the PDF
    doc.save(`Academic_Report_${selectedSemester.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Academic Information</h1>
          
          {/* Semester Selector */}
          <div className="flex-grow sm:flex-grow-0 min-w-[200px]">
            <select
              className="w-full bg-white rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
            >
              <option value={`${new Date().getFullYear()} Spring`}>Spring {new Date().getFullYear()}</option>
              <option value={`${new Date().getFullYear()} Fall`}>Fall {new Date().getFullYear()}</option>
              <option value={`${new Date().getFullYear() - 1} Spring`}>Spring {new Date().getFullYear() - 1}</option>
              <option value={`${new Date().getFullYear() - 1} Fall`}>Fall {new Date().getFullYear() - 1}</option>
            </select>
          </div>

          <button
            onClick={generatePDFReport}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <DownloadOutlined className="w-4 h-4" />
            Download Report
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Subjects</h3>
                <p className="text-2xl font-bold">{subjects.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Teachers</h3>
                <p className="text-2xl font-bold">
                  {new Set(subjects.map(s => s.teacher_id)).size}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <BarChart2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Overall Average</h3>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold" style={{ color: getScoreColor(overallAverage) }}>
                    {overallAverage?.toFixed(1) || 'N/A'}%
                  </p>
                  <span 
                    className="px-2 py-1 text-xs rounded-full font-medium"
                    style={{ 
                      backgroundColor: getScoreColor(overallAverage) + '20',
                      color: getScoreColor(overallAverage)
                    }}
                  >
                    {getLetterGrade(overallAverage)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects List */}
        <div className="space-y-4">
          {subjects.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No subjects found</h3>
              <p className="mt-1 text-gray-500">
                You don't appear to be enrolled in any subjects for this semester.
              </p>
            </div>
          ) : (
            subjects.map(subject => {
              const isExpanded = expandedSubjects[subject.subject_id] || false;
              const hasGrades = subject.grades.length > 0;
              
              return (
                <div key={subject.subject_id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  {/* Subject header */}
                  <button
                    onClick={() => toggleSubject(subject.subject_id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                      <h2 className="text-lg font-medium">
                        {subject.subject_name} <span className="text-gray-500 text-sm">({subject.subject_code})</span>
                      </h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          <Users className="w-4 h-4 inline mr-1" />
                          {subject.teacher_name}
                        </span>
                        {hasGrades && (
                          <>
                            <span 
                              className="font-medium" 
                              style={{ color: getScoreColor(subject.average) }}
                            >
                              {subject.average?.toFixed(1) || 'N/A'}%
                            </span>
                            <span 
                              className="px-2 py-1 text-xs rounded-full font-medium"
                              style={{ 
                                backgroundColor: getScoreColor(subject.average) + '20',
                                color: getScoreColor(subject.average)
                              }}
                            >
                              {getLetterGrade(subject.average)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-200">
                      {/* Subject Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Teacher Information</h3>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-full">
                                <Users className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{subject.teacher_name}</p>
                                <p className="text-sm text-gray-500">
                                  {subject.subject_name} Teacher
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Assessment Categories</h3>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            {subject.categories.length > 0 ? (
                              <div className="space-y-2">
                                {subject.categories.map(category => (
                                  <div key={category.id} className="flex justify-between items-center">
                                    <span className="font-medium">{category.name}</span>
                                    <span className="text-sm text-gray-500">{category.weight}%</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No categories defined for this subject</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Grades Table (only shown if grades exist) */}
                      {hasGrades ? (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Your Grades</h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Assignment
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Score
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Comments
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {subject.grades.map(grade => (
                                  <tr key={grade.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {grade.category_name} #{subject.grades.filter(g => g.category_id === grade.category_id).findIndex(g => g.id === grade.id) + 1}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {grade.category_name}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <span 
                                          className="font-medium" 
                                          style={{ color: getScoreColor((grade.score / grade.max_score) * 100) }}
                                        >
                                          {grade.score}/{grade.max_score}
                                        </span>
                                        <span 
                                          className="text-xs px-2 py-1 rounded-full"
                                          style={{ 
                                            backgroundColor: getScoreColor((grade.score / grade.max_score) * 100) + '20',
                                            color: getScoreColor((grade.score / grade.max_score) * 100)
                                          }}
                                        >
                                          {((grade.score / grade.max_score) * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {new Date(grade.date_given).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-500 max-w-xs">
                                      {grade.comments || '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                          <Bookmark className="mx-auto h-6 w-6 text-blue-400" />
                          <h3 className="mt-2 text-sm font-medium text-blue-800">No grades recorded yet</h3>
                          <p className="mt-1 text-sm text-blue-600">
                            Your teacher hasn't entered any grades for {subject.subject_name} this semester.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Overall Performance Summary */}
        {subjects.some(s => s.grades.length > 0) && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-purple-600" />
                Performance Summary
              </h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {subjects.filter(s => s.grades.length > 0).map(subject => (
                  <div key={subject.subject_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h3 className="font-medium mb-2 flex items-center justify-between">
                      <span>
                        {subject.subject_name} ({subject.subject_code})
                      </span>
                      <span 
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ 
                          backgroundColor: getScoreColor(subject.average) + '20',
                          color: getScoreColor(subject.average)
                        }}
                      >
                        {getLetterGrade(subject.average)}
                      </span>
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <span 
                          className="font-bold text-lg"
                          style={{ color: getScoreColor(subject.average) }}
                        >
                          {subject.average?.toFixed(1)}%
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {subject.grades.length} assignments
                        </p>
                      </div>
                      <div 
                        className="w-16 h-3 bg-gray-200 rounded-full overflow-hidden"
                        title={`${subject.average?.toFixed(1)}%`}
                      >
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${Math.min(100, Math.max(0, subject.average || 0))}%`,
                            backgroundColor: getScoreColor(subject.average)
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentGradesView;