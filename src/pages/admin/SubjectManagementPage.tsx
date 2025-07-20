import React, { useState, useEffect } from 'react';
import { 
  Card, Button, List, Modal, Form, Input, 
  Table, Space, Tag, Badge, Typography, 
  Popconfirm, Divider, InputNumber, Switch, 
  Empty, message, Tabs,
  Row,
  Col
} from 'antd';
import { 
  BookOutlined, PlusOutlined, DeleteOutlined, 
  EditOutlined, ApartmentOutlined, PercentageOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import { supabase } from '../../supabase';
import TextArea from 'antd/es/input/TextArea';

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

interface GradeCategory {
  id: number;
  name: string;
  weight: number;
  subject_id: number;
  school_id: string;
}

interface ClassSubject {
  id: number;
  class_id: string;
  subject_id: number;
  school_id: string;
}

const { Text } = Typography;
const { TabPane } = Tabs;

const SubjectManagementPage: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeScales, setGradeScales] = useState<GradeScale[]>([]);
  const [gradeCategories, setGradeCategories] = useState<GradeCategory[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [subjectForm] = Form.useForm();
  const [gradeScaleForm] = Form.useForm();
  const [gradeCategoryForm] = Form.useForm();
  const [isSubjectModalVisible, setIsSubjectModalVisible] = useState(false);
  const [isGradeScaleModalVisible, setIsGradeScaleModalVisible] = useState(false);
  const [isGradeCategoryModalVisible, setIsGradeCategoryModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingGradeScale, setEditingGradeScale] = useState<GradeScale | null>(null);
  const [editingGradeCategory, setEditingGradeCategory] = useState<GradeCategory | null>(null);
  const [selectedSubjectForCategories, setSelectedSubjectForCategories] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchSubjects(),
          fetchGradeScales(),
          fetchGradeCategories(),
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

  const fetchGradeCategories = async (subjectId?: number) => {
    let query = supabase
      .from('grade_categories')
      .select('*')
      .eq('school_id', schoolId);

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = await query;

    if (error) throw error;
    setGradeCategories(data || []);
  };

  const fetchClassSubjects = async () => {
    const { data, error } = await supabase
      .from('class_subjects')
      .select('*')
      .eq('school_id', schoolId);

    if (error) throw error;
    setClassSubjects(data || []);
  };

  const handleSubjectSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      if (editingSubject) {
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

  const deleteSubject = async (subjectId: number) => {
    try {
      setLoading(true);
      
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

  const handleGradeScaleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const scale: Record<string, number> = {};
      values.grades.forEach((grade: any) => {
        scale[grade.letter] = grade.threshold;
      });

      if (editingGradeScale) {
        const { error } = await supabase
          .from('grade_scales')
          .update({
            name: values.name,
            scale,
            is_default: values.is_default
          })
          .eq('id', editingGradeScale.id);

        if (error) throw error;
        message.success('Grade scale updated successfully');
      } else {
        const { error } = await supabase
          .from('grade_scales')
          .insert([{
            name: values.name,
            scale,
            is_default: values.is_default,
            school_id: schoolId
          }]);

        if (error) throw error;
        message.success('Grade scale created successfully');
      }

      if (values.is_default) {
        await supabase
          .from('grade_scales')
          .update({ is_default: false })
          .neq('id', editingGradeScale?.id || 0)
          .eq('school_id', schoolId);
      }

      fetchGradeScales();
      setIsGradeScaleModalVisible(false);
      gradeScaleForm.resetFields();
      setEditingGradeScale(null);
    } catch (error) {
      console.error('Error saving grade scale:', error);
      message.error('Failed to save grade scale');
    } finally {
      setLoading(false);
    }
  };

  const deleteGradeScale = async (id: number) => {
    try {
      setLoading(true);
      
      const { count } = await supabase
        .from('class_subjects')
        .select('*', { count: 'exact' })
        .eq('grade_scale_id', id);

      if (count && count > 0) {
        message.error('Cannot delete grade scale that is in use');
        return;
      }

      const { error } = await supabase
        .from('grade_scales')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      message.success('Grade scale deleted successfully');
      fetchGradeScales();
    } catch (error) {
      console.error('Error deleting grade scale:', error);
      message.error('Failed to delete grade scale');
    } finally {
      setLoading(false);
    }
  };

  const setDefaultGradeScale = async (id: number) => {
    try {
      setLoading(true);
      
      await supabase
        .from('grade_scales')
        .update({ is_default: false })
        .eq('school_id', schoolId);

      const { error } = await supabase
        .from('grade_scales')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      
      message.success('Default grade scale updated');
      fetchGradeScales();
    } catch (error) {
      console.error('Error setting default grade scale:', error);
      message.error('Failed to set default grade scale');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeCategorySubmit = async (values: any) => {
    try {
      setLoading(true);
      
      if (!selectedSubjectForCategories) {
        message.error('Please select a subject first');
        return;
      }

      if (editingGradeCategory) {
        const { error } = await supabase
          .from('grade_categories')
          .update({
            name: values.name,
            weight: values.weight,
            subject_id: selectedSubjectForCategories
          })
          .eq('id', editingGradeCategory.id);

        if (error) throw error;
        message.success('Grade category updated successfully');
      } else {
        const { error } = await supabase
          .from('grade_categories')
          .insert([{
            name: values.name,
            weight: values.weight,
            subject_id: selectedSubjectForCategories,
            school_id: schoolId
          }]);

        if (error) throw error;
        message.success('Grade category created successfully');
      }

      fetchGradeCategories(selectedSubjectForCategories);
      setIsGradeCategoryModalVisible(false);
      gradeCategoryForm.resetFields();
      setEditingGradeCategory(null);
    } catch (error) {
      console.error('Error saving grade category:', error);
      message.error('Failed to save grade category');
    } finally {
      setLoading(false);
    }
  };

  const deleteGradeCategory = async (id: number) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('grade_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      message.success('Grade category deleted successfully');
      fetchGradeCategories(selectedSubjectForCategories ?? undefined);
    } catch (error) {
      console.error('Error deleting grade category:', error);
      message.error('Failed to delete grade category');
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentCount = (subjectId: number) => {
    return classSubjects.filter(cs => cs.subject_id === subjectId).length;
  };

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

  const showGradeScaleModal = (gradeScaleToEdit?: GradeScale) => {
    if (gradeScaleToEdit) {
      setEditingGradeScale(gradeScaleToEdit);
      const grades = Object.entries(gradeScaleToEdit.scale).map(([letter, threshold]) => ({
        letter,
        threshold
      }));
      gradeScaleForm.setFieldsValue({
        name: gradeScaleToEdit.name,
        is_default: gradeScaleToEdit.is_default,
        grades
      });
    } else {
      setEditingGradeScale(null);
      gradeScaleForm.resetFields();
      gradeScaleForm.setFieldsValue({
        grades: [{ letter: 'A', threshold: 90 }]
      });
    }
    setIsGradeScaleModalVisible(true);
  };

  const showGradeCategoryModal = (subjectId: number, categoryToEdit?: GradeCategory) => {
    setSelectedSubjectForCategories(subjectId);
    
    if (categoryToEdit) {
      setEditingGradeCategory(categoryToEdit);
      gradeCategoryForm.setFieldsValue({
        name: categoryToEdit.name,
        weight: categoryToEdit.weight
      });
    } else {
      setEditingGradeCategory(null);
      gradeCategoryForm.resetFields();
    }
    
    setIsGradeCategoryModalVisible(true);
  };

  return (
    <div className="min-h-screen">
      <Tabs defaultActiveKey="1">
        {/* Subjects Tab */}
        <TabPane
          tab={
            <span>
              <BookOutlined />
              Subjects
            </span>
          }
          key="1"
        >
          <Card 
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
                    <Button
                      onClick={() => {
                        setSelectedSubjectForCategories(subject.id);
                        fetchGradeCategories(subject.id);
                      }}
                      icon={<ApartmentOutlined />}
                    >
                      Categories
                    </Button>,
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
                      count={getAssignmentCount(subject.id)} 
                      style={{ backgroundColor: '#1890ff' }} 
                    />
                    <Text type="secondary" style={{ marginLeft: 8 }}>class assignments</Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </TabPane>

        {/* Grade Scales Tab */}
        <TabPane
          tab={
            <span>
              <PercentageOutlined />
              Grade Scales
            </span>
          }
          key="2"
        >
          <Card 
            bordered={false}
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => showGradeScaleModal()}
              >
                Add Grade Scale
              </Button>
            }
          >
            {gradeScales.length > 0 ? (
              <Table
                dataSource={gradeScales}
                rowKey="id"
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
                        {Object.entries(scale)
                          .sort((a, b) => b[1] - a[1])
                          .map(([grade, threshold]) => (
                            <Tag key={grade}>
                              {grade}: ≥{threshold}%
                            </Tag>
                          ))}
                      </Space>
                    )
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: (_, record) => (
                      <Space>
                        <Button 
                          icon={<EditOutlined />}
                          onClick={() => showGradeScaleModal(record)}
                        />
                        {!record.is_default && (
                          <>
                            <Button 
                              onClick={() => setDefaultGradeScale(record.id)}
                            >
                              Set Default
                            </Button>
                            <Popconfirm
                              title="Are you sure you want to delete this grade scale?"
                              onConfirm={() => deleteGradeScale(record.id)}
                              okText="Yes"
                              cancelText="No"
                            >
                              <Button danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </>
                        )}
                      </Space>
                    )
                  }
                ]}
              />
            ) : (
              <Empty description="No grade scales defined">
                <Button 
                  type="primary" 
                  onClick={() => showGradeScaleModal()}
                >
                  Create First Grade Scale
                </Button>
              </Empty>
            )}
          </Card>
        </TabPane>
      </Tabs>

      {/* Grade Categories Panel */}
      {selectedSubjectForCategories && (
        <Card 
          title={
            <Space>
              <ApartmentOutlined />
              <Text strong>
                Grade Categories for: {subjects.find(s => s.id === selectedSubjectForCategories)?.name}
              </Text>
              <Tag>{gradeCategories.filter(c => c.subject_id === selectedSubjectForCategories).length} categories</Tag>
            </Space>
          }
          style={{ marginTop: 24 }}
          extra={
            <Space>
              <Button 
                onClick={() => showGradeCategoryModal(selectedSubjectForCategories)}
                icon={<PlusOutlined />}
              >
                Add Category
              </Button>
              <Button 
                onClick={() => {
                  setSelectedSubjectForCategories(null);
                  setGradeCategories([]);
                }}
              >
                Close
              </Button>
            </Space>
          }
        >
          <Table
            dataSource={gradeCategories.filter(c => c.subject_id === selectedSubjectForCategories)}
            rowKey="id"
            pagination={false}
            columns={[
              {
                title: 'Category Name',
                dataIndex: 'name',
                key: 'name',
                render: (text) => <Text strong>{text}</Text>
              },
              {
                title: 'Weight',
                dataIndex: 'weight',
                key: 'weight',
                render: (weight) => (
                  <Tag icon={<PercentageOutlined />} color="blue">
                    {weight}%
                  </Tag>
                )
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => (
                  <Space>
                    <Button 
                      icon={<EditOutlined />}
                      onClick={() => showGradeCategoryModal(selectedSubjectForCategories, record)}
                    />
                    <Popconfirm
                      title="Are you sure? This will affect grade calculations!"
                      onConfirm={() => deleteGradeCategory(record.id)}
                    >
                      <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                )
              }
            ]}
            footer={() => (
              <div style={{ textAlign: 'right' }}>
                <Text strong>
                  Total Weight: {gradeCategories
                    .filter(c => c.subject_id === selectedSubjectForCategories)
                    .reduce((sum, cat) => sum + cat.weight, 0)}%
                </Text>
              </div>
            )}
          />
        </Card>
      )}

      {/* Subject Modal */}
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

      {/* Grade Scale Modal */}
      <Modal
        title={
          <Space>
            <PercentageOutlined />
            {editingGradeScale ? 'Edit Grade Scale' : 'Create New Grade Scale'}
          </Space>
        }
        visible={isGradeScaleModalVisible}
        onCancel={() => setIsGradeScaleModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={gradeScaleForm}
          layout="vertical"
          onFinish={handleGradeScaleSubmit}
        >
          <Form.Item
            name="name"
            label="Grade Scale Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., Standard Grading Scale" />
          </Form.Item>

          <Form.Item
            name="is_default"
            label="Default Scale"
            valuePropName="checked"
          >
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>

          <Form.List name="grades">
            {(fields, { add, remove }) => (
              <>
                <Divider orientation="left">Grade Thresholds</Divider>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'letter']}
                      rules={[{ required: true, message: 'Grade letter is required' }]}
                    >
                      <Input placeholder="Letter (e.g., A)" style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'threshold']}
                      rules={[{ required: true, message: 'Threshold is required' }]}
                    >
                      <InputNumber 
                        placeholder="Threshold %" 
                        min={0} 
                        max={100} 
                        style={{ width: 120 }}
                        addonAfter="%"
                      />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button 
                    type="dashed" 
                    onClick={() => add()} 
                    block 
                    icon={<PlusOutlined />}
                  >
                    Add Grade
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingGradeScale ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setIsGradeScaleModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Grade Category Modal */}
      <Modal
        title={
          <Space>
            <PercentageOutlined />
            {editingGradeCategory ? 'Edit Grade Category' : 'Create New Grade Category'}
          </Space>
        }
        visible={isGradeCategoryModalVisible}
        onCancel={() => setIsGradeCategoryModalVisible(false)}
        footer={null}
      >
        <Form
          form={gradeCategoryForm}
          layout="vertical"
          onFinish={handleGradeCategorySubmit}
        >
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., Exams, Homework, Participation" />
          </Form.Item>

          <Form.Item
            name="weight"
            label="Weight (%)"
            rules={[
              { required: true, message: 'Please enter weight percentage' },
              { type: 'number', min: 1, max: 100, message: 'Must be between 1-100' }
            ]}
          >
            <InputNumber 
              placeholder="Weight percentage" 
              min={1} 
              max={100} 
              style={{ width: '100%' }}
              addonAfter="%"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingGradeCategory ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setIsGradeCategoryModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SubjectManagementPage;