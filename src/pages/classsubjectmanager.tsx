import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Select, Button, Table, Modal, 
  message, Row, Col, Typography, Spin,
  Tabs, Tag, Badge, Space, Popconfirm, Empty
} from 'antd';
import { 
  UserOutlined, BookOutlined, TeamOutlined, 
  PlusOutlined, DeleteOutlined, SwapOutlined,
  FilterOutlined, SettingOutlined 
} from '@ant-design/icons';
import { supabase } from '../supabase';

const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface Class {
  id: string;
  name: string;
  grade: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Teacher {
  user_id: string;
  first_name: string;
  last_name: string;
}

interface GradeScale {
  id: number;
  name: string;
  scale: Record<string, number>;
  is_default: boolean;
}

interface ClassSubject {
  id: number;
  class_id: string;
  subject_id: number;
  grade_scale_id: number | null;
  school_id: string;
  created_at: string;
  updated_at: string;
  classes: {
    name: string;
    grade: string;
  };
  subjects: {
    name: string;
    code: string;
  };
}

interface ClassSubjectAssignment {
  id?: number;
  teacher_id: string;
  subject_id: number;
  class_id: string;
  school_id: string;
}

const ClassSubjectManager: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [gradeScales, setGradeScales] = useState<GradeScale[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [selectedClassRange, setSelectedClassRange] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('assignments');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchClasses(),
          fetchSubjects(),
          fetchTeachers(),
          fetchGradeScales(),
          fetchClassSubjects(),
          fetchAssignments()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
        message.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [schoolId]);

  // Data fetching functions
  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('grade', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    setClasses(data || []);
  };

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    if (error) throw error;
    setSubjects(data || []);
  };

  const fetchTeachers = async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('user_id, first_name, last_name')
      .eq('school_id', schoolId)
      .order('last_name', { ascending: true });

    if (error) throw error;
    setTeachers(data || []);
  };

  const fetchGradeScales = async () => {
    const { data, error } = await supabase
      .from('grade_scales')
      .select('*')
      .eq('school_id', schoolId)
      .order('is_default', { ascending: false });

    if (error) throw error;
    setGradeScales(data || []);
  };

const fetchClassSubjects = async () => {
  try {
    setLoading(true);
    const { data, error } = await supabase
      .from('class_subjects')
      .select(`
        *,
        classes:class_id(name, grade),
        subjects:subject_id(name, code)
      `)
      .eq('school_id', schoolId);

    if (error) throw error;
    console.log('Fetched class subjects:', data); // Log the data
    setClassSubjects(data || []);
  } catch (error) {
    console.error('Error loading class subjects:', error);
    message.error('Failed to load class subjects');
  } finally {
    setLoading(false);
  }
};

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from('teacher_subjects')
      .select('*')
      .eq('school_id', schoolId);

    if (error) throw error;
    setAssignments(data || []);
  };

  // Handle form submission for single assignment
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // Check if subject is assigned to class
      const isSubjectAssigned = classSubjects.some(
        cs => cs.class_id === values.class_id && cs.subject_id === values.subject_id
      );
  
      if (!isSubjectAssigned) {
        Modal.confirm({
          title: 'Subject Not Assigned to Class',
          content: `The selected subject is not currently assigned to ${getClassName(values.class_id)}. Would you like to assign it now?`,
          okText: 'Yes, Assign',
          cancelText: 'Cancel',
          onOk: async () => {
            // Assign subject to class first
            const { error: assignError } = await supabase
              .from('class_subjects')
              .upsert({
                class_id: values.class_id,
                subject_id: values.subject_id,
                school_id: schoolId
              });
  
            if (assignError) throw assignError;
            
            // Then assign teacher
            const { error: teacherError } = await supabase
              .from('teacher_subjects')
              .upsert({
                class_id: values.class_id,
                subject_id: values.subject_id,
                teacher_id: values.teacher_id,
                school_id: schoolId
              });
  
            if (teacherError) throw teacherError;
            
            message.success('Subject assigned to class and teacher assigned successfully');
            fetchClassSubjects();
            fetchAssignments();
            form.resetFields();
          }
        });
        return;
      }
  
      // If subject is already assigned, just assign teacher
      const { error } = await supabase
        .from('teacher_subjects')
        .upsert({
          class_id: values.class_id,
          subject_id: values.subject_id,
          teacher_id: values.teacher_id,
          school_id: schoolId
        });
  
      if (error) throw error;
      
      message.success('Teacher assigned successfully');
      fetchAssignments();
      form.resetFields();
    } catch (error) {
      console.error('Error assigning teacher:', error);
      message.error('Failed to assign teacher');
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk assignment
  const handleBulkSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // Check which classes already have this subject assigned
      const existingAssignments = classSubjects.filter(
        cs => selectedClassRange.includes(cs.class_id) && cs.subject_id === values.subject_id
      );
  
      const classesNeedingAssignment = selectedClassRange.filter(
        classId => !existingAssignments.some(cs => cs.class_id === classId)
      );
  
      if (classesNeedingAssignment.length > 0) {
        // Show confirmation for classes needing subject assignment
        Modal.confirm({
          title: 'Subject Not Assigned to All Classes',
          content: (
            <div>
              <p>This subject is not currently assigned to {classesNeedingAssignment.length} of the selected classes:</p>
              <ul style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {classesNeedingAssignment.slice(0, 10).map(classId => (
                  <li key={classId}>{getClassName(classId)}</li>
                ))}
                {classesNeedingAssignment.length > 10 && (
                  <li>...and {classesNeedingAssignment.length - 10} more</li>
                )}
              </ul>
              <p>Would you like to assign the subject to these classes first?</p>
            </div>
          ),
          okText: 'Yes, Assign Subject and Teacher',
          cancelText: 'Cancel',
          width: 600,
          onOk: async () => {
            // First assign subject to classes that need it
            const subjectAssignments = classesNeedingAssignment.map(classId => ({
              class_id: classId,
              subject_id: values.subject_id,
              school_id: schoolId
            }));
  
            const { error: subjectError } = await supabase
              .from('class_subjects')
              .upsert(subjectAssignments, { onConflict: 'class_id,subject_id' });
  
            if (subjectError) throw subjectError;
  
            // Then assign teacher to all selected classes
            const teacherAssignments = selectedClassRange.map(classId => ({
              class_id: classId,
              subject_id: values.subject_id,
              teacher_id: values.teacher_id,
              school_id: schoolId
            }));
  
            const { error: teacherError } = await supabase
              .from('teacher_subjects')
              .upsert(teacherAssignments, { onConflict: 'teacher_id,subject_id,class_id' });
  
            if (teacherError) throw teacherError;
  
            message.success(
              `Subject assigned to ${classesNeedingAssignment.length} classes and ` +
              `teacher assigned to ${selectedClassRange.length} classes successfully`
            );
            fetchClassSubjects();
            fetchAssignments();
            setIsBulkModalVisible(false);
            bulkForm.resetFields();
            setSelectedClassRange([]);
          }
        });
        return;
      }
  
      // If all classes already have subject assigned, just assign teacher
      const teacherAssignments = selectedClassRange.map(classId => ({
        class_id: classId,
        subject_id: values.subject_id,
        teacher_id: values.teacher_id,
        school_id: schoolId
      }));
  
      const { error } = await supabase
        .from('teacher_subjects')
        .upsert(teacherAssignments, { onConflict: 'teacher_id,subject_id,class_id' });
  
      if (error) throw error;
      
      message.success(`Teacher assigned to ${selectedClassRange.length} classes successfully`);
      fetchAssignments();
      setIsBulkModalVisible(false);
      bulkForm.resetFields();
      setSelectedClassRange([]);
    } catch (error) {
      console.error('Error in bulk assignment:', error);
      message.error('Failed to perform bulk assignment');
    } finally {
      setLoading(false);
    }
  };

  // Remove assignment
  const removeAssignment = async (teacherId: string, subjectId: number, classId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('teacher_id', teacherId)
        .eq('subject_id', subjectId)
        .eq('class_id', classId);

      if (error) throw error;
      
      message.success('Assignment removed successfully');
      fetchAssignments();
    } catch (error) {
      console.error('Error removing assignment:', error);
      message.error('Failed to remove assignment');
    } finally {
      setLoading(false);
    }
  };

  // Open bulk assignment modal
  const showBulkModal = () => {
    setIsBulkModalVisible(true);
  };

  // Handle class range selection for bulk operations
  const handleClassRangeChange = (selectedGrades: string[]) => {
    const selectedClasses = classes
      .filter(cls => selectedGrades.includes(cls.grade))
      .map(cls => cls.id);
    
    setSelectedClassRange(selectedClasses);
  };

  // Get teacher name by ID
  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.user_id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Not assigned';
  };

  // Get class name by ID
  const getClassName = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name} (${cls.grade})` : classId;
  };

  // Get subject name by ID
  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? `${subject.name} (${subject.code})` : subjectId.toString();
  };

  // Filter assignments based on search and filters
  const getFilteredAssignments = () => {
    return assignments.filter(assignment => {
      const teacherName = getTeacherName(assignment.teacher_id).toLowerCase();
      const className = getClassName(assignment.class_id).toLowerCase();
      const subjectName = getSubjectName(assignment.subject_id).toLowerCase();
      
      const matchesSearch = 
        searchText === '' || 
        teacherName.includes(searchText.toLowerCase()) ||
        className.includes(searchText.toLowerCase()) ||
        subjectName.includes(searchText.toLowerCase());
      
      const matchesTeacherFilter = !selectedTeacher || assignment.teacher_id === selectedTeacher;
      const matchesClassFilter = !selectedClass || assignment.class_id === selectedClass;
      const matchesSubjectFilter = !selectedSubject || assignment.subject_id === selectedSubject;
      
      return matchesSearch && matchesTeacherFilter && matchesClassFilter && matchesSubjectFilter;
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchText('');
    setSelectedTeacher(null);
    setSelectedClass(null);
    setSelectedSubject(null);
  };

  // Table columns
  const columns = [
    {
      title: 'Teacher',
      dataIndex: 'teacher_id',
      key: 'teacher',
      render: (teacherId: string) => {
        const teacher = teachers.find(t => t.user_id === teacherId);
        return (
          <Space>
            <UserOutlined />
            <span>{teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Not assigned'}</span>
          </Space>
        );
      }
    },
    {
      title: 'Class',
      dataIndex: 'class_id',
      key: 'class',
      render: (classId: string) => {
        const cls = classes.find(c => c.id === classId);
        return (
          <Space>
            <TeamOutlined />
            <span>{cls ? cls.name : classId}</span>
            {cls && <Tag color="blue">Grade {cls.grade}</Tag>}
          </Space>
        );
      }
    },
    {
      title: 'Subject',
      dataIndex: 'subject_id',
      key: 'subject',
      render: (subjectId: number) => {
        const classSubject = classSubjects.find(cs => cs.subject_id === subjectId);
        return (
          <Space>
            <BookOutlined />
            <span>{classSubject?.subjects?.name || subjectId}</span>
            {classSubject?.subjects?.code && <Tag color="green">{classSubject.subjects.code}</Tag>}
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ClassSubjectAssignment) => (
        <Popconfirm
          title="Are you sure you want to remove this assignment?"
          onConfirm={() => removeAssignment(record.teacher_id, record.subject_id, record.class_id)}
          okText="Yes"
          cancelText="No"
        >
          <Button 
            danger 
            icon={<DeleteOutlined />}
            size="small"
          >
            Remove
          </Button>
        </Popconfirm>
      )
    }
  ];

  // Get unique grade levels from classes
  const gradeLevels = Array.from(new Set(classes.map(cls => cls.grade))).sort();

  // Teacher stats - count assignments per teacher
  const teacherStats = teachers.map(teacher => {
    const assignmentCount = assignments.filter(a => a.teacher_id === teacher.user_id).length;
    return {
      ...teacher,
      assignmentCount
    };
  }).sort((a, b) => b.assignmentCount - a.assignmentCount);

  // Class stats - count assignments per class
  const classStats = classes.map(cls => {
    const assignmentCount = assignments.filter(a => a.class_id === cls.id).length;
    return {
      ...cls,
      assignmentCount
    };
  }).sort((a, b) => b.assignmentCount - a.assignmentCount);

  if (loading && assignments.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={
              <span>
                <SwapOutlined /> Assignments
              </span>
            } 
            key="assignments"
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Space>
                  <Select 
                      placeholder="Filter by teacher" 
                      style={{ width: 180 }} 
                      allowClear
                      value={selectedTeacher}
                      onChange={setSelectedTeacher}
                    >
                      {teachers.map(teacher => (
                        <Option key={teacher.user_id} value={teacher.user_id}>
                          {teacher.first_name} {teacher.last_name}
                        </Option>
                      ))}
                    </Select>
                    <Select 
                      placeholder="Filter by class" 
                      style={{ width: 180 }} 
                      allowClear
                      value={selectedClass}
                      onChange={setSelectedClass}
                    >
                      {classes.map(cls => (
                        <Option key={cls.id} value={cls.id}>
                          {cls.name} (Grade {cls.grade})
                        </Option>
                      ))}
                    </Select>
 
                    <Select 
                      placeholder="Filter by subject" 
                      style={{ width: 300 }} 
                      allowClear
                      value={selectedSubject}
                      onChange={setSelectedSubject}
                    >
                      {subjects.map(subject => {
                        const isAssigned = classSubjects.some(cs => cs.subject_id === subject.id);
                        return (
                          <Option key={subject.id} value={subject.id}>
                            <Space>
                              {subject.name} ({subject.code})
                              {isAssigned && <Tag color="green">Assigned</Tag>}
                            </Space>
                          </Option>
                        );
                      })}
                    </Select>

                    <Button onClick={resetFilters} icon={<FilterOutlined />}>Reset Filters</Button>
                  </Space>
                  <Space>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => setActiveTab('create')}
                    >
                      New Assignment
                    </Button>
                    <Button 
                      onClick={showBulkModal}
                      icon={<PlusOutlined />}
                    >
                      Bulk Assign
                    </Button>
                  </Space>
                </div>
              </Col>
              
              <Col span={24}>
                {getFilteredAssignments().length > 0 ? (
                  <Table
                    columns={columns}
                    dataSource={getFilteredAssignments()}
                    rowKey={record => `${record.teacher_id}-${record.subject_id}-${record.class_id}`}
                    pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
                    scroll={{ x: true }}
                    loading={loading}
                  />
                ) : (
                  <Empty 
                    description={
                      <span>
                        {searchText || selectedTeacher || selectedClass || selectedSubject ? 
                          "No assignments match your filters" : 
                          "No assignments found. Add your first assignment!"}
                      </span>
                    }
                  />
                )}
              </Col>
            </Row>
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <PlusOutlined /> Create Assignment
              </span>
            } 
            key="create"
          >
            <Row gutter={16}>
              <Col span={24} lg={16} xl={12}>
                <Card bordered={false}>
                  <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Title level={4}>Assign Teacher to Class Subject</Title>
                    
                    <Form.Item
                      name="teacher_id"
                      label="Teacher"
                      rules={[{ required: true, message: 'Please select a teacher' }]}
                    >
                      <Select 
                        placeholder="Select teacher"
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.children?.toString().toLowerCase() ?? '').indexOf(input.toLowerCase()) >= 0
                        }
                      >
                        {teachers.map(teacher => (
                          <Option key={teacher.user_id} value={teacher.user_id}>
                            {teacher.first_name} {teacher.last_name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="class_id"
                      label="Class"
                      rules={[{ required: true, message: 'Please select a class' }]}
                    >
                      <Select 
                        placeholder="Select class"
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.children?.toString()?.toLowerCase() ?? '').indexOf(input.toLowerCase()) >= 0
                        }
                      >
                        {classes.map(cls => (
                          <Option key={cls.id} value={cls.id}>
                            {cls.name} (Grade {cls.grade})
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="subject_id"
                      label="Subject"
                      rules={[{ required: true, message: 'Please select a subject' }]}
                    >
                      <Select 
                        placeholder="Select subject"
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.children?.toString()?.toLowerCase() ?? '').includes(input.toLowerCase())
                        }
                      >
                        {subjects.map(subject => (
                          <Option key={subject.id} value={subject.id}>
                            {subject.name} ({subject.code})
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item>
                      <Space>
                        <Button type="primary" htmlType="submit" loading={loading}>
                          Create Assignment
                        </Button>
                        <Button onClick={() => form.resetFields()}>
                          Reset Form
                        </Button>
                        <Button onClick={() => setActiveTab('assignments')}>
                          Cancel
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
              
              <Col span={24} lg={8} xl={12}>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Card title="Most Assigned Teachers" bordered={false}>
                      {teacherStats.slice(0, 5).map((teacher, index) => (
                        <div key={teacher.user_id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                          <Text>{teacher.first_name} {teacher.last_name}</Text>
                          <Badge count={teacher.assignmentCount} style={{ backgroundColor: index === 0 ? '#52c41a' : '#1890ff' }} />
                        </div>
                      ))}
                    </Card>
                  </Col>
                  <Col span={24}>
                    <Card title="Classes by Assignment Count" bordered={false}>
                      {classStats.slice(0, 5).map((cls, index) => (
                        <div key={cls.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                          <Text>{cls.name} (Grade {cls.grade})</Text>
                          <Badge count={cls.assignmentCount} style={{ backgroundColor: index === 0 ? '#52c41a' : '#1890ff' }} />
                        </div>
                      ))}
                    </Card>
                  </Col>
                </Row>
              </Col>
            </Row>
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <SettingOutlined /> Settings
              </span>
            } 
            key="settings"
          >
            <Row gutter={[16, 16]}>
              <Col span={24} md={12}>
                <Card title="Default Grade Categories" bordered={false}>
                  <p>When you assign a teacher to a subject, the following grade categories will be created by default:</p>
                  <ul>
                    <li><strong>Exams:</strong> 40% weight</li>
                    <li><strong>Quizzes:</strong> 30% weight</li>
                    <li><strong>Homework:</strong> 20% weight</li>
                    <li><strong>Participation:</strong> 10% weight</li>
                  </ul>
                  <p>You can modify these categories later in the subject settings.</p>
                </Card>
              </Col>
              
              <Col span={24} md={12}>
                <Card title="Grade Scales" bordered={false}>
                  <p>The following grade scales are available:</p>
                  {gradeScales.length > 0 ? (
                    <ul>
                      {gradeScales.map(scale => (
                        <li key={scale.id}>
                          <strong>{scale.name}</strong>
                          {scale.is_default && <Tag color="green" style={{ marginLeft: 8 }}>Default</Tag>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Empty description="No grade scales defined" />
                  )}
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* Bulk Assignment Modal */}
      <Modal
        title={<><PlusOutlined /> Bulk Assign Teacher to Classes</>}
        visible={isBulkModalVisible}
        onCancel={() => setIsBulkModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={bulkForm} layout="vertical" onFinish={handleBulkSubmit}>
          <Form.Item
            name="teacher_id"
            label="Teacher"
            rules={[{ required: true, message: 'Please select a teacher' }]}
          >
            <Select 
              placeholder="Select teacher"
              showSearch
              optionFilterProp="children"
            >
              {teachers.map(teacher => (
                <Option key={teacher.user_id} value={teacher.user_id}>
                  {teacher.first_name} {teacher.last_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="subject_id"
            label="Subject"
            rules={[{ required: true, message: 'Please select a subject' }]}
          >
            <Select 
              placeholder="Select subject"
              showSearch
              optionFilterProp="children"
            >
              {subjects.map(subject => (
                <Option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="grade_range"
            label="Grade Levels"
            rules={[{ required: true, message: 'Please select at least one grade level' }]}
          >
            <Select 
              mode="multiple" 
              placeholder="Select grade levels"
              onChange={handleClassRangeChange}
            >
              {gradeLevels.map(grade => (
                <Option key={grade} value={grade}>
                  Grade {grade}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
            <Space align="center">
              <Badge count={selectedClassRange.length} />
              <Text>classes will receive this assignment</Text>
            </Space>
            
            {selectedClassRange.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Classes included:</Text>
                <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedClassRange.slice(0, 5).map(classId => {
                    const cls = classes.find(c => c.id === classId);
                    return cls ? (
                      <Tag key={classId}>{cls.name} (Grade {cls.grade})</Tag>
                    ) : null;
                  })}
                  {selectedClassRange.length > 5 && (
                    <Tag>+{selectedClassRange.length - 5} more</Tag>
                  )}
                </div>
              </div>
            )}
          </div>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Assign to Classes
              </Button>
              <Button onClick={() => bulkForm.resetFields()}>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClassSubjectManager;