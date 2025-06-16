import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { supabase } from "../supabase";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  gender?: string;
  class_id: string;
}

interface Class {
  id: string;
  name: string;
  grade: string;
}

interface GradeData {
  grade: string;
  boys: number;
  girls: number;
  total: number;
}

const COLORS = {
  boys: '#4CB9FF',
  girls: '#FF6B8A',
  other: '#A0AEC0'
};

const StudentDistribution = ({ schoolId }: { schoolId: string }) => {
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('All Grades');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [gradeData, setGradeData] = useState<GradeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch classes
        const { data: classesData, error: classesError } = await supabase
          .from("classes")
          .select("*")
          .eq("school_id", schoolId);

        if (classesError) throw classesError;

        // Fetch students
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, first_name, last_name, gender, class_id")
          .eq("school_id", schoolId);

        if (studentsError) throw studentsError;

        setClasses(classesData || []);
        setStudents(studentsData || []);
        
        // Process data to get grade distribution
        if (classesData && studentsData) {
          const gradesMap = new Map<string, GradeData>();
          
          // Initialize grades from classes
          classesData.forEach(cls => {
            const grade = cls.grade || 'Ungraded';
            if (!gradesMap.has(grade)) {
              gradesMap.set(grade, {
                grade,
                boys: 0,
                girls: 0,
                total: 0
              });
            }
          });
          
          // Count students by gender for each grade
          studentsData.forEach(student => {
            const studentClass = classesData.find(c => c.id === student.class_id);
            const grade = studentClass?.grade || 'Ungraded';
            
            const gradeInfo = gradesMap.get(grade) || {
              grade,
              boys: 0,
              girls: 0,
              total: 0
            };
            
            if (student.gender === 'Male') {
              gradeInfo.boys++;
            } else if (student.gender === 'Female') {
              gradeInfo.girls++;
            }
            
            gradeInfo.total++;
            gradesMap.set(grade, gradeInfo);
          });
          
          // Convert to array and sort by grade
          const gradesArray = Array.from(gradesMap.values()).sort((a, b) => {
            if (a.grade === 'Ungraded') return 1;
            if (b.grade === 'Ungraded') return -1;
            return a.grade.localeCompare(b.grade);
          });
          
          // Add "All Grades" option
          const allGradesData = gradesArray.reduce((acc, curr) => ({
            grade: 'All Grades',
            boys: acc.boys + curr.boys,
            girls: acc.girls + curr.girls,
            total: acc.total + curr.total
          }), { grade: 'All Grades', boys: 0, girls: 0, total: 0 });
          
          setGradeData([allGradesData, ...gradesArray]);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [schoolId]);

  const currentData = gradeData.find(g => g.grade === selectedGrade) || gradeData[0];
  const pieData = [
    { name: 'Girls', value: currentData?.girls || 0, color: COLORS.girls },
    { name: 'Boys', value: currentData?.boys || 0, color: COLORS.boys },
    { name: 'Other', value: (currentData?.total || 0) - (currentData?.girls || 0) - (currentData?.boys || 0), color: COLORS.other }
  ].filter(item => item.value > 0);

  const totalStudents = currentData?.total || 0;
  const grades = gradeData.map(g => g.grade);

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-2xl border-2 flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          Loading student data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-2xl border-2 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-2xl border-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl text-black font-semibold">Student Distribution</h2>
          <p className="text-sm text-gray-500">Gender breakdown by grade</p>
        </div>
        
        {/* Grade Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowGradeDropdown(!showGradeDropdown)}
            className="flex items-center text-black gap-2 px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none"
          >
            Grade {selectedGrade}
            <ChevronDown size={16} className={`transition-transform ${showGradeDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showGradeDropdown && (
            <div className="absolute right-0 mt-1 w-40 border bg-white rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {grades.map((grade) => (
                <button
                  key={grade}
                  className={`w-full px-4 py-2 text-left text-sm border-2 ${
                    grade === selectedGrade ? 'bg-blue-500 text-white hover:bg-blue-500' : 'text-gray-700 bg-transparent hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    setSelectedGrade(grade);
                    setShowGradeDropdown(false);
                  }}
                >
                  Grade {grade}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Donut Chart */}
        <div className="relative h-48 w-48">
          {totalStudents > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value} students`, name]} 
                    labelFormatter={() => ''}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <span className="text-2xl text-black/80 font-bold">{totalStudents}</span>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Gender Distribution</h3>
            <div className="space-y-1">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm text-gray-600">{entry.name}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {entry.value} ({Math.round((entry.value / totalStudents) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {selectedGrade !== 'All Grades' && classes.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-700">Classes in Grade{selectedGrade}</h3>
              <div className="grid grid-cols-2 gap-2">
                {classes
                  .filter(cls => cls.grade === selectedGrade)
                  .map(cls => {
                    const classStudents = students.filter(s => s.class_id === cls.id);
                    const classBoys = classStudents.filter(s => s.gender === 'Male').length;
                    const classGirls = classStudents.filter(s => s.gender === 'Female').length;
                    
                    return (
                      <div key={cls.id} className="text-sm p-2 bg-gray-50 rounded">
                        <p className="font-medium truncate">{cls.name}</p>
                        <p className="text-gray-500">
                          {classStudents.length} students
                        </p>
                        {classStudents.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs px-1 py-0.5 bg-blue-100 text-blue-800 rounded">
                              {classBoys} boys
                            </span>
                            <span className="text-xs px-1 py-0.5 bg-pink-100 text-pink-800 rounded">
                              {classGirls} girls
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grade Summary (horizontal bars) - Only show when "All Grades" is selected */}
      {selectedGrade === 'All Grades' && gradeData.length > 1 && (
        <div className="mt-6 space-y-2">
          <h3 className="font-medium text-gray-700">Distribution by Grade</h3>
          <div className="space-y-3">
            {gradeData
              .filter(g => g.grade !== 'All Grades')
              .sort((a, b) => a.grade.localeCompare(b.grade))
              .map(grade => (
                <div key={grade.grade} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{grade.grade}</span>
                    <span>{grade.total} students</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full flex"
                      style={{ width: '100%' }}
                    >
                      {grade.girls > 0 && (
                        <div 
                          className="h-full" 
                          style={{ 
                            width: `${(grade.girls / grade.total) * 100}%`,
                            backgroundColor: COLORS.girls
                          }}
                        />
                      )}
                      {grade.boys > 0 && (
                        <div 
                          className="h-full" 
                          style={{ 
                            width: `${(grade.boys / grade.total) * 100}%`,
                            backgroundColor: COLORS.boys
                          }}
                        />
                      )}
                      {(grade.total - grade.girls - grade.boys) > 0 && (
                        <div 
                          className="h-full" 
                          style={{ 
                            width: `${((grade.total - grade.girls - grade.boys) / grade.total) * 100}%`,
                            backgroundColor: COLORS.other
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDistribution;