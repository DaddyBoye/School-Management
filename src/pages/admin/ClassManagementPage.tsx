import React, { useState, useEffect } from 'react';
import { 
  Card, Button, List, Modal, Form, Input, 
  Select, TreeSelect, Space, Tag, Badge, 
  Typography, Popconfirm, Collapse, Empty,
  message,
  Row,
  Col
} from 'antd';
import { 
  TeamOutlined, PlusOutlined, DeleteOutlined, 
  EditOutlined, FolderOpenOutlined, ApartmentOutlined
} from '@ant-design/icons';
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

interface ClassSubject {
  id: number;
  class_id: string;
  subject_id: number;
  school_id: string;
}

const { Text } = Typography;
const { Panel } = Collapse;

const ClassManagementPage: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [classForm] = Form.useForm();
  const [groupForm] = Form.useForm();
  const [isClassModalVisible, setIsClassModalVisible] = useState(false);
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);

  // Fetch data
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

  // Handle new class creation
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

  // Get classes in a group
  const getClassesInGroup = (group: ClassGroup) => {
    return classes.filter(cls => group.class_ids.includes(cls.id));
  };

  // Get assignment count for a class
  const getAssignmentCount = (classId: string) => {
    return classSubjects.filter(cs => cs.class_id === classId).length;
  };

  // Show class modal
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

  // Show group modal
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

  // Format grade level
  const formatGrade = (grade: string) => {
    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum)) return grade;
    
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = gradeNum % 100;
    return gradeNum + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]) + ' Grade';
  };

  return (
    <div className="min-h-screen">
      <Row gutter={[16, 16]}>
        {/* Classes Section */}
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
                      count={getAssignmentCount(cls.id)} 
                      style={{ backgroundColor: '#1890ff' }} 
                    />
                    <Text type="secondary" style={{ marginLeft: 8 }}>assigned subjects</Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Class Groups Section */}
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
        </Col>
      </Row>

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
    </div>
  );
};

export default ClassManagementPage;