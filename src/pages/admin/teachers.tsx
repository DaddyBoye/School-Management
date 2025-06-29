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
  IdcardOutlined,
  LoadingOutlined,
  BankOutlined,
  DollarOutlined
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
  InputNumber,
  Switch,
  Alert
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Option } = Select;

interface StaffMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  class_id?: string;
  subject_id?: number;
  class_name?: string;
  subject_name?: string;
  subject_code?: string;
  education: string;
  experience: string;
  address: string;
  phone: string;
  joinDate: string;
  school_id: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  image_url: string;
  image_path?: string;
  staff_code: string;
  employment_type: string;
  position: string;
  department: string;
  is_teaching_staff: boolean;
  roles: {
    id: number;
    name: string;
    is_primary: boolean;
  }[];
  financial_details?: {
    salary?: number;
    bank_name?: string;
    bank_account_number?: string;
    tax_id?: string;
  };
}

interface StaffRole {
  id: number;
  name: string;
  description?: string;
  is_primary?: boolean;
}

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
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase storage
      const { error } = await supabase.storage
        .from('staff-photos')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('staff-photos')
        .getPublicUrl(filePath);

      setFileList([{
        uid: filePath,
        name: filePath,
        status: 'done',
        url: publicUrl
      }]);

      onUpload(publicUrl, filePath);
    } catch (error) {
      message.error('Upload failed');
      console.error('Upload error:', error);
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

const StaffManagement = ({ schoolId, schoolName }: { schoolId: string; schoolName: string }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [filterParams, setFilterParams] = useState({
    searchTerm: "",
    selectedDepartment: "All Departments",
    selectedRole: "All Roles",
    selectedStatus: "All",
    staffType: "All"
  });
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [financialForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFinancialModalVisible, setIsFinancialModalVisible] = useState(false);
  const [hasFinancialAccess, setHasFinancialAccess] = useState(false); // Based on user role

  useEffect(() => {
    fetchData();
    checkFinancialAccess();
  }, [schoolId]);

  const checkFinancialAccess = async () => {
    // Implement your actual access control check here
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.rpc('has_role', { role_name: 'admin' });
      setHasFinancialAccess(data || false);
    }
  };

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
      
      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("*")
        .eq("school_id", schoolId);
        
      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);

      // Fetch staff roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("staff_roles")
        .select("*")
        .eq("school_id", schoolId);
      
      if (rolesError) throw rolesError;
      setRoles(rolesData || []);

      // Fetch staff members with their roles and financial details
      const { data: staffData, error: staffError } = await supabase
        .from("teachers")
        .select(`
          *,
          classes:classes(name),
          subjects:subjects(name, code),
          teacher_roles!inner(
            is_primary,
            roles:staff_roles(id, name)
          ),
          financial_details:staff_financial_details(
            salary,
            bank_name,
            bank_account_number,
            tax_id
          )
        `)
        .eq("school_id", schoolId);

      if (staffError) throw staffError;
      
      // Format staff data
      const formattedStaff = (staffData || []).map(member => ({
        ...member,
        class_name: member.classes?.name,
        subject_name: member.subjects?.name,
        subject_code: member.subjects?.code,
        roles: member.teacher_roles.map((r: any) => ({
          id: r.roles.id,
          name: r.roles.name,
          is_primary: r.is_primary
        })),
        financial_details: member.financial_details
      }));

      setStaff(formattedStaff);

      // Extract unique departments
      const depts = [...new Set(formattedStaff.map(m => m.department).filter(Boolean))] as string[];
      setDepartments(['All Departments', ...depts]);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      message.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.first_name.toLowerCase().includes(filterParams.searchTerm.toLowerCase()) ||
                         member.last_name.toLowerCase().includes(filterParams.searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(filterParams.searchTerm.toLowerCase()) ||
                         member.staff_code?.toLowerCase().includes(filterParams.searchTerm.toLowerCase());
    
    const matchesDepartment = filterParams.selectedDepartment === "All Departments" || 
                            member.department === filterParams.selectedDepartment;
    
    const matchesRole = filterParams.selectedRole === "All Roles" || 
                       member.roles.some(r => r.name === filterParams.selectedRole);
    
    const matchesStatus = filterParams.selectedStatus === "All" || 
                         (filterParams.selectedStatus === "Active" && member.is_active) || 
                         (filterParams.selectedStatus === "Inactive" && !member.is_active);
    
    const matchesStaffType = filterParams.staffType === "All" ||
                           (filterParams.staffType === "Teaching" && member.is_teaching_staff) ||
                           (filterParams.staffType === "Non-Teaching" && !member.is_teaching_staff);

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus && matchesStaffType;
  });

  const handleAddStaff = async (values: any) => {
    setIsSubmitting(true);
    
    try {
      const password = generatePassword();
      
      // Create auth user
      const { data: { user }, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: password,
        options: { 
          data: { 
            role: values.is_teaching_staff ? 'teacher' : 'staff' 
          } 
        },
      });
  
      if (authError) throw authError;
      if (!user) throw new Error("Failed to create user");
  
      // Insert staff record
      const { data: staffData, error: staffError } = await supabase
        .from("teachers")
        .insert([{ 
          ...values,
          user_id: user.id,
          joinDate: values.joinDate.format('YYYY-MM-DD'),
          date_of_birth: values.date_of_birth?.format('YYYY-MM-DD'),
          is_active: true
        }])
        .select()
        .single();
  
      if (staffError) throw staffError;
  
      // Add staff roles
      const rolesToInsert = values.roles.map((role: any) => ({
        teacher_id: staffData.id,
        role_id: role,
        is_primary: role === values.primary_role_id
      }));
  
      const { error: rolesError } = await supabase
        .from("teacher_roles")
        .insert(rolesToInsert);
  
      if (rolesError) throw rolesError;
  
      // Send welcome email
      await sendEmail(
        values.email,
        `${values.first_name} ${values.last_name}`,
        schoolName,
        password,
        'https://your-school-portal.com',
        'no-reply@school.com',
        'School Admin'
      );
  
      // Refresh data
      await fetchData();
      setIsModalVisible(false);
      form.resetFields();
      message.success('Staff member added successfully');
    } catch (error) {
      console.error('Error adding staff member:', error);
      message.error(error instanceof Error ? error.message : "Failed to add staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStaff = async (values: any) => {
    if (!selectedStaff) return;
    
    setIsSubmitting(true);
    
    try {
      // Update staff record
      const { error } = await supabase
        .from("teachers")
        .update({
          ...values,
          date_of_birth: values.date_of_birth?.format('YYYY-MM-DD')
        })
        .eq("id", selectedStaff.id)
        .select()
        .single();
  
      if (error) throw error;
  
      // Update roles - first delete existing roles
      await supabase
        .from("teacher_roles")
        .delete()
        .eq("teacher_id", selectedStaff.id);
  
      // Then insert new roles
      const rolesToInsert = values.roles.map((role: any) => ({
        teacher_id: selectedStaff.id,
        role_id: role,
        is_primary: role === values.primary_role_id
      }));
  
      await supabase
        .from("teacher_roles")
        .insert(rolesToInsert);
  
      // Refresh data
      await fetchData();
      setIsEditMode(false);
      setSelectedStaff(null);
      message.success('Staff member updated successfully');
    } catch (error) {
      console.error('Error updating staff member:', error);
      message.error(error instanceof Error ? error.message : "Failed to update staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFinancialDetails = async (values: any) => {
    if (!selectedStaff) return;
    
    try {
      // Upsert financial details
      const { error } = await supabase
        .from("staff_financial_details")
        .upsert({
          teacher_id: selectedStaff.id,
          ...values
        });
  
      if (error) throw error;
  
      // Refresh data
      await fetchData();
      setIsFinancialModalVisible(false);
      financialForm.resetFields();
      message.success('Financial details updated successfully');
    } catch (error) {
      console.error('Error updating financial details:', error);
      message.error(error instanceof Error ? error.message : "Failed to update financial details");
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      setLoading(true);
      
      // Get staff member to delete
      const { data: staffData, error: fetchError } = await supabase
        .from("teachers")
        .select("user_id, image_path")
        .eq("id", staffId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete image from storage if exists
      if (staffData.image_path) {
        const { error: deleteImageError } = await supabase.storage
          .from('staff-photos')
          .remove([staffData.image_path]);
        
        if (deleteImageError) console.error('Error deleting image:', deleteImageError);
      }
      
      // Delete staff member
      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", staffId);

      if (error) throw error;

      // Delete auth user if exists
      if (staffData.user_id) {
        await supabase.auth.admin.deleteUser(staffData.user_id);
      }

      setStaff(staff.filter(member => member.id !== staffId));
      if (selectedStaff?.id === staffId) {
        setSelectedStaff(null);
      }
      message.success('Staff member deleted successfully');
    } catch (error) {
      console.error('Error deleting staff member:', error);
      message.error(error instanceof Error ? error.message : "Failed to delete staff member");
    } finally {
      setLoading(false);
    }
  };

  const toggleStaffStatus = async (staffId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("teachers")
        .update({ is_active: isActive })
        .eq("id", staffId);
  
      if (error) throw error;
  
      setStaff(staff.map(member => 
        member.id === staffId ? { ...member, is_active: isActive } : member
      ));
      
      if (selectedStaff?.id === staffId) {
        setSelectedStaff({ ...selectedStaff, is_active: isActive });
      }
      
      message.success(`Staff member ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling staff status:', error);
      message.error(error instanceof Error ? error.message : "Failed to update staff status");
    }
  };

  const columns: ColumnsType<StaffMember> = [
    {
      title: 'Staff Member',
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
            <div className="text-gray-500 text-sm">{record.staff_code}</div>
            <div className="text-xs">
              <Tag color={record.is_teaching_staff ? 'blue' : 'orange'}>
                {record.is_teaching_staff ? 'Teaching' : 'Non-Teaching'}
              </Tag>
            </div>
          </div>
        </div>
      ),
      sorter: (a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      render: (position, record) => (
        <div>
          <div>{position || 'N/A'}</div>
          <div className="text-gray-500 text-sm">{record.department || 'N/A'}</div>
        </div>
      ),
      sorter: (a, b) => (a.position || '').localeCompare(b.position || '')
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: StaffRole[]) => (
        <div className="flex flex-wrap gap-1">
          {roles.map(role => (
            <Tag 
              key={role.id} 
              color={role.is_primary ? 'blue' : 'default'}
            >
              {role.name}
            </Tag>
          ))}
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={(checked) => toggleStaffStatus(record.id, checked)}
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
            onClick={() => setSelectedStaff(record)}
          />
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => {
              setSelectedStaff(record);
              setIsEditMode(true);
              setIsModalVisible(true);
              
              // Set form values
              form.setFieldsValue({
                ...record,
                date_of_birth: record.date_of_birth ? dayjs(record.date_of_birth) : null,
                joinDate: dayjs(record.joinDate),
                roles: record.roles.map(r => r.id),
                primary_role_id: record.roles.find(r => r.is_primary)?.id
              });
              
            }}
          />
          {hasFinancialAccess && (
            <Button 
              type="text" 
              icon={<DollarOutlined />}
              onClick={() => {
                setSelectedStaff(record);
                setIsFinancialModalVisible(true);
                financialForm.setFieldsValue(record.financial_details || {});
              }}
            />
          )}
          <Popconfirm
            title="Are you sure you want to delete this staff member?"
            onConfirm={() => handleDeleteStaff(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="p-4">
      {error && (
        <div className="mb-4">
          <Alert message="Error" description={error} type="error" showIcon />
        </div>
      )}

      <Card 
        title="Staff Management" 
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setIsModalVisible(true);
              setIsEditMode(false);
              form.resetFields();
              form.setFieldsValue({
                is_teaching_staff: true,
                is_active: true,
                joinDate: dayjs(),
                roles: [],
                school_id: schoolId
              });
            }}
          >
            Add Staff
          </Button>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Search staff..."
            prefix={<SearchOutlined />}
            value={filterParams.searchTerm}
            onChange={(e) => setFilterParams({...filterParams, searchTerm: e.target.value})}
            allowClear
            className="flex-1"
          />
          <Select
            placeholder="Filter by department"
            value={filterParams.selectedDepartment}
            onChange={(value) => setFilterParams({...filterParams, selectedDepartment: value})}
            className="w-full md:w-48"
          >
            {departments.map(dept => (
              <Option key={dept} value={dept}>{dept}</Option>
            ))}
          </Select>
          <Select
            placeholder="Filter by role"
            value={filterParams.selectedRole}
            onChange={(value) => setFilterParams({...filterParams, selectedRole: value})}
            className="w-full md:w-48"
          >
            <Option value="All Roles">All Roles</Option>
            {roles.map(role => (
              <Option key={role.id} value={role.name}>{role.name}</Option>
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
          <Select
            placeholder="Staff Type"
            value={filterParams.staffType}
            onChange={(value) => setFilterParams({...filterParams, staffType: value})}
            className="w-full md:w-48"
          >
            <Option value="All">All Types</Option>
            <Option value="Teaching">Teaching Staff</Option>
            <Option value="Non-Teaching">Non-Teaching Staff</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filteredStaff}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: true }}
        />
      </Card>

      {/* Staff Details Modal */}
      <Modal
        title={selectedStaff ? `${selectedStaff.first_name} ${selectedStaff.last_name}` : 'Staff Details'}
        open={!!selectedStaff && !isModalVisible}
        onCancel={() => setSelectedStaff(null)}
        footer={[
          <Button key="back" onClick={() => setSelectedStaff(null)}>
            Close
          </Button>,
          <Button 
            key="edit"
            type="primary" 
            onClick={() => {
              setIsEditMode(true);
              setIsModalVisible(true);
              form.setFieldsValue({
                ...selectedStaff,
                date_of_birth: selectedStaff?.date_of_birth ? dayjs(selectedStaff.date_of_birth) : null,
                joinDate: dayjs(selectedStaff?.joinDate),
                roles: selectedStaff?.roles.map(r => r.id),
                primary_role_id: selectedStaff?.roles.find(r => r.is_primary)?.id
              });
            }}
          >
            Edit
          </Button>,
          hasFinancialAccess && (
            <Button 
              key="financial"
              icon={<DollarOutlined />}
              onClick={() => {
                setIsFinancialModalVisible(true);
                financialForm.setFieldsValue(selectedStaff?.financial_details || {});
              }}
            >
              Financial Details
            </Button>
          )
        ]}
        width={800}
      >
        {selectedStaff && (
          <div className="mt-4">
            <div className="flex items-start gap-6 mb-6">
              <Avatar 
                src={selectedStaff.image_url} 
                icon={<UserOutlined />} 
                size={100}
              />
              <div>
                <h3 className="text-xl font-bold">{selectedStaff.first_name} {selectedStaff.last_name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Tag color={selectedStaff.is_active ? 'green' : 'red'}>
                    {selectedStaff.is_active ? 'Active' : 'Inactive'}
                  </Tag>
                  <Tag color={selectedStaff.is_teaching_staff ? 'blue' : 'orange'}>
                    {selectedStaff.is_teaching_staff ? 'Teaching Staff' : 'Non-Teaching Staff'}
                  </Tag>
                  <Tag color="blue">{selectedStaff.staff_code}</Tag>
                </div>
                <div className="mt-2">
                  {selectedStaff.roles.map(role => (
                    <Tag 
                      key={role.id} 
                      color={role.is_primary ? 'blue' : 'default'}
                      className="mr-2 mb-2"
                    >
                      {role.name}
                    </Tag>
                  ))}
                </div>
              </div>
            </div>

            <Tabs activeKey={activeTab}  onChange={(key) => setActiveTab(key)}>
              <TabPane tab="Personal Info" key="1">
                <Descriptions column={2}>
                  <Descriptions.Item label="Email">
                    <div className="flex items-center gap-2">
                      <MailOutlined />
                      <a href={`mailto:${selectedStaff.email}`}>{selectedStaff.email}</a>
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Phone">
                    <div className="flex items-center gap-2">
                      <PhoneOutlined />
                      <a href={`tel:${selectedStaff.phone}`}>{selectedStaff.phone}</a>
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Date of Birth">
                    <div className="flex items-center gap-2">
                      <CalendarOutlined />
                      {selectedStaff.date_of_birth || 'N/A'}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Gender">{selectedStaff.gender || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Marital Status">{selectedStaff.marital_status || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Address">
                    <div className="flex items-center gap-2">
                      <EnvironmentOutlined />
                      {selectedStaff.address || 'N/A'}
                    </div>
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              <TabPane tab="Employment" key="2">
                <Descriptions column={2}>
                  <Descriptions.Item label="Position">{selectedStaff.position || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Department">{selectedStaff.department || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Employment Type">{selectedStaff.employment_type || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Join Date">
                    <div className="flex items-center gap-2">
                      <CalendarOutlined />
                      {selectedStaff.joinDate}
                    </div>
                  </Descriptions.Item>
                  {selectedStaff.class_name && (
                    <Descriptions.Item label="Class">{selectedStaff.class_name}</Descriptions.Item>
                  )}
                  {selectedStaff.subject_name && (
                    <Descriptions.Item label="Subject">
                      {selectedStaff.subject_name} ({selectedStaff.subject_code})
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </TabPane>

              <TabPane tab="Education & Experience" key="3">
                <Descriptions column={1}>
                  <Descriptions.Item label="Education">
                    <div className="flex items-center gap-2">
                      <BookOutlined />
                      {selectedStaff.education || 'N/A'}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Experience">{selectedStaff.experience || 'N/A'}</Descriptions.Item>
                </Descriptions>
              </TabPane>

              <TabPane tab="Emergency Contact" key="4">
                <Descriptions column={2}>
                  <Descriptions.Item label="Name">{selectedStaff.emergency_contact_name || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Phone">{selectedStaff.emergency_contact_phone || 'N/A'}</Descriptions.Item>
                </Descriptions>
              </TabPane>

              {selectedStaff.notes && (
                <TabPane tab="Notes" key="5">
                  <div className="p-4 bg-gray-50 rounded">
                    {selectedStaff.notes}
                  </div>
                </TabPane>
              )}
            </Tabs>
          </div>
        )}
      </Modal>

      {/* Add/Edit Staff Modal */}
      <Modal
        title={isEditMode ? 'Edit Staff Member' : 'Add New Staff Member'}
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
          onFinish={isEditMode ? handleEditStaff : handleAddStaff}
        >
          <Tabs defaultActiveKey="1">
            <TabPane tab="Basic Information" key="1">
              <div className="flex justify-center mb-6">
                <Form.Item label="Profile Photo" name="image_url">
                  <ImageUploader 
                    onUpload={(url, path) => {
                      form.setFieldsValue({
                        image_url: url,
                        image_path: path
                      });
                    }}
                    currentImage={selectedStaff?.image_url}
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
                  label="Phone" 
                  name="phone" 
                  rules={[{ required: true, message: 'Please input phone number!' }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item 
                  label="Date of Birth" 
                  name="date_of_birth"
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item label="Gender" name="gender">
                  <Select>
                    <Option value="Male">Male</Option>
                    <Option value="Female">Female</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="Marital Status" name="marital_status">
                  <Select>
                    <Option value="Single">Single</Option>
                    <Option value="Married">Married</Option>
                    <Option value="Divorced">Divorced</Option>
                    <Option value="Widowed">Widowed</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="Join Date" name="joinDate" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item label="Staff Type" name="is_teaching_staff" valuePropName="checked">
                  <Switch
                    checkedChildren="Teaching Staff"
                    unCheckedChildren="Non-Teaching Staff"
                  />
                </Form.Item>

                <Form.Item label="Status" name="is_active" valuePropName="checked">
                  <Switch
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                  />
                </Form.Item>

                <Form.Item label="Staff Code" name="staff_code" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>

                <Form.Item label="Position" name="position">
                  <Input />
                </Form.Item>

                <Form.Item label="Department" name="department">
                  <Input />
                </Form.Item>

                <Form.Item label="Employment Type" name="employment_type">
                  <Select>
                    <Option value="Full-time">Full-time</Option>
                    <Option value="Part-time">Part-time</Option>
                    <Option value="Contract">Contract</Option>
                    <Option value="Temporary">Temporary</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="Address" name="address">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </div>
            </TabPane>

            <TabPane tab="Roles & Education" key="2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item 
                  label="Roles" 
                  name="roles" 
                  rules={[{ required: true, message: 'Please select at least one role!' }]}
                >
                  <Select mode="multiple">
                    {roles.map(role => (
                      <Option key={role.id} value={role.id}>{role.name}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item 
                  label="Primary Role" 
                  name="primary_role_id" 
                  rules={[{ required: true, message: 'Please select primary role!' }]}
                >
                  <Select>
                    {roles.map(role => (
                      <Option key={role.id} value={role.id}>{role.name}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item label="Education" name="education">
                  <Input.TextArea rows={3} />
                </Form.Item>

                <Form.Item label="Experience" name="experience">
                  <Input.TextArea rows={3} />
                </Form.Item>
              </div>
            </TabPane>

            <TabPane tab="Additional Information" key="3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item label="Emergency Contact Name" name="emergency_contact_name">
                  <Input />
                </Form.Item>

                <Form.Item label="Emergency Contact Phone" name="emergency_contact_phone">
                  <Input />
                </Form.Item>

                <Form.Item label="Notes" name="notes" className="md:col-span-2">
                  <Input.TextArea rows={4} />
                </Form.Item>
              </div>
            </TabPane>

            {isEditMode && selectedStaff?.is_teaching_staff && (
              <TabPane tab="Teaching Details" key="4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item label="Class" name="class_id">
                    <Select>
                      <Option value="">Select Class</Option>
                      {classes.map(cls => (
                        <Option key={cls.id} value={cls.id}>{cls.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item label="Subject" name="subject_id">
                    <Select>
                      <Option value="">Select Subject</Option>
                      {subjects.map(subj => (
                        <Option key={subj.id} value={subj.id}>{subj.name} ({subj.code})</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
              </TabPane>
            )}
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
              {isEditMode ? 'Update Staff' : 'Add Staff'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Financial Details Modal */}
      <Modal
        title={`Financial Details - ${selectedStaff?.first_name} ${selectedStaff?.last_name}`}
        open={isFinancialModalVisible}
        onCancel={() => setIsFinancialModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={financialForm}
          layout="vertical"
          onFinish={handleUpdateFinancialDetails}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item label="Salary" name="salary">
              <InputNumber 
                style={{ width: '100%' }} 
                min={0} 
                prefix={<DollarOutlined />}
              />
            </Form.Item>

            <Form.Item label="Bank Name" name="bank_name">
              <Input prefix={<BankOutlined />} />
            </Form.Item>

            <Form.Item label="Bank Account Number" name="bank_account_number">
              <Input />
            </Form.Item>

            <Form.Item label="Tax ID" name="tax_id">
              <Input prefix={<IdcardOutlined />} />
            </Form.Item>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              onClick={() => setIsFinancialModalVisible(false)}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
            >
              Update Financial Details
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default StaffManagement;