import React, { useState, useEffect } from 'react';
import { 
  Card, Button, List, Modal, Form, Input, 
  Select, TreeSelect, Space, Tag, Badge, 
  Typography, Popconfirm, Collapse, Empty,
  message, Tabs, Table,
  InputNumber,
  Switch
} from 'antd';
import { 
  TeamOutlined, PlusOutlined, DeleteOutlined, 
  EditOutlined, FolderOpenOutlined, ApartmentOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import { supabase } from '../../supabase';

const { Text } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

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

interface ClassSubject {
  id: number;
  class_id: string;
  subject_id: number;
  school_id: string;
}

interface GradeCategory {
  id: number;
  class_id: string;
  name: string;
  weight: number;
  parent_category_id: number | null;
  is_main_category: boolean;
  school_id: string;
  created_at?: string;
}

const ClassManagementPage: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  // State declarations
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [gradeCategories, setGradeCategories] = useState<GradeCategory[]>([]);
  const [isClassModalVisible, setIsClassModalVisible] = useState(false);
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);
  const [editingCategory, setEditingCategory] = useState<GradeCategory | null>(null);
  const [selectedClassForCategories, setSelectedClassForCategories] = useState<string | null>(null);
  
  // Form instances
  const [classForm] = Form.useForm();
  const [groupForm] = Form.useForm();
  const [categoryForm] = Form.useForm();

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchClasses(),
          fetchClassGroups(),
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

  const fetchClassSubjects = async () => {
    const { data, error } = await supabase
      .from('class_subjects')
      .select('*')
      .eq('school_id', schoolId);

    if (error) throw error;
    setClassSubjects(data || []);
  };

  const fetchGradeCategories = async (classId?: string) => {
    let query = supabase
      .from('grade_categories')
      .select('*')
      .eq('school_id', schoolId);

    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data, error } = await query;

    if (error) throw error;
    setGradeCategories(data || []);
  };

  // Class management functions
  const handleClassSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      if (editingClass) {
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

  // Group management functions
  const handleGroupSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      if (editingGroup) {
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

  // Grade category management functions
  const handleCategorySubmit = async (values: any) => {
    try {
      setLoading(true);
      
      if (!selectedClassForCategories) {
        message.error('Please select a class first');
        return;
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('grade_categories')
          .update({
            name: values.name,
            weight: values.weight,
            parent_category_id: values.parent_category_id || null,
            is_main_category: values.is_main_category
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        message.success('Category updated successfully');
      } else {
        const { error } = await supabase
          .from('grade_categories')
          .insert([{
            name: values.name,
            weight: values.weight,
            class_id: selectedClassForCategories,
            parent_category_id: values.parent_category_id || null,
            is_main_category: values.is_main_category,
            school_id: schoolId
          }]);

        if (error) throw error;
        message.success('Category created successfully');
      }

      fetchGradeCategories(selectedClassForCategories);
      setIsCategoryModalVisible(false);
      categoryForm.resetFields();
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      message.error('Failed to save category');
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
      fetchGradeCategories(selectedClassForCategories ?? undefined);
    } catch (error) {
      console.error('Error deleting grade category:', error);
      message.error('Failed to delete grade category');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getClassesInGroup = (group: ClassGroup) => {
    return classes.filter(cls => group.class_ids.includes(cls.id));
  };

  const getAssignmentCount = (classId: string) => {
    return classSubjects.filter(cs => cs.class_id === classId).length;
  };

  const formatGrade = (grade: string) => {
    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum)) return grade;
    
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = gradeNum % 100;
    return gradeNum + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]) + ' Grade';
  };

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

  const showCategoryModal = (classId: string, categoryToEdit?: GradeCategory) => {
    setSelectedClassForCategories(classId);
    
    if (categoryToEdit) {
      setEditingCategory(categoryToEdit);
      categoryForm.setFieldsValue({
        name: categoryToEdit.name,
        weight: categoryToEdit.weight,
        parent_category_id: categoryToEdit.parent_category_id,
        is_main_category: categoryToEdit.is_main_category
      });
    } else {
      setEditingCategory(null);
      categoryForm.resetFields();
      // Set default values for new categories
      categoryForm.setFieldsValue({
        is_main_category: false,
        weight: 10 // Default weight for new categories
      });
    }
    
    setIsCategoryModalVisible(true);
  };

  return (
    <div className="min-h-screen">
      <Tabs defaultActiveKey="1">
        {/* Classes Tab */}
        <TabPane
          tab={
            <span>
              <TeamOutlined />
              Classes
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
                    <Button
                      onClick={() => {
                        setSelectedClassForCategories(cls.id);
                        fetchGradeCategories(cls.id);
                        showCategoryModal(cls.id);
                      }}
                      icon={<ApartmentOutlined />}
                    >
                      Categories
                    </Button>,
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
                      count={getAssignmentCount(cls.id)} 
                      style={{ backgroundColor: '#1890ff' }} 
                    />
                    <Text type="secondary" style={{ marginLeft: 8 }}>assigned subjects</Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </TabPane>

        {/* Class Groups Tab */}
        <TabPane
          tab={
            <span>
              <FolderOpenOutlined />
              Class Groups
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
                              count={getAssignmentCount(cls.id)} 
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
        </TabPane>
      </Tabs>

      {/* Class Category Management Section */}
      {selectedClassForCategories && (
        <Card 
          title={
            <Space>
              <ApartmentOutlined />
              <Text strong>
                Grade Categories for: {classes.find(s => s.id === selectedClassForCategories)?.name}
              </Text>
              <Tag>{gradeCategories.filter(c => c.class_id === selectedClassForCategories).length} categories</Tag>
            </Space>
          }
          style={{ marginTop: 24 }}
          extra={
            <Space>
              <Button 
                onClick={() => showCategoryModal(selectedClassForCategories)}
                icon={<PlusOutlined />}
              >
                Add Category
              </Button>
              <Button 
                onClick={() => {
                  setSelectedClassForCategories(null);
                  setGradeCategories([]);
                }}
              >
                Close
              </Button>
            </Space>
          }
        >
          <Table
            dataSource={gradeCategories.filter(c => c.class_id === selectedClassForCategories)}
            rowKey="id"
            pagination={false}
            columns={[
              {
                title: 'Category Name',
                dataIndex: 'name',
                key: 'name',
                render: (text, record) => (
                  <div style={{ paddingLeft: record.parent_category_id ? 20 : 0 }}>
                    {record.parent_category_id && '↳ '}
                    <Text strong>{text}</Text>
                  </div>
                )
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
                title: 'Type',
                dataIndex: 'is_main_category',
                key: 'type',
                render: (isMain) => (
                  <Tag color={isMain ? 'green' : 'orange'}>
                    {isMain ? 'Main Category' : 'Subcategory'}
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
                      onClick={() => showCategoryModal(selectedClassForCategories, record)}
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
                    .filter(c => c.class_id === selectedClassForCategories && c.is_main_category)
                    .reduce((sum, cat) => sum + cat.weight, 0)}%
                </Text>
              </div>
            )}
          />
        </Card>
      )}

      {/* Class Modal */}
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
                  <Select.Option key={grade} value={grade}>
                    {formatGrade(grade)}
                  </Select.Option>
                );
              })}
              <Select.Option value="K">Kindergarten</Select.Option>
              <Select.Option value="PK">Pre-Kindergarten</Select.Option>
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

      {/* Group Modal */}
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

      {/* Grade Category Modal */}
      <Modal
        title={
          <Space>
            <ApartmentOutlined />
            {editingCategory ? 'Edit Grade Category' : 'Create New Grade Category'}
          </Space>
        }
        visible={isCategoryModalVisible}
        onCancel={() => setIsCategoryModalVisible(false)}
        footer={null}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleCategorySubmit}
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

          <Form.Item
            name="parent_category_id"
            label="Parent Category (optional)"
          >
            <Select
              placeholder="Select parent category"
              allowClear
            >
              {gradeCategories
                .filter(c => c.class_id === selectedClassForCategories && c.is_main_category)
                .map(category => (
                  <Select.Option key={category.id} value={category.id}>
                    {category.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="is_main_category"
            label="Main Category"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Yes" 
              unCheckedChildren="No" 
              disabled={!!editingCategory?.parent_category_id}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingCategory ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setIsCategoryModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClassManagementPage;