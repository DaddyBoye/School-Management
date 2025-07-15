import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Select, Button, Table, Modal, 
  message, Row, Col, Typography, Spin,
  Tabs, Tag, Badge, Space, Popconfirm, Empty,
  Input, Divider, List, TreeSelect, Collapse
} from 'antd';
import { 
  BookOutlined, TeamOutlined, PlusOutlined, 
  DeleteOutlined, FilterOutlined, InfoCircleOutlined, 
  SettingOutlined, EditOutlined, 
  FolderOpenOutlined, ApartmentOutlined
} from '@ant-design/icons';
import { supabase } from '../../supabase';

const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Panel } = Collapse;

interface Class {
  id: string;
  name: string;
  grade: string;
}

interface ClassGroup {
  id: string;
  name: string;
  class_ids: string[];
  school_id: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  description: string;
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
}

// Helper function to format grade levels
const formatGrade = (grade: string) => {
  const gradeNum = parseInt(grade);
  if (isNaN(gradeNum)) return grade;
  
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = gradeNum % 100;
  return gradeNum + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]) + ' Grade';
};

const SubjectClassManager: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeScales, setGradeScales] = useState<GradeScale[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [classForm] = Form.useForm();
  const [subjectForm] = Form.useForm();
  const [groupForm] = Form.useForm();
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [isClassModalVisible, setIsClassModalVisible] = useState(false);
  const [isSubjectModalVisible, setIsSubjectModalVisible] = useState(false);
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [selectedClassRange, setSelectedClassRange] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('assignments');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchClasses(),
          fetchClassGroups(),
          fetchSubjects(),
          fetchGradeScales(),
          fetchClassSubjects()
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

  const fetchClassGroups = async () => {
    const { data, error } = await supabase
      .from('class_groups')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    if (error) throw error;
    setClassGroups(data || []);
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
    const { data, error } = await supabase
      .from('class_subjects')
      .select('*')
      .eq('school_id', schoolId);

    if (error) throw error;
    setClassSubjects(data || []);
  };

  // Handle form submission for single assignment
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('class_subjects')
        .upsert({
          class_id: values.class_id,
          subject_id: values.subject_id,
          grade_scale_id: values.grade_scale_id,
          school_id: schoolId
        }, { onConflict: 'class_id,subject_id' });

      if (error) throw error;
      
      // Create grade categories if they don't exist
      await ensureGradeCategoriesExist(values.subject_id);
      
      message.success('Subject assigned to class successfully');
      fetchClassSubjects();
      form.resetFields();
    } catch (error) {
      console.error('Error assigning subject:', error);
      message.error('Failed to assign subject');
    } finally {
      setLoading(false);
    }
  };

  // Handle group submission
  const handleGroupSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      if (editingGroup) {
        // Update existing group
        const { error } = await supabase
          .from('class_groups')
          .update({
            name: values.name,
            class_ids: values.class_ids
          })
          .eq('id', editingGroup.id);

        if (error) throw error;
        message.success('Group updated successfully');
      } else {
        // Create new group
        const { error } = await supabase
          .from('class_groups')
          .insert([{
            name: values.name,
            class_ids: values.class_ids,
            school_id: schoolId
          }])
          .select();

        if (error) throw error;
        message.success('Group created successfully');
      }
      
      fetchClassGroups();
      setIsGroupModalVisible(false);
      groupForm.resetFields();
      setEditingGroup(null);
    } catch (error) {
      console.error('Error saving group:', error);
      message.error('Failed to save group');
    } finally {
      setLoading(false);
    }
  };

  // Ensure default grade categories exist for a subject
  const ensureGradeCategoriesExist = async (subjectId: number) => {
    try {
      const { data: existingCategories, error: fetchError } = await supabase
        .from('grade_categories')
        .select('*')
        .eq('subject_id', subjectId);

      if (fetchError) throw fetchError;

      if (!existingCategories || existingCategories.length === 0) {
        const defaultCategories = [
          { subject_id: subjectId, name: 'Exams', weight: 40 },
          { subject_id: subjectId, name: 'Quizzes', weight: 30 },
          { subject_id: subjectId, name: 'Homework', weight: 20 },
          { subject_id: subjectId, name: 'Participation', weight: 10 }
        ];

        const { error: insertError } = await supabase
          .from('grade_categories')
          .insert(defaultCategories);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error ensuring grade categories:', error);
    }
  };

  // Handle bulk assignment
  const handleBulkSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // Prepare assignments for all selected classes
      const assignments = selectedClassRange.map(classId => ({
        class_id: classId,
        subject_id: values.subject_id,
        grade_scale_id: values.grade_scale_id,
        school_id: schoolId
      }));

      // Perform bulk upsert
      const { error } = await supabase
        .from('class_subjects')
        .upsert(assignments, { onConflict: 'class_id,subject_id' });

      if (error) throw error;
      
      // Ensure grade categories exist for the subject
      await ensureGradeCategoriesExist(values.subject_id);
      
      message.success(`Subject assigned to ${selectedClassRange.length} classes successfully`);
      fetchClassSubjects();
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

  // Handle new class creation with formatted grade
  const handleClassSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      if (editingClass) {
        // Update existing class
        const { error } = await supabase
          .from('classes')
          .update({
            name: values.name,
            grade: values.grade
          })
          .eq('id', editingClass.id);

        if (error) throw error;
        message.success('Class updated successfully');
      } else {
        // Create new class
        const { error } = await supabase
          .from('classes')
          .insert([{
            name: values.name,
            grade: values.grade,
            school_id: schoolId
          }])
          .select();

        if (error) throw error;
        message.success('Class created successfully');
      }
      
      fetchClasses();
      setIsClassModalVisible(false);
      classForm.resetFields();
      setEditingClass(null);
    } catch (error) {
      console.error('Error saving class:', error);
      message.error('Failed to save class');
    } finally {
      setLoading(false);
    }
  };

  // Handle new subject creation with description
  const handleSubjectSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      if (editingSubject) {
        // Update existing subject
        const { error } = await supabase
          .from('subjects')
          .update({
            name: values.name,
            code: values.code.toUpperCase(),
            description: values.description
          })
          .eq('id', editingSubject.id);

        if (error) throw error;
        message.success('Subject updated successfully');
      } else {
        // Create new subject
        const { error } = await supabase
          .from('subjects')
          .insert([{
            name: values.name,
            code: values.code.toUpperCase(),
            description: values.description,
            school_id: schoolId
          }])
          .select();

        if (error) throw error;
        message.success('Subject created successfully');
      }
      
      fetchSubjects();
      setIsSubjectModalVisible(false);
      subjectForm.resetFields();
      setEditingSubject(null);
    } catch (error) {
      console.error('Error saving subject:', error);
      message.error('Failed to save subject');
    } finally {
      setLoading(false);
    }
  };

  // Remove assignment
  const removeAssignment = async (classId: string, subjectId: number) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('class_subjects')
        .delete()
        .eq('class_id', classId)
        .eq('subject_id', subjectId);

      if (error) throw error;
      
      message.success('Assignment removed successfully');
      fetchClassSubjects();
    } catch (error) {
      console.error('Error removing assignment:', error);
      message.error('Failed to remove assignment');
    } finally {
      setLoading(false);
    }
  };

  // Delete class
  const deleteClass = async (classId: string) => {
    try {
      setLoading(true);
      
      // First check if the class has any assignments
      const { count } = await supabase
        .from('class_subjects')
        .select('*', { count: 'exact' })
        .eq('class_id', classId);

      if (count && count > 0) {
        message.error('Cannot delete class with assigned subjects. Remove assignments first.');
        return;
      }

      // Remove class from any groups
      const affectedGroups = classGroups.filter(group => group.class_ids.includes(classId));
      for (const group of affectedGroups) {
        const updatedClassIds = group.class_ids.filter(id => id !== classId);
        await supabase
          .from('class_groups')
          .update({ class_ids: updatedClassIds })
          .eq('id', group.id);
      }

      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;
      
      message.success('Class deleted successfully');
      fetchClasses();
      fetchClassGroups();
    } catch (error) {
      console.error('Error deleting class:', error);
      message.error('Failed to delete class');
    } finally {
      setLoading(false);
    }
  };

  // Delete subject
  const deleteSubject = async (subjectId: number) => {
    try {
      setLoading(true);
      
      // First check if the subject has any assignments
      const { count } = await supabase
        .from('class_subjects')
        .select('*', { count: 'exact' })
        .eq('subject_id', subjectId);

      if (count && count > 0) {
        message.error('Cannot delete subject with class assignments. Remove assignments first.');
        return;
      }

      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);

      if (error) throw error;
      
      message.success('Subject deleted successfully');
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      message.error('Failed to delete subject');
    } finally {
      setLoading(false);
    }
  };

  // Delete group
  const deleteGroup = async (groupId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('class_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      
      message.success('Group deleted successfully');
      fetchClassGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      message.error('Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  // Open bulk assignment modal
  const showBulkModal = () => {
    setIsBulkModalVisible(true);
  };

  // Open class creation modal
  const showClassModal = (classToEdit?: Class) => {
    if (classToEdit) {
      setEditingClass(classToEdit);
      classForm.setFieldsValue({
        name: classToEdit.name,
        grade: classToEdit.grade
      });
    } else {
      setEditingClass(null);
      classForm.resetFields();
    }
    setIsClassModalVisible(true);
  };

  // Open subject creation modal
  const showSubjectModal = (subjectToEdit?: Subject) => {
    if (subjectToEdit) {
      setEditingSubject(subjectToEdit);
      subjectForm.setFieldsValue({
        name: subjectToEdit.name,
        code: subjectToEdit.code,
        description: subjectToEdit.description
      });
    } else {
      setEditingSubject(null);
      subjectForm.resetFields();
    }
    setIsSubjectModalVisible(true);
  };

  // Open group creation modal
  const showGroupModal = (groupToEdit?: ClassGroup) => {
    if (groupToEdit) {
      setEditingGroup(groupToEdit);
      groupForm.setFieldsValue({
        name: groupToEdit.name,
        class_ids: groupToEdit.class_ids
      });
    } else {
      setEditingGroup(null);
      groupForm.resetFields();
    }
    setIsGroupModalVisible(true);
  };

  // Handle class range selection for bulk operations
  const handleClassRangeChange = (selectedGrades: string[]) => {
    const selectedClasses = classes
      .filter(cls => selectedGrades.includes(cls.grade))
      .map(cls => cls.id);
    
    setSelectedClassRange(selectedClasses);
  };

  // Get subject name by ID
  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? `${subject.name} (${subject.code})` : subjectId.toString();
  };

  // Get grade scale name by ID
  const getGradeScaleName = (gradeScaleId: number | null) => {
    if (!gradeScaleId) return 'Default';
    const scale = gradeScales.find(gs => gs.id === gradeScaleId);
    return scale ? scale.name : 'Default';
  };

  // Get classes in a group
  const getClassesInGroup = (group: ClassGroup) => {
    return classes.filter(cls => group.class_ids.includes(cls.id));
  };

  // Filter assignments based on search and filters
  const getFilteredAssignments = () => {
    let filtered = classSubjects;
    
    if (selectedGroup) {
      const group = classGroups.find(g => g.id === selectedGroup);
      if (group) {
        filtered = filtered.filter(assignment => 
          group.class_ids.includes(assignment.class_id)
        );
      }
    }
    
    return filtered.filter(assignment => {
      const className = classes.find(c => c.id === assignment.class_id)?.name.toLowerCase() || '';
      const subjectName = getSubjectName(assignment.subject_id).toLowerCase();
      
      const matchesSearch = 
        searchText === '' || 
        className.includes(searchText.toLowerCase()) ||
        subjectName.includes(searchText.toLowerCase());
      
      const matchesClassFilter = !selectedClass || assignment.class_id === selectedClass;
      const matchesSubjectFilter = !selectedSubject || assignment.subject_id === selectedSubject;
      
      return matchesSearch && matchesClassFilter && matchesSubjectFilter;
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchText('');
    setSelectedClass(null);
    setSelectedSubject(null);
    setSelectedGroup(null);
  };

  // Table columns for assignments
  const assignmentColumns = [
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
        const subject = subjects.find(s => s.id === subjectId);
        return (
          <Space direction="vertical" size={0}>
            <Space>
              <BookOutlined />
              <span>{subject ? subject.name : subjectId}</span>
              {subject && <Tag color="green">{subject.code}</Tag>}
            </Space>
            {subject?.description && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <InfoCircleOutlined /> {subject.description}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Grade Scale',
      dataIndex: 'grade_scale_id',
      key: 'grade_scale',
      render: (gradeScaleId: number | null) => (
        <Tag color={gradeScaleId ? 'geekblue' : 'default'}>
          {getGradeScaleName(gradeScaleId)}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ClassSubject) => (
        <Popconfirm
          title="Are you sure you want to remove this assignment?"
          onConfirm={() => removeAssignment(record.class_id, record.subject_id)}
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

  // Class stats - count assignments per class
  const classStats = classes.map(cls => {
    const assignmentCount = classSubjects.filter(a => a.class_id === cls.id).length;
    return {
      ...cls,
      assignmentCount
    };
  }).sort((a, b) => b.assignmentCount - a.assignmentCount);

  if (loading && classSubjects.length === 0) {
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
          {/* Assignments Tab */}
          <TabPane 
            tab={
              <span>
                <BookOutlined /> Subject Assignments
              </span>
            } 
            key="assignments"
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Space>
                    <Select 
                      placeholder="Filter by group" 
                      style={{ width: 180 }} 
                      allowClear
                      value={selectedGroup}
                      onChange={setSelectedGroup}
                    >
                      {classGroups.map(group => (
                        <Option key={group.id} value={group.id}>
                          <ApartmentOutlined /> {group.name}
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
                      style={{ width: 180 }} 
                      allowClear
                      value={selectedSubject}
                      onChange={setSelectedSubject}
                    >
                      {subjects.map(subject => (
                        <Option key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </Option>
                      ))}
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
                    columns={assignmentColumns}
                    dataSource={getFilteredAssignments()}
                    rowKey={record => `${record.class_id}-${record.subject_id}`}
                    pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
                    scroll={{ x: true }}
                    loading={loading}
                  />
                ) : (
                  <Empty 
                    description={
                      <span>
                        {searchText || selectedClass || selectedSubject || selectedGroup ? 
                          "No assignments match your filters" : 
                          "No assignments found. Add your first assignment!"}
                      </span>
                    }
                  />
                )}
              </Col>
            </Row>
          </TabPane>
          
          {/* Create Assignment Tab */}
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
                    <Title level={4}>Assign Subject to Class</Title>
                    
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
                        dropdownRender={menu => (
                          <>
                            {menu}
                            <Divider style={{ margin: '8px 0' }} />
                            <Button 
                              type="text" 
                              icon={<PlusOutlined />} 
                              onClick={() => showClassModal()}
                              style={{ width: '100%' }}
                            >
                              Add New Class
                            </Button>
                          </>
                        )}
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
                          (option?.children?.toString()?.toLowerCase() ?? '').indexOf(input.toLowerCase()) >= 0
                        }
                        dropdownRender={menu => (
                          <>
                            {menu}
                            <Divider style={{ margin: '8px 0' }} />
                            <Button 
                              type="text" 
                              icon={<PlusOutlined />} 
                              onClick={() => showSubjectModal()}
                              style={{ width: '100%' }}
                            >
                              Add New Subject
                            </Button>
                          </>
                        )}
                      >
                        {subjects.map(sub => (
                          <Option key={sub.id} value={sub.id}>
                            {sub.name} ({sub.code})
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="grade_scale_id"
                      label="Grade Scale"
                    >
                      <Select 
                        placeholder="Select grade scale (optional)"
                        allowClear
                      >
                        {gradeScales.map(scale => (
                          <Option key={scale.id} value={scale.id}>
                            {scale.name} {scale.is_default && '(Default)'}
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
                    <Card title="Classes by Subject Count" bordered={false}>
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
          
          {/* Classes Management Tab */}
          <TabPane 
            tab={
              <span>
                <TeamOutlined /> Manage Classes
              </span>
            } 
            key="classes"
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card 
                  title="All Classes" 
                  bordered={false}
                  extra={
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => showClassModal()}
                    >
                      Add Class
                    </Button>
                  }
                >
                  <List
                    dataSource={classes}
                    loading={loading}
                    renderItem={(cls) => (
                      <List.Item
                        actions={[
                          <Button 
                            icon={<EditOutlined />} 
                            onClick={() => showClassModal(cls)}
                          />,
                          <Popconfirm
                            title="Are you sure you want to delete this class?"
                            onConfirm={() => deleteClass(cls.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ]}
                      >
                        <List.Item.Meta
                          title={<Text strong>{cls.name}</Text>}
                          description={`Grade ${cls.grade}`}
                        />
                        <div>
                          <Badge 
                            count={classSubjects.filter(cs => cs.class_id === cls.id).length} 
                            style={{ backgroundColor: '#1890ff' }} 
                          />
                          <Text type="secondary" style={{ marginLeft: 8 }}>assigned subjects</Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>
          
          {/* Class Groups Management Tab */}
          <TabPane 
            tab={
              <span>
                <ApartmentOutlined /> Class Groups
              </span>
            } 
            key="groups"
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card 
                  title="Class Groups" 
                  bordered={false}
                  extra={
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => showGroupModal()}
                    >
                      Add Group
                    </Button>
                  }
                >
                  {classGroups.length > 0 ? (
                    <Collapse accordion>
                      {classGroups.map(group => (
                        <Panel 
                          header={
                            <Space>
                              <FolderOpenOutlined />
                              <Text strong>{group.name}</Text>
                              <Tag>{group.class_ids.length} classes</Tag>
                            </Space>
                          } 
                          key={group.id}
                          extra={
                            <Space>
                              <Button 
                                size="small" 
                                icon={<EditOutlined />} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showGroupModal(group);
                                }}
                              />
                              <Popconfirm
                                title="Are you sure you want to delete this group?"
                                onConfirm={() => deleteGroup(group.id)}
                                okText="Yes"
                                cancelText="No"
                              >
                                <Button 
                                  size="small" 
                                  danger 
                                  icon={<DeleteOutlined />} 
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </Popconfirm>
                            </Space>
                          }
                        >
                          <List
                            dataSource={getClassesInGroup(group)}
                            renderItem={cls => (
                              <List.Item>
                                <List.Item.Meta
                                  title={cls.name}
                                  description={`Grade ${cls.grade}`}
                                />
                                <div>
                                  <Badge 
                                    count={classSubjects.filter(cs => cs.class_id === cls.id).length} 
                                    style={{ backgroundColor: '#1890ff' }} 
                                  />
                                  <Text type="secondary" style={{ marginLeft: 8 }}>assigned subjects</Text>
                                </div>
                              </List.Item>
                            )}
                          />
                        </Panel>
                      ))}
                    </Collapse>
                  ) : (
                    <Empty description="No class groups created yet">
                      <Button type="primary" onClick={() => showGroupModal()}>
                        Create First Group
                      </Button>
                    </Empty>
                  )}
                </Card>
              </Col>
            </Row>
          </TabPane>
          
          {/* Subjects Management Tab */}
          <TabPane 
            tab={
              <span>
                <BookOutlined /> Manage Subjects
              </span>
            } 
            key="subjects"
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card 
                  title="All Subjects" 
                  bordered={false}
                  extra={
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => showSubjectModal()}
                    >
                      Add Subject
                    </Button>
                  }
                >
                  <List
                    dataSource={subjects}
                    loading={loading}
                    renderItem={(subject) => (
                      <List.Item
                        actions={[
                          <Button 
                            icon={<EditOutlined />} 
                            onClick={() => showSubjectModal(subject)}
                          />,
                          <Popconfirm
                            title="Are you sure you want to delete this subject?"
                            onConfirm={() => deleteSubject(subject.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Space>
                              <Text strong>{subject.name}</Text>
                              <Tag color="green">{subject.code}</Tag>
                            </Space>
                          }
                          description={subject.description || 'No description'}
                        />
                        <div>
                          <Badge 
                            count={classSubjects.filter(cs => cs.subject_id === subject.id).length} 
                            style={{ backgroundColor: '#1890ff' }} 
                          />
                          <Text type="secondary" style={{ marginLeft: 8 }}>class assignments</Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>
          
          {/* Grade Scales Tab */}
          <TabPane 
            tab={
              <span>
                <SettingOutlined /> Grade Scales
              </span>
            } 
            key="settings"
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="Available Grade Scales" bordered={false}>
                  {gradeScales.length > 0 ? (
                    <Table
                      dataSource={gradeScales}
                      rowKey="id"
                      pagination={false}
                      columns={[
                        {
                          title: 'Name',
                          dataIndex: 'name',
                          key: 'name',
                          render: (text, record) => (
                            <Space>
                              <Text strong>{text}</Text>
                              {record.is_default && <Tag color="green">Default</Tag>}
                            </Space>
                          )
                        },
                        {
                          title: 'Scale',
                          dataIndex: 'scale',
                          key: 'scale',
                          render: (scale: Record<string, number>) => (
                            <Space>
                              {Object.entries(scale).map(([grade, threshold]) => (
                                <Tag key={grade}>
                                  {grade}: ≥{threshold}%
                                </Tag>
                              ))}
                            </Space>
                          )
                        }
                      ]}
                    />
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
        title={<><PlusOutlined /> Bulk Assign Subjects to Classes</>}
        visible={isBulkModalVisible}
        onCancel={() => setIsBulkModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={bulkForm} layout="vertical" onFinish={handleBulkSubmit}>
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
              {subjects.map(sub => (
                <Option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="grade_scale_id"
            label="Grade Scale"
          >
            <Select 
              placeholder="Select grade scale (optional)"
              allowClear
            >
              {gradeScales.map(scale => (
                <Option key={scale.id} value={scale.id}>
                  {scale.name} {scale.is_default && '(Default)'}
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
              <Text>classes will receive this subject</Text>
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

      {/* Add/Edit Subject Modal */}
      <Modal
        title={<>
          <BookOutlined /> {editingSubject ? 'Edit Subject' : 'Add New Subject'}
        </>}
        visible={isSubjectModalVisible}
        onCancel={() => setIsSubjectModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={subjectForm} layout="vertical" onFinish={handleSubjectSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Subject Name"
                rules={[{ required: true, message: 'Please enter a subject name' }]}
              >
                <Input placeholder="e.g., Mathematics" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Subject Code"
                rules={[{ required: true, message: 'Please enter a subject code' }]}
              >
                <Input 
                  placeholder="e.g., MATH" 
                  style={{ textTransform: 'uppercase' }}
                  maxLength={10}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a subject description' }]}
          >
            <TextArea rows={4} placeholder="Enter a brief description of the subject..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingSubject ? 'Update Subject' : 'Create Subject'}
              </Button>
              <Button onClick={() => subjectForm.resetFields()}>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add/Edit Class Modal */}
      <Modal
        title={<>
          <TeamOutlined /> {editingClass ? 'Edit Class' : 'Add New Class'}
        </>}
        visible={isClassModalVisible}
        onCancel={() => setIsClassModalVisible(false)}
        footer={null}
      >
        <Form form={classForm} layout="vertical" onFinish={handleClassSubmit}>
          <Form.Item
            name="name"
            label="Class Name"
            rules={[{ required: true, message: 'Please enter a class name' }]}
          >
            <Input placeholder="e.g., Section A" />
          </Form.Item>

          <Form.Item
            name="grade"
            label="Grade Level"
            rules={[{ required: true, message: 'Please select a grade level' }]}
          >
            <Select placeholder="Select grade level" showSearch>
              {Array.from({ length: 12 }, (_, i) => {
                const grade = (i + 1).toString();
                return (
                  <Option key={grade} value={grade}>
                    {formatGrade(grade)}
                  </Option>
                );
              })}
              <Option value="K">Kindergarten</Option>
              <Option value="PK">Pre-Kindergarten</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingClass ? 'Update Class' : 'Create Class'}
              </Button>
              <Button onClick={() => classForm.resetFields()}>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add/Edit Group Modal */}
      <Modal
        title={<>
          <ApartmentOutlined /> {editingGroup ? 'Edit Class Group' : 'Add New Class Group'}
        </>}
        visible={isGroupModalVisible}
        onCancel={() => setIsGroupModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={groupForm} layout="vertical" onFinish={handleGroupSubmit}>
          <Form.Item
            name="name"
            label="Group Name"
            rules={[{ required: true, message: 'Please enter a group name' }]}
          >
            <Input placeholder="e.g., Primary Classes" />
          </Form.Item>

          <Form.Item
            name="class_ids"
            label="Classes in Group"
            rules={[{ required: true, message: 'Please select at least one class' }]}
          >
            <TreeSelect
              treeData={[
                {
                  title: 'All Classes',
                  value: 'all',
                  key: 'all',
                  children: classes.map(cls => ({
                    title: `${cls.name} (Grade ${cls.grade})`,
                    value: cls.id,
                    key: cls.id
                  }))
                }
              ]}
              treeCheckable={true}
              showCheckedStrategy="SHOW_PARENT"
              placeholder="Select classes to include in this group"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingGroup ? 'Update Group' : 'Create Group'}
              </Button>
              <Button onClick={() => groupForm.resetFields()}>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SubjectClassManager;