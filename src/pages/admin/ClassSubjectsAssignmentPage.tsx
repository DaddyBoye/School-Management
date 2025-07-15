import React, { useState } from 'react';
import { 
  Card, Form, Select, Button, Table, Modal, 
  message, Row, Col, Typography, 
  Tag, Badge, Space, Popconfirm, Empty,
  Input
} from 'antd';
import { 
  BookOutlined, TeamOutlined, PlusOutlined, 
  DeleteOutlined, FilterOutlined, InfoCircleOutlined,
  ApartmentOutlined} from '@ant-design/icons';
import { supabase } from '../../supabase';

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

const { Option } = Select;
const { Title, Text } = Typography;

const ClassSubjectsAssignmentPage: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeScales, setGradeScales] = useState<GradeScale[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [selectedClassRange, setSelectedClassRange] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchClasses(),
          fetchClassGroups(),
          fetchSubjects(),
          fetchGradeScales(),
          fetchClassSubjects(),
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

  // Handle form submission
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

  // Handle bulk assignment
  const handleBulkSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const assignments = selectedClassRange.map(classId => ({
        class_id: classId,
        subject_id: values.subject_id,
        grade_scale_id: values.grade_scale_id,
        school_id: schoolId
      }));

      const { error } = await supabase
        .from('class_subjects')
        .upsert(assignments, { onConflict: 'class_id,subject_id' });

      if (error) throw error;
      
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

  return (
    <div className="min-h-screen">
      <Card>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Space>
                <Input 
                  placeholder="Search assignments..." 
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 250 }}
                />
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
                  onClick={() => form.resetFields()}
                >
                  New Assignment
                </Button>
                <Button 
                  onClick={() => setIsBulkModalVisible(true)}
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
                pagination={{ pageSize: 10, showSizeChanger: true }}
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
      </Card>

      {/* Assignment Form */}
      <Card style={{ marginTop: 16 }}>
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
            </Space>
          </Form.Item>
        </Form>
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
              {Array.from(new Set(classes.map(cls => cls.grade))).sort().map(grade => (
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
    </div>
  );
};

export default ClassSubjectsAssignmentPage;