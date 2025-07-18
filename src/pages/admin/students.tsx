import { useState, useEffect } from 'react';
import { supabase } from "../../supabase";
import { sendEmail } from '../../services/emailService';
import { generatePassword } from '../../services/passwordGenerator';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  BookOutlined, 
  CalendarOutlined, 
  EnvironmentOutlined,
  UserOutlined,
  DeleteOutlined,
  EyeOutlined,
  HeartOutlined,
  LoadingOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { 
  Table, 
  Card, 
  Button, 
  Input, 
  Select, 
  Modal, 
  Form, 
  Avatar, 
  Tag, 
  message, 
  Upload,
  Descriptions,
  Space,
  Popconfirm,
  DatePicker,
  UploadProps,
  Tabs,
  Switch,
  Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Option } = Select;

interface Student {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  gender?: string;
  date_of_birth?: string;
  class_id: string;
  class_name?: string;
  parent_name: string;
  parent_email?: string;
  parent_phone: string;
  parent_relationship?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  join_date: string;
  school_id: string;
  medical_notes?: string;
  allergies?: string;
  previous_school?: string;
  enrollment_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  image_url?: string;
  student_code?: string;
}

interface Class {
  id: string;
  name: string;
  grade: string;
  school_id: string;
}

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

const relationshipOptions = [
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' }
];

const enrollmentStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'transferred', label: 'Transferred' }
];

const ImageUploader = ({ onUpload, currentImage }: { 
  onUpload: (url: string, path: string) => void;
  currentImage?: string;
}) => {
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    if (currentImage) {
      setFileList([{
        uid: '-1',
        name: 'current-image',
        status: 'done',
        url: currentImage
      }]);
    }
  }, [currentImage]);

  const handleUpload = async (options: any) => {
    const { file } = options;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      setFileList([{
        uid: filePath,
        name: filePath,
        status: 'done',
        url: publicUrl
      }]);

      onUpload(publicUrl, filePath);
    } catch (error) {
      console.error("Upload error:", error);
      message.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    accept: 'image/*',
    maxCount: 1,
    fileList,
    customRequest: handleUpload,
    onChange: ({ fileList: newFileList }) => setFileList(newFileList),
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('You can only upload image files!');
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Image must be smaller than 5MB!');
      }
      return isImage && isLt5M;
    },
    listType: "picture-card",
    showUploadList: {
      showRemoveIcon: true,
    },
  };

  return (
    <Upload {...uploadProps}>
      {fileList.length >= 1 ? null : (
        <div>
          {uploading ? <LoadingOutlined /> : <PlusOutlined />}
          <div style={{ marginTop: 8 }}>Upload Photo</div>
        </div>
      )}
    </Upload>
  );
};

const StudentManagement = ({ schoolId, schoolName }: { schoolId: string; schoolName: string }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [filterParams, setFilterParams] = useState({
    searchTerm: "",
    selectedClass: "All Classes",
    selectedStatus: "All"
  });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("*")
        .eq("school_id", schoolId);
      
      if (classesError) throw classesError;
      setClasses(classesData || []);
      
      // Fetch students with class names
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select(`
          *,
          classes:classes!class_id(name)
        `)
        .eq("school_id", schoolId);

      if (studentsError) throw studentsError;
      
      const formattedStudents = (studentsData || []).map(student => ({
        ...student,
        class_name: student.classes?.name,
        is_active: student.enrollment_status === 'active'
      }));

      setStudents(formattedStudents);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      message.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.first_name.toLowerCase().includes(filterParams.searchTerm.toLowerCase()) ||
                         student.last_name.toLowerCase().includes(filterParams.searchTerm.toLowerCase()) ||
                         student.parent_name.toLowerCase().includes(filterParams.searchTerm.toLowerCase()) ||
                         student.student_code?.toLowerCase().includes(filterParams.searchTerm.toLowerCase());
    
    const matchesClass = filterParams.selectedClass === "All Classes" || 
                        student.class_id === filterParams.selectedClass;
    
    const matchesStatus = filterParams.selectedStatus === "All" || 
                        (filterParams.selectedStatus === "Active" && student.is_active) || 
                        (filterParams.selectedStatus === "Inactive" && !student.is_active);

    return matchesSearch && matchesClass && matchesStatus;
  });

const handleAddStudent = async (values: any) => {
  setIsSubmitting(true);
  let userId: string | null = null;
  
  try {
    // 1. Generate student code
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId);

    const studentCode = `STU-${schoolId}-${(count || 0) + 1}`;
    const password = generatePassword();
    
    // 2. Create user with admin API
    const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
      email: values.email,
      password: password,
      user_metadata: { 
        role: 'student',
        school_id: schoolId
      },
      email_confirm: true // Skip email confirmation
    });

    if (authError) throw authError;
    if (!user) throw new Error("Failed to create user");
    
    // Store the user ID for potential cleanup
    userId = user.id;

    // 3. Create student record
    const { error: studentError } = await supabase
      .from("students")
      .insert([{ 
        ...values,
        student_code: studentCode,
        user_id: user.id,
        join_date: values.join_date.format('YYYY-MM-DD'),
        date_of_birth: values.date_of_birth?.format('YYYY-MM-DD'),
        enrollment_status: 'active',
        school_id: schoolId
      }])
      .select()
      .single();

    if (studentError) throw studentError;

    // 4. Send welcome email
    await sendEmail(
      values.email,
      `${values.first_name} ${values.last_name}`,
      schoolName,
      password,
      'https://stjoba.klaso.site',
      'no-reply@school.com',
      'School Admin',
      'Student'
    );

    // 5. Refresh and reset
    await fetchData();
    setIsModalVisible(false);
    form.resetFields();
    message.success('Student added successfully');
  } catch (error) {
    console.error('Error adding student:', error);
    
    // Clean up auth user if student creation failed
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
        console.log('Deleted orphaned auth user');
      } catch (deleteError) {
        console.error('Error deleting orphaned auth user:', deleteError);
      }
    }
    
    message.error(
      error instanceof Error ? 
      error.message : 
      "Failed to add student. Please try again."
    );
  } finally {
    setIsSubmitting(false);
  }
};

  const handleEditStudent = async (values: any) => {
    if (!selectedStudent) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("students")
        .update({
          ...values,
          date_of_birth: values.date_of_birth?.format('YYYY-MM-DD'),
          join_date: values.join_date.format('YYYY-MM-DD')
        })
        .eq("id", selectedStudent.id)
        .select()
        .single();

      if (error) throw error;

      await fetchData();
      setIsEditMode(false);
      setSelectedStudent(null);
      message.success('Student updated successfully');
    } catch (error) {
      console.error('Error updating student:', error);
      message.error(error instanceof Error ? error.message : "Failed to update student");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      setLoading(true);
      
      const { data: studentData, error: fetchError } = await supabase
        .from("students")
        .select("user_id, image_url")
        .eq("id", studentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (studentData.image_url) {
        const { error: deleteImageError } = await supabase.storage
          .from('student-photos')
          .remove([studentData.image_url]);
        
        if (deleteImageError) console.error('Error deleting image:', deleteImageError);
      }
      
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

      if (error) throw error;

      if (studentData.user_id) {
        await supabase.auth.admin.deleteUser(studentData.user_id);
      }

      setStudents(students.filter(student => student.id !== studentId));
      if (selectedStudent?.id === studentId) {
        setSelectedStudent(null);
      }
      message.success('Student deleted successfully');
    } catch (error) {
      console.error('Error deleting student:', error);
      message.error(error instanceof Error ? error.message : "Failed to delete student");
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentStatus = async (studentId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("students")
        .update({ enrollment_status: isActive ? 'active' : 'inactive' })
        .eq("id", studentId);
  
      if (error) throw error;
  
      setStudents(students.map(student => 
        student.id === studentId ? { ...student, is_active: isActive } : student
      ));
      
      if (selectedStudent?.id === studentId) {
        setSelectedStudent({ ...selectedStudent, is_active: isActive });
      }
      
      message.success(`Student ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling student status:', error);
      message.error(error instanceof Error ? error.message : "Failed to update student status");
    }
  };

  const columns: ColumnsType<Student> = [
    {
      title: 'Student',
      dataIndex: 'first_name',
      key: 'name',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar 
            src={record.image_url} 
            icon={<UserOutlined />} 
            size="large"
          />
          <div>
            <div className="font-medium">{record.first_name} {record.last_name}</div>
            <div className="text-gray-500 text-sm">{record.student_code}</div>
            <div className="text-xs">
              <Tag color={record.is_active ? 'green' : 'red'}>
                {record.is_active ? 'Active' : 'Inactive'}
              </Tag>
            </div>
          </div>
        </div>
      ),
      sorter: (a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    },
    {
      title: 'Class',
      dataIndex: 'class_name',
      key: 'class',
      render: (className) => (
        <div>
          <div>{className || 'N/A'}</div>
        </div>
      ),
      sorter: (a, b) => (a.class_name || '').localeCompare(b.class_name || '')
    },
    {
      title: 'Parent',
      dataIndex: 'parent_name',
      key: 'parent',
      render: (parentName, record) => (
        <div>
          <div>{parentName}</div>
          <div className="text-gray-500 text-sm">{record.parent_phone}</div>
        </div>
      ),
      sorter: (a, b) => a.parent_name.localeCompare(b.parent_name)
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={(checked) => toggleStudentStatus(record.id, checked)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => setSelectedStudent(record)}
          />
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => {
              setSelectedStudent(record);
              setIsEditMode(true);
              setIsModalVisible(true);
              
              form.setFieldsValue({
                ...record,
                date_of_birth: record.date_of_birth ? dayjs(record.date_of_birth) : null,
                join_date: dayjs(record.join_date)
              });
            }}
          />
          <Popconfirm
            title="Are you sure you want to delete this student?"
            onConfirm={() => handleDeleteStudent(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  return (
    <div className="p-4">
      {error && (
        <div className="mb-4">
          <Alert message="Error" description={error} type="error" showIcon />
        </div>
      )}

      <Card 
        title="Students"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setIsModalVisible(true);
              setIsEditMode(false);
              form.resetFields();
              form.setFieldsValue({
                enrollment_status: 'active',
                join_date: dayjs(),
                school_id: schoolId
              });
            }}
          >
            Add Student
          </Button>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Search students..."
            prefix={<SearchOutlined />}
            value={filterParams.searchTerm}
            onChange={(e) => setFilterParams({...filterParams, searchTerm: e.target.value})}
            allowClear
            className="flex-1"
          />
          <Select
            placeholder="Filter by class"
            value={filterParams.selectedClass}
            onChange={(value) => setFilterParams({...filterParams, selectedClass: value})}
            className="w-full md:w-48"
          >
            <Option value="All Classes">All Classes</Option>
            {classes.map(cls => (
              <Option key={cls.id} value={cls.id}>{cls.name}</Option>
            ))}
          </Select>
          <Select
            placeholder="Filter by status"
            value={filterParams.selectedStatus}
            onChange={(value) => setFilterParams({...filterParams, selectedStatus: value})}
            className="w-full md:w-48"
          >
            <Option value="All">All Statuses</Option>
            <Option value="Active">Active</Option>
            <Option value="Inactive">Inactive</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filteredStudents}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: true }}
        />
      </Card>

      {/* Student Details Modal */}
      <Modal
        title={selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : 'Student Details'}
        open={!!selectedStudent && !isModalVisible}
        onCancel={() => setSelectedStudent(null)}
        footer={[
          <Button key="back" onClick={() => setSelectedStudent(null)}>
            Close
          </Button>,
          <Button 
            key="edit"
            type="primary" 
            onClick={() => {
              setIsEditMode(true);
              setIsModalVisible(true);
              form.setFieldsValue({
                ...selectedStudent,
                date_of_birth: selectedStudent?.date_of_birth ? dayjs(selectedStudent.date_of_birth) : null,
                join_date: dayjs(selectedStudent?.join_date)
              });
            }}
          >
            Edit
          </Button>
        ]}
        width={800}
      >
        {selectedStudent && (
          <div className="mt-4">
            <div className="flex items-start gap-6 mb-6">
              <Avatar 
                src={selectedStudent.image_url} 
                icon={<UserOutlined />} 
                size={100}
              />
              <div>
                <h3 className="text-xl font-bold">{selectedStudent.first_name} {selectedStudent.last_name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Tag color={selectedStudent.is_active ? 'green' : 'red'}>
                    {selectedStudent.is_active ? 'Active' : 'Inactive'}
                  </Tag>
                  <Tag color="blue">{selectedStudent.student_code}</Tag>
                </div>
              </div>
            </div>

            <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key)}>
              <TabPane tab="Personal Info" key="1">
                <Descriptions column={2}>
                  <Descriptions.Item label="Email">
                    <div className="flex items-center gap-2">
                      <MailOutlined />
                      <a href={`mailto:${selectedStudent.email}`}>{selectedStudent.email}</a>
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Date of Birth">
                    <div className="flex items-center gap-2">
                      <CalendarOutlined />
                      {selectedStudent.date_of_birth || 'N/A'}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Gender">
                    {genderOptions.find(g => g.value === selectedStudent.gender)?.label || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Join Date">
                    <div className="flex items-center gap-2">
                      <CalendarOutlined />
                      {selectedStudent.join_date}
                    </div>
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              <TabPane tab="Parent Info" key="2">
                <Descriptions column={2}>
                  <Descriptions.Item label="Parent Name">
                    <div className="flex items-center gap-2">
                      <TeamOutlined />
                      {selectedStudent.parent_name}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Relationship">
                    {relationshipOptions.find(r => r.value === selectedStudent.parent_relationship)?.label || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Parent Email">
                    <div className="flex items-center gap-2">
                      <MailOutlined />
                      {selectedStudent.parent_email || 'N/A'}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Parent Phone">
                    <div className="flex items-center gap-2">
                      <PhoneOutlined />
                      <a href={`tel:${selectedStudent.parent_phone}`}>{selectedStudent.parent_phone}</a>
                    </div>
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              <TabPane tab="Contact Info" key="3">
                <Descriptions column={2}>
                  <Descriptions.Item label="Emergency Contact">
                    {selectedStudent.emergency_contact_name || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Emergency Phone">
                    <div className="flex items-center gap-2">
                      <PhoneOutlined />
                      {selectedStudent.emergency_contact_phone || 'N/A'}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Address" span={2}>
                    <div className="flex items-center gap-2">
                      <EnvironmentOutlined />
                      {selectedStudent.address}
                    </div>
                    {selectedStudent.city && (
                      <div className="mt-1">
                        {selectedStudent.city}, {selectedStudent.state} {selectedStudent.postal_code}
                      </div>
                    )}
                    {selectedStudent.country && (
                      <div>{selectedStudent.country}</div>
                    )}
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              <TabPane tab="Medical Info" key="4">
                <Descriptions column={1}>
                  <Descriptions.Item label="Allergies">
                    <div className="flex items-center gap-2">
                      <HeartOutlined />
                      {selectedStudent.allergies || 'No known allergies'}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Medical Notes">
                    {selectedStudent.medical_notes || 'No medical notes'}
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              <TabPane tab="Academic Info" key="5">
                <Descriptions column={2}>
                  <Descriptions.Item label="Class">
                    <div className="flex items-center gap-2">
                      <BookOutlined />
                      {selectedStudent.class_name || 'N/A'}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Previous School">
                    {selectedStudent.previous_school || 'N/A'}
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>
            </Tabs>
          </div>
        )}
      </Modal>

      {/* Add/Edit Student Modal */}
      <Modal
        title={isEditMode ? 'Edit Student' : 'Add New Student'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={isEditMode ? handleEditStudent : handleAddStudent}
        >
          <Tabs defaultActiveKey="1">
            <TabPane tab="Basic Information" key="1">
              <div className="flex justify-center mb-6">
                <Form.Item label="Profile Photo" name="image_url">
                  <ImageUploader 
                    onUpload={(url) => {
                      form.setFieldsValue({
                        image_url: url,
                      });
                    }}
                    currentImage={selectedStudent?.image_url}
                  />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item 
                  label="First Name" 
                  name="first_name" 
                  rules={[{ required: true, message: 'Please input first name!' }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item 
                  label="Last Name" 
                  name="last_name" 
                  rules={[{ required: true, message: 'Please input last name!' }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item 
                  label="Email" 
                  name="email" 
                  rules={[{ required: true, type: 'email', message: 'Please input valid email!' }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item 
                  label="Student Code" 
                  name="student_code"
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item 
                  label="Date of Birth" 
                  name="date_of_birth"
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item label="Gender" name="gender">
                  <Select>
                    <Option value="male">Male</Option>
                    <Option value="female">Female</Option>
                    <Option value="other">Other</Option>
                    <Option value="prefer_not_to_say">Prefer not to say</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="Status" name="enrollment_status">
                  <Select>
                    {enrollmentStatusOptions.map(option => (
                      <Option key={option.value} value={option.value}>{option.label}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item label="Join Date" name="join_date" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </div>
            </TabPane>

            <TabPane tab="Parent Information" key="2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item 
                  label="Parent Name" 
                  name="parent_name" 
                  rules={[{ required: true, message: 'Please input parent name!' }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item label="Relationship" name="parent_relationship">
                  <Select>
                    <Option value="">Select Relationship</Option>
                    {relationshipOptions.map(option => (
                      <Option key={option.value} value={option.value}>{option.label}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item 
                  label="Parent Email" 
                  name="parent_email"
                  rules={[{ type: 'email', message: 'Please input valid email!' }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item 
                  label="Parent Phone" 
                  name="parent_phone" 
                  rules={[{ required: true, message: 'Please input parent phone!' }]}
                >
                  <Input />
                </Form.Item>
              </div>
            </TabPane>

            <TabPane tab="Contact Information" key="3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item label="Emergency Contact Name" name="emergency_contact_name">
                  <Input />
                </Form.Item>

                <Form.Item label="Emergency Contact Phone" name="emergency_contact_phone">
                  <Input />
                </Form.Item>

                <Form.Item 
                  label="Address" 
                  name="address" 
                  rules={[{ required: true, message: 'Please input address!' }]}
                  className="md:col-span-2"
                >
                  <Input.TextArea rows={2} />
                </Form.Item>

                <Form.Item label="City" name="city">
                  <Input />
                </Form.Item>

                <Form.Item label="State/Province" name="state">
                  <Input />
                </Form.Item>

                <Form.Item label="Postal Code" name="postal_code">
                  <Input />
                </Form.Item>

                <Form.Item label="Country" name="country">
                  <Input />
                </Form.Item>
              </div>
            </TabPane>

            <TabPane tab="Medical Information" key="4">
              <div className="grid grid-cols-1 gap-4">
                <Form.Item label="Allergies" name="allergies">
                  <Input.TextArea rows={3} />
                </Form.Item>

                <Form.Item label="Medical Notes" name="medical_notes">
                  <Input.TextArea rows={3} />
                </Form.Item>
              </div>
            </TabPane>

            <TabPane tab="Academic Information" key="5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item 
                  label="Class" 
                  name="class_id"
                  rules={[{ required: true, message: 'Please select class!' }]}
                >
                  <Select>
                    <Option value="">Select Class</Option>
                    {classes.map(cls => (
                      <Option key={cls.id} value={cls.id}>{cls.name}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item label="Previous School" name="previous_school">
                  <Input />
                </Form.Item>
              </div>
            </TabPane>
          </Tabs>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting}
            >
              {isEditMode ? 'Update Student' : 'Add Student'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default StudentManagement;