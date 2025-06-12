import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input,
  Switch, 
  Select, 
  Tag, 
  Tabs, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  message, 
  Typography, 
  DatePicker,
  Space,
  Popconfirm,
  Divider,
  Spin
} from 'antd';
import { 
  DollarOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  PlusOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { supabase } from '../../supabase';

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface FeeType {
    id: string;
    name: string;
    amount: number;
    due_date: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    class_specific_pricing?: {
      class_id: string;
      amount: number;
    }[];
    applicable_classes?: string[]; // Changed to string array
    is_class_specific: boolean;
    school_id: string;
}

interface Collector {
  id: number;
  name: string;
  role: string;
  email?: string;
}

interface Semester {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface FeeCollectionStat {
  collector_id: number;
  collector_name: string;
  total_collected: number;
  fee_types: {
    [key: string]: number;
  };
}

interface Class {
    id: string;
    name: string;
    grade: string;
}

type SupabaseError = {
    message: string;
    code: string;
    details?: string;
  };
  
  function isSupabaseError(error: unknown): error is SupabaseError {
    return typeof error === 'object' && error !== null && 'message' in error;
  }

const FeeManagementController: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  // State management
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemester, setCurrentSemester] = useState<Semester | null>(null);
  const [isFeeModalVisible, setIsFeeModalVisible] = useState(false);
  const [isSemesterModalVisible, setIsSemesterModalVisible] = useState(false);
  const [currentFee, setCurrentFee] = useState<FeeType | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [classPrices, setClassPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [collectionStats, setCollectionStats] = useState<FeeCollectionStat[]>([]);
  const [statsRange, setStatsRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ]);

  // Form states
  const [feeForm] = Form.useForm();
  const [semesterForm] = Form.useForm();

  // Add to initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchFeeTypes(),
          fetchCollectors(),
          fetchSemesters(),
          fetchClasses() // Add this
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

  // Set current semester when semesters load
  useEffect(() => {
    if (semesters.length > 0) {
      const current = semesters.find(s => s.is_current) || semesters[0];
      setCurrentSemester(current);
    }
  }, [semesters]);


  useEffect(() => {
    if (currentFee) {
      const classes = currentFee.applicable_classes || [];
      const prices = (currentFee.class_specific_pricing || []).reduce((acc, item) => {
        acc[Number(item.class_id)] = item.amount;
        return acc;
      }, {} as Record<number, number>);
      setSelectedClasses(classes);
      setClassPrices(prices);
    }
  }, [currentFee]);

  // Fetch fee types
  const fetchFeeTypes = async () => {
    try {
      // First fetch the fee types
      const { data: fees, error: feesError } = await supabase
        .from('fee_types')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
  
      if (feesError) throw feesError;
  
      // Then fetch the class pricing for each fee
      const feesWithPricing = await Promise.all(
        (fees || []).map(async (fee) => {
          if (!fee.is_class_specific) return fee;
          
          const { data: pricing, error: pricingError } = await supabase
            .from('fee_class_pricing')
            .select('class_id, amount')
            .eq('fee_type_id', fee.id);
  
          if (pricingError) {
            console.error('Error fetching pricing for fee', fee.id, pricingError);
            return fee;
          }
  
          return {
            ...fee,
            class_specific_pricing: pricing || []
          };
        })
    );
  
      setFeeTypes(feesWithPricing);
    } catch (error) {
      console.error('Error fetching fee types:', error);
      message.error('Failed to fetch fee types');
    }
  };

  // Fetch classes
  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', schoolId);
      
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      message.error('Failed to fetch classes');
    }
  };

  // Fetch collectors (teachers and admins)
  const fetchCollectors = async () => {
    try {
      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('id, first_name, last_name, email')
        .eq('school_id', schoolId);

      if (teachersError) throw teachersError;

      const { data: admins, error: adminsError } = await supabase
        .from('administrators')
        .select('id, first_name, last_name, email')
        .eq('school_id', schoolId);

      if (adminsError) throw adminsError;

      const collectors = [
        ...(teachers || []).map(t => ({
          id: t.id,
          name: `${t.first_name} ${t.last_name}`,
          email: t.email,
          role: 'Teacher'
        })),
        ...(admins || []).map(a => ({
          id: a.id,
          name: `${a.first_name} ${a.last_name}`,
          email: a.email,
          role: 'Admin'
        }))
      ];

      setCollectors(collectors);
    } catch (error) {
      console.error('Error fetching collectors:', error);
      message.error('Failed to fetch collectors');
    }
  };

  // Fetch semesters
  const fetchSemesters = async () => {
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setSemesters(data || []);
    } catch (error) {
      console.error('Error fetching semesters:', error);
      message.error('Failed to fetch semesters');
    }
  };

  // Fetch collection statistics
  const fetchCollectionStats = async (startDate: string, endDate: string) => {
    try {
      // First get all fee collections in date range
      const { data: collections, error: collectionsError } = await supabase
        .from('student_fees')
        .select('id, paid, collector_id, collector_type, fee_type_id, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('school_id', schoolId);

      if (collectionsError) throw collectionsError;

      // Then get fee type names
      const { data: feeTypesData, error: feeTypesError } = await supabase
        .from('fee_types')
        .select('id, name');

      if (feeTypesError) throw feeTypesError;

      // Group by collector and fee type
      const statsMap = new Map<number, FeeCollectionStat>();

      collections?.forEach(collection => {
        const feeType = feeTypesData?.find(ft => ft.id === collection.fee_type_id);
        const collector = collectors.find(c => 
          c.id === collection.collector_id && 
          c.role.toLowerCase() === collection.collector_type?.toLowerCase()
        );

        if (!collector) return;

        if (!statsMap.has(collector.id)) {
          statsMap.set(collector.id, {
            collector_id: collector.id,
            collector_name: collector.name,
            total_collected: 0,
            fee_types: {}
          });
        }

        const stat = statsMap.get(collector.id)!;
        stat.total_collected += collection.paid || 0;

        if (feeType) {
          stat.fee_types[feeType.name] = (stat.fee_types[feeType.name] || 0) + (collection.paid || 0);
        }
      });

      setCollectionStats(Array.from(statsMap.values()));
    } catch (error) {
      console.error('Error fetching collection stats:', error);
      message.error('Failed to fetch collection statistics');
    }
  };

  // Update the fee submission handler
  const handleFeeSubmit = async () => {
    try {
      const values = await feeForm.validateFields();
      values.due_date = values.due_date.format('YYYY-MM-DD');
  
      const feeData = {
        name: values.name,
        description: values.description || null,
        due_date: values.due_date,
        is_active: values.is_active,
        is_class_specific: values.is_class_specific,
        school_id: schoolId,
        amount: values.amount || 0,
        applicable_classes: values.is_class_specific ? selectedClasses : null
      };
  
      let feeId: string;
  
      if (currentFee) {
        const { data, error } = await supabase
          .from('fee_types')
          .update(feeData)
          .eq('id', currentFee.id)
          .select();
  
        if (error) throw error;
        feeId = currentFee.id;
        message.success('Fee updated successfully');
        
        setFeeTypes(feeTypes.map(f => f.id === currentFee.id ? data![0] : f));
      } else {
        const { data, error } = await supabase
          .from('fee_types')
          .insert([feeData])
          .select();
  
        if (error) throw error;
        feeId = data![0].id;
        message.success('Fee created successfully');
        
        setFeeTypes([data![0], ...feeTypes]);
      }
  
      if (values.is_class_specific && selectedClasses.length > 0) {
        try {
          await updateClassPricing(feeId, selectedClasses, classPrices);
          message.success('Class pricing saved successfully');
          await fetchFeeTypes();
        } catch (pricingError) {
          console.error('Error saving class pricing:', pricingError);
          message.error('Fee saved but failed to save class pricing');
        }
      }
  
      setIsFeeModalVisible(false);
      feeForm.resetFields();
      setSelectedClasses([]);
      setClassPrices({});
    } catch (error) {
      if (isSupabaseError(error)) {
        console.error('Supabase Error:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        message.error(`Database error: ${error.message}`);
      } else if (error instanceof Error) {
        console.error('Unexpected Error:', error);
        message.error(`Error: ${error.message}`);
      } else {
        console.error('Unknown Error:', error);
        message.error('An unknown error occurred');
      }
    }
  };
  
  const updateClassPricing = async (feeTypeId: string, classIds: string[], prices: Record<string, number>) => {
    // Delete existing pricing
    const { error: deleteError } = await supabase
      .from('fee_class_pricing')
      .delete()
      .eq('fee_type_id', feeTypeId);
  
    if (deleteError) throw deleteError;
  
    // Prepare pricing data
    const pricingData = classIds.map(classId => ({
      fee_type_id: feeTypeId,
      class_id: classId,
      amount: prices[classId] || feeForm.getFieldValue('amount') || 0
    }));
  
    // Insert new pricing
    const { error: insertError } = await supabase
      .from('fee_class_pricing')
      .insert(pricingData);
  
    if (insertError) throw insertError;
  };
  
  const showEditFeeModal = (fee: FeeType) => {
    setCurrentFee(fee);
    const initialValues = {
      ...fee,
      due_date: dayjs(fee.due_date),
      is_class_specific: fee.is_class_specific,
      amount: fee.amount
    };
    feeForm.setFieldsValue(initialValues);
  
    const classes = fee.applicable_classes || [];
    const prices = (fee.class_specific_pricing || []).reduce((acc, item) => {
      acc[item.class_id] = item.amount;
      return acc;
    }, {} as Record<string, number>);
    
    setSelectedClasses(classes);
    setClassPrices(prices);
    setIsFeeModalVisible(true);
  };

  const handleSemesterSubmit = async () => {
    try {
      const values = await semesterForm.validateFields();
      values.start_date = values.date_range[0].format('YYYY-MM-DD');
      values.end_date = values.date_range[1].format('YYYY-MM-DD');
      delete values.date_range;

      if (values.is_current) {
        // First unset current flag from all other semesters
        await supabase
          .from('semesters')
          .update({ is_current: false })
          .eq('school_id', schoolId);
      }

      const { data, error } = await supabase
        .from('semesters')
        .insert([{ ...values, school_id: schoolId }])
        .select();

      if (error) throw error;
      message.success('Semester created successfully');
      setSemesters([data[0], ...semesters]);
      setIsSemesterModalVisible(false);
      semesterForm.resetFields();
    } catch (error) {
      console.error('Error creating semester:', error);
      message.error('Failed to create semester');
    }
  };

  // Set current semester
  const setAsCurrentSemester = async (semesterId: number) => {
    try {
      // First unset current flag from all semesters
      await supabase
        .from('semesters')
        .update({ is_current: false })
        .eq('school_id', schoolId);

      // Then set the selected semester as current
      const { data, error } = await supabase
        .from('semesters')
        .update({ is_current: true })
        .eq('id', semesterId)
        .select();

      if (error) throw error;
      message.success('Current semester updated');
      setSemesters(semesters.map(s => 
        s.id === semesterId ? { ...s, is_current: true } : { ...s, is_current: false }
      ));
      setCurrentSemester(data[0]);
    } catch (error) {
      console.error('Error updating current semester:', error);
      message.error('Failed to update current semester');
    }
  };

  // Toggle fee active status
  const toggleFeeStatus = async (feeId: string, currentStatus: boolean) => {
    try {
      const { data, error } = await supabase
        .from('fee_types')
        .update({ is_active: !currentStatus })
        .eq('id', feeId)
        .select();
  
      if (error) throw error;
      message.success(`Fee ${!currentStatus ? 'activated' : 'deactivated'}`);
      setFeeTypes(feeTypes.map(f => f.id === feeId ? data![0] : f));
    } catch (error) {
      if (isSupabaseError(error)) {
        message.error(`Failed to update status: ${error.message}`);
      }
    }
  };
  
  const deleteFee = async (feeId: string) => {
    try {
      const { count, error: countError } = await supabase
        .from('student_fees')
        .select('*', { count: 'exact', head: true })
        .eq('fee_type_id', feeId);
  
      if (countError) throw countError;
  
      if (count && count > 0) {
        message.error('Cannot delete fee with existing payments');
        return;
      }
  
      const { error } = await supabase
        .from('fee_types')
        .delete()
        .eq('id', feeId);
  
      if (error) throw error;
      message.success('Fee deleted successfully');
      setFeeTypes(feeTypes.filter(f => f.id !== feeId));
    } catch (error) {
      if (isSupabaseError(error)) {
        message.error(`Failed to delete: ${error.message}`);
      }
    }
  };

  const showNewFeeModal = () => {
    setCurrentFee(null);
    feeForm.setFieldsValue({
      name: '',
      description: '',
      due_date: dayjs().add(1, 'month'),
      is_active: true,
      is_class_specific: false,
      amount: 0
    });
    setSelectedClasses([]);
    setClassPrices({});
    setIsFeeModalVisible(true);
  };

  // Update stats date range
  const handleStatsRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setStatsRange([dates[0], dates[1]]);
      fetchCollectionStats(dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD'));
    }
  };


  // Columns for fee types table
  const feeColumns = [
    {
      title: 'Fee Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: FeeType) => (
        <div>
          <Text strong>{text}</Text>
          {record.description && (
            <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
              {record.description}
            </Text>
          )}
        </div>
      )
    },
    {
        title: 'Amount',
        key: 'amount',
        render: (record: FeeType) => (
          record.is_class_specific ? (
            <Text>Varies by class</Text>
          ) : (
            <Text>${record.amount.toFixed(2)}</Text>
          )
        )
      },
    {
        title: 'Pricing Model',
        key: 'pricing',
        render: (record: FeeType) => (
          record.is_class_specific ? (
            <div>
              <Tag color="blue">Class-Specific</Tag>
              <Text type="secondary">
                ({record.applicable_classes?.length || 0} classes)
              </Text>
            </div>
          ) : (
            <Tag>Standard</Tag>
          )
        )
      },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY')
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: FeeType) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showEditFeeModal(record)}
          />
        <Switch
        checked={record.is_active}
        onChange={() => toggleFeeStatus(record.id, record.is_active)}
        />
          <Popconfirm
            title="Are you sure you want to delete this fee?"
            onConfirm={() => deleteFee(record.id)}
            okText="Yes"
            cancelText="No"
            disabled={record.is_active}
          >
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              danger 
              disabled={record.is_active}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Columns for collectors stats table
  const collectorColumns = [
    {
      title: 'Collector',
      dataIndex: 'collector_name',
      key: 'collector_name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Total Collected',
      dataIndex: 'total_collected',
      key: 'total_collected',
      render: (amount: number) => `$${amount.toFixed(2)}`,
      sorter: (a: FeeCollectionStat, b: FeeCollectionStat) => a.total_collected - b.total_collected
    },
    {
      title: 'Fee Breakdown',
      key: 'breakdown',
      render: (_: any, record: FeeCollectionStat) => (
        <div>
          {Object.entries(record.fee_types).map(([feeType, amount]) => (
            <div key={feeType} style={{ marginBottom: 4 }}>
              <Text type="secondary">{feeType}: </Text>
              <Text strong>${amount.toFixed(2)}</Text>
            </div>
          ))}
        </div>
      )
    }
  ];

  // Columns for semesters table
  const semesterColumns = [
    {
      title: 'Semester Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Semester) => (
        <div>
          <Text strong>{text}</Text>
          {record.is_current && (
            <Tag color="green" style={{ marginLeft: 8 }}>Current</Tag>
          )}
        </div>
      )
    },
    {
      title: 'Date Range',
      key: 'date_range',
      render: (_: any, record: Semester) => (
        <Text>
          {dayjs(record.start_date).format('MMM DD, YYYY')} - {dayjs(record.end_date).format('MMM DD, YYYY')}
        </Text>
      )
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_: any, record: Semester) => (
        <Text>
          {dayjs(record.end_date).diff(dayjs(record.start_date), 'days')} days
        </Text>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Semester) => (
        <Button 
          type="primary" 
          disabled={record.is_current}
          onClick={() => setAsCurrentSemester(record.id)}
        >
          Set as Current
        </Button>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Title level={3} className="mb-6">
        <DollarOutlined /> Fee Management
      </Title>

      <Tabs defaultActiveKey="fees">
        <TabPane tab="Fee Types" key="fees">
          <Card
            title="Manage Fee Types"
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={showNewFeeModal}
              >
                Add Fee Type
              </Button>
            }
            className="mb-4"
          >
            <Table 
              dataSource={feeTypes} 
              columns={feeColumns} 
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="Semesters" key="semesters">
          <Card
            title="Manage Academic Semesters"
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setIsSemesterModalVisible(true)}
              >
                Add Semester
              </Button>
            }
            className="mb-4"
          >
            <Table 
              dataSource={semesters} 
              columns={semesterColumns} 
              rowKey="id"
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="Collection Stats" key="stats">
          <Card
            title="Fee Collection Statistics"
            className="mb-4"
            extra={
              <RangePicker
                value={statsRange}
                onChange={handleStatsRangeChange}
                disabledDate={current => current && current > dayjs().endOf('day')}
              />
            }
          >
            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Collected"
                    value={collectionStats.reduce((sum, stat) => sum + stat.total_collected, 0)}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Active Collectors"
                    value={collectionStats.length}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Date Range"
                    value={`${statsRange[0].format('MMM DD')} - ${statsRange[1].format('MMM DD')}`}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Current Semester"
                    value={currentSemester?.name || 'None'}
                  />
                </Card>
              </Col>
            </Row>

            <Table 
              dataSource={collectionStats} 
              columns={collectorColumns} 
              rowKey="collector_id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Fee Type Modal */}
      <Modal
        title={currentFee ? 'Edit Fee Type' : 'Create New Fee Type'}
        visible={isFeeModalVisible}
        onCancel={() => setIsFeeModalVisible(false)}
        onOk={handleFeeSubmit}
        width={600}
      >
        <Form form={feeForm} layout="vertical">
          <Form.Item
            name="name"
            label="Fee Name"
            rules={[{ required: true, message: 'Please enter fee name' }]}
          >
            <Input placeholder="e.g. Tuition Fee, Activity Fee" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <Input.TextArea rows={2} placeholder="Brief description of the fee" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <Input type="number" prefix="$" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="due_date"
                label="Due Date"
                rules={[{ required: true, message: 'Please select due date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_active"
            label="Status"
            valuePropName="checked"
            initialValue={true}
          >
            <Select>
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="is_class_specific"
            label="Class-Specific Pricing?"
            valuePropName="checked"
            initialValue={false}
        >
            <Switch />
        </Form.Item>

        <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
            prevValues.is_class_specific !== currentValues.is_class_specific
            }
        >
            {({ getFieldValue }) => 
            getFieldValue('is_class_specific') ? (
                <>
                <Form.Item
                    name="applicable_classes"
                    label="Applicable Classes"
                    rules={[{ required: true, message: 'Select at least one class' }]}
                >
                    <Select
                    mode="multiple"
                    placeholder="Select classes this fee applies to"
                    onChange={(values: string[]) => setSelectedClasses(values)}
                    >
                    {classes.map(cls => (
                        <Option key={cls.id} value={cls.id}>
                        {cls.name} - {cls.grade}
                        </Option>
                    ))}
                    </Select>
                </Form.Item>

                <Divider orientation="left">Class-Specific Pricing</Divider>
                
                {selectedClasses.map(classId => {
                    const cls = classes.find(c => c.id === classId);
                    return (
                        <Form.Item
                        key={classId}
                        label={`Price for ${cls?.name} (${cls?.grade})`}
                        >
                        <Input
                            type="number"
                            prefix="$"
                            value={classPrices[classId] ?? feeForm.getFieldValue('amount')}
                            onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setClassPrices(prev => ({
                                ...prev,
                                [classId]: value
                            }));
                            }}
                        />
                        </Form.Item>
                    );
                    })}
                </>
            ) : (
                <Form.Item
                name="amount"
                label="Standard Amount"
                rules={[
                    { 
                    required: true, 
                    message: 'Please enter amount' 
                    },
                    {
                    validator: (_, value) => {
                        if (value === null || value === undefined) {
                        return Promise.reject('Amount cannot be empty');
                        }
                        return Promise.resolve();
                    }
                    }
                ]}
                >
                <Input type="number" prefix="$" min={0} step="0.01" />
                </Form.Item>
            )
            }
        </Form.Item>  
        </Form>
      </Modal>

      {/* Semester Modal */}
      <Modal
        title="Create New Semester"
        visible={isSemesterModalVisible}
        onCancel={() => setIsSemesterModalVisible(false)}
        onOk={handleSemesterSubmit}
        width={600}
      >
        <Form form={semesterForm} layout="vertical">
          <Form.Item
            name="name"
            label="Semester Name"
            rules={[{ required: true, message: 'Please enter semester name' }]}
          >
            <Input placeholder="e.g. Fall 2023, Spring 2024" />
          </Form.Item>

          <Form.Item
            name="date_range"
            label="Date Range"
            rules={[{ required: true, message: 'Please select date range' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="is_current"
            label="Set as Current Semester?"
            valuePropName="checked"
          >
            <Select>
              <Option value={true}>Yes</Option>
              <Option value={false}>No</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FeeManagementController;