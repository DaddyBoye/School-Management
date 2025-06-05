import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Modal, Form, Select, Input, TimePicker, 
  message, Row, Col, Typography, Spin, Tabs, Tag, Space, 
  Popconfirm, DatePicker, Switch, Calendar, 
  Empty, Radio, Popover, Grid, Alert,
  Breakpoint
} from 'antd';
import { 
  PlusOutlined, DeleteOutlined, EditOutlined, 
  ScheduleOutlined, TeamOutlined, BookOutlined, 
  UserOutlined, HomeOutlined,
  SyncOutlined, CalendarOutlined, UnorderedListOutlined,
  CoffeeOutlined, WarningOutlined
} from '@ant-design/icons';
import { supabase } from '../../supabase';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import TextArea from 'antd/es/input/TextArea';
import { ColumnType } from 'antd/es/table';
dayjs.extend(weekday);
dayjs.extend(customParseFormat);

const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { useBreakpoint } = Grid;

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

interface Room {
  description: any;
  id: number;
  name: string;
  capacity?: number;
}

interface Timeslot {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  day_of_week?: number;
  is_break: boolean;
}

interface TimetableEntry {
  id: number;
  class_id: string;
  subject_id: number;
  teacher_id: string;
  timeslot_id: number;
  room_id?: number;
  day_of_week: number;
  recurring: boolean;
  start_date?: string;
  end_date?: string;
  classes?: Class;
  subjects?: Subject;
  teachers?: Teacher;
  timeslots?: Timeslot;
  rooms?: Room;
}

// DayScheduleModal.tsx
const DayScheduleModal: React.FC<{
  visible: boolean;
  onCancel: () => void;
  date: dayjs.Dayjs;
  entriesByTimeslot: Record<number, TimetableEntry[]>;
  sortedTimeslotIds: number[];
  timeslots: Timeslot[];
  classes: Class[];
  subjects: Subject[];
  teachers: Teacher[];
}> = ({ visible, onCancel, date, entriesByTimeslot, sortedTimeslotIds, timeslots, classes, subjects, teachers }) => {
  const [filterSubject, setFilterSubject] = useState<number | null>(null);
  const [filterTeacher, setFilterTeacher] = useState<string | null>(null);
  const [filterClass, setFilterClass] = useState<string | null>(null);

  const filteredEntriesByTimeslot = Object.keys(entriesByTimeslot).reduce((acc, timeslotId) => {
    const entries = entriesByTimeslot[Number(timeslotId)].filter(entry => {
      const matchesSubject = !filterSubject || entry.subject_id === filterSubject;
      const matchesTeacher = !filterTeacher || entry.teacher_id === filterTeacher;
      const matchesClass = !filterClass || entry.class_id === filterClass;
      return matchesSubject && matchesTeacher && matchesClass;
    });
    
    if (entries.length > 0) {
      acc[Number(timeslotId)] = entries;
    }
    return acc;
  }, {} as Record<number, TimetableEntry[]>);

  const filterNode = (
    <div style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={8}>
          <Select
            placeholder="Filter by subject"
            allowClear
            value={filterSubject}
            onChange={setFilterSubject}
            style={{ width: '100%' }}
            options={subjects.map(subject => ({
              value: subject.id,
              label: `${subject.name} (${subject.code})`
            }))}
          />
        </Col>
        <Col span={8}>
          <Select
            placeholder="Filter by teacher"
            allowClear
            value={filterTeacher}
            onChange={setFilterTeacher}
            style={{ width: '100%' }}
            options={teachers.map(teacher => ({
              value: teacher.user_id,
              label: `${teacher.first_name} ${teacher.last_name}`
            }))}
          />
        </Col>
        <Col span={8}>
          <Select
            placeholder="Filter by class"
            allowClear
            value={filterClass}
            onChange={setFilterClass}
            style={{ width: '100%' }}
            options={classes.map(cls => ({
              value: cls.id,
              label: `${cls.name} (Grade ${cls.grade})`
            }))}
          />
        </Col>
      </Row>
    </div>
  );
  
    return (
      <Modal
        title={`Schedule for ${date.format('dddd, MMMM D, YYYY')}`}
        visible={visible}
        onCancel={onCancel}
        width={800}
        bodyStyle={{ padding: '16px' }}
        okText="Close"
      >
        <div style={{ maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
          {filterNode}
          <div style={{ overflow: 'auto' }}>
            {Object.keys(filteredEntriesByTimeslot).length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  Object.keys(entriesByTimeslot).length === 0 ? 
                    "No classes scheduled for this day" : 
                    "No entries match your filters"
                }
              />
            ) : (
              sortedTimeslotIds
                .filter(timeslotId => filteredEntriesByTimeslot[timeslotId])
                .map(timeslotId => {
                  const timeslot = timeslots.find(t => t.id === timeslotId);
                  const entries = filteredEntriesByTimeslot[timeslotId];
                  
                  return (
                    <div key={timeslotId} style={{ marginBottom: 24 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        marginBottom: 8,
                        paddingBottom: 4,
                        borderBottom: '1px solid #f0f0f0'
                      }}>
                        <Text strong style={{ fontSize: 16 }}>
                          {timeslot?.name || 'Period'}
                        </Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          {timeslot?.start_time ? dayjs(timeslot.start_time, 'HH:mm:ss').format('h:mm A') : ''} -{' '}
                          {timeslot?.end_time ? dayjs(timeslot.end_time, 'HH:mm:ss').format('h:mm A') : ''}
                        </Text>
                        {timeslot?.is_break && (
                          <Tag color="red" style={{ marginLeft: 8 }}>
                            <CoffeeOutlined /> Break
                          </Tag>
                        )}
                      </div>
                      
                      {timeslot?.is_break ? (
                        <Card>
                          <Space direction="vertical" align="center" style={{ width: '100%' }}>
                            <CoffeeOutlined style={{ fontSize: 24, color: '#f5222d' }} />
                            <Text strong>Break Time</Text>
                          </Space>
                        </Card>
                      ) : (
                        entries.map(entry => (
                          <Card 
                            key={entry.id} 
                            style={{ 
                              marginBottom: 16,
                              borderLeft: `4px solid #1890ff`
                            }}
                            size="small"
                          >
                            <Space direction="vertical" size={4}>
                              <Space>
                                <TeamOutlined style={{ color: '#888' }} />
                                <Text strong>{entry.classes?.name} (Grade {entry.classes?.grade})</Text>
                              </Space>
                              <Space>
                                <BookOutlined style={{ color: '#888' }} />
                                <Text>{entry.subjects?.name} ({entry.subjects?.code})</Text>
                              </Space>
                              <Space>
                                <UserOutlined style={{ color: '#888' }} />
                                <Text>{entry.teachers?.first_name} {entry.teachers?.last_name}</Text>
                              </Space>
                              {entry.rooms?.name && (
                                <Space>
                                  <HomeOutlined style={{ color: '#888' }} />
                                  <Text>{entry.rooms.name}</Text>
                                </Space>
                              )}
                            </Space>
                          </Card>
                        ))
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </Modal>
    );
  };
  
  // TimeslotDetailModal.tsx
  const TimeslotDetailModal: React.FC<{
    visible: boolean;
    onCancel: () => void;
    timeslot: Timeslot;
    dayIndex: number;
    entries: TimetableEntry[];
    dayNames: string[];
    classes: Class[];
    subjects: Subject[];
    teachers: Teacher[];
  }> = ({ visible, onCancel, timeslot, dayIndex, entries, dayNames, classes, subjects, teachers }) => {
    const [filterSubject, setFilterSubject] = useState<number | null>(null);
    const [filterTeacher, setFilterTeacher] = useState<string | null>(null);
    const [filterClass, setFilterClass] = useState<string | null>(null);
  
    const filteredEntries = entries.filter(entry => {
      const matchesSubject = !filterSubject || entry.subject_id === filterSubject;
      const matchesTeacher = !filterTeacher || entry.teacher_id === filterTeacher;
      const matchesClass = !filterClass || entry.class_id === filterClass;
      return matchesSubject && matchesTeacher && matchesClass;
    });
  
    const filterNode = (
      <div style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Select
              placeholder="Filter by subject"
              allowClear
              value={filterSubject}
              onChange={setFilterSubject}
              style={{ width: '100%' }}
              options={subjects.map(subject => ({
                value: subject.id,
                label: `${subject.name} (${subject.code})`
              }))}
            />
          </Col>
          <Col span={8}>
            <Select
              placeholder="Filter by teacher"
              allowClear
              value={filterTeacher}
              onChange={setFilterTeacher}
              style={{ width: '100%' }}
              options={teachers.map(teacher => ({
                value: teacher.user_id,
                label: `${teacher.first_name} ${teacher.last_name}`
              }))}
            />
          </Col>
          <Col span={8}>
            <Select
              placeholder="Filter by class"
              allowClear
              value={filterClass}
              onChange={setFilterClass}
              style={{ width: '100%' }}
              options={classes.map(cls => ({
                value: cls.id,
                label: `${cls.name} (Grade ${cls.grade})`
              }))}
            />
          </Col>
        </Row>
      </div>
    );
  
    return (
      <Modal
        title={`${timeslot.name} on ${dayNames[dayIndex]}`}
        visible={visible}
        onCancel={onCancel}
        width={800}
        bodyStyle={{ padding: '16px' }}
        okText="Close"
      >
        <div style={{ maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            marginBottom: 16,
            paddingBottom: 8,
            borderBottom: '1px solid #f0f0f0'
          }}>
            <Text strong style={{ fontSize: 16 }}>
              {timeslot.name}
            </Text>
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {dayjs(timeslot.start_time, 'HH:mm:ss').format('h:mm A')} -{' '}
              {dayjs(timeslot.end_time, 'HH:mm:ss').format('h:mm A')}
            </Text>
            {timeslot.is_break && (
              <Tag color="red" style={{ marginLeft: 8 }}>
                <CoffeeOutlined /> Break
              </Tag>
            )}
          </div>
  
          {filterNode}
  
          {timeslot.is_break ? (
            <Card>
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <CoffeeOutlined style={{ fontSize: 24, color: '#f5222d' }} />
                <Text strong>Break Time</Text>
                <Text type="secondary">No classes scheduled during this period</Text>
              </Space>
            </Card>
          ) : (
            <>
              {filteredEntries.length === 0 ? (
                <Empty
                  description={
                    entries.length === 0 ? 
                      "No classes scheduled for this timeslot" : 
                      "No entries match your filters"
                  }
                />
              ) : (
                <div style={{ overflow: 'auto' }}>
                  {filteredEntries.map(entry => (
                    <Card 
                      key={entry.id}
                      style={{ 
                        marginBottom: 16,
                        borderLeft: '4px solid #1890ff'
                      }}
                      size="small"
                    >
                      <Space direction="vertical" size={4}>
                        <Space>
                          <TeamOutlined style={{ color: '#888' }} />
                          <Text strong>{entry.classes?.name} (Grade {entry.classes?.grade})</Text>
                        </Space>
                        <Space>
                          <BookOutlined style={{ color: '#888' }} />
                          <Text>{entry.subjects?.name} ({entry.subjects?.code})</Text>
                        </Space>
                        <Space>
                          <UserOutlined style={{ color: '#888' }} />
                          <Text>{entry.teachers?.first_name} {entry.teachers?.last_name}</Text>
                        </Space>
                        {entry.rooms?.name && (
                          <Space>
                            <HomeOutlined style={{ color: '#888' }} />
                            <Text>{entry.rooms.name}</Text>
                          </Space>
                        )}
                      </Space>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    );
  };

const TimetableManager: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [form] = Form.useForm();
  const [timeslotForm] = Form.useForm();
  const [roomForm] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isTimeslotModalVisible, setIsTimeslotModalVisible] = useState(false);
  const [isRoomModalVisible, setIsRoomModalVisible] = useState(false);
  const [hoveredEntry, setHoveredEntry] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [editingTimeslot, setEditingTimeslot] = useState<Timeslot | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const screens = useBreakpoint();
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [dayModalData, setDayModalData] = useState<{
    date: dayjs.Dayjs;
    entriesByTimeslot: Record<number, TimetableEntry[]>;
    sortedTimeslotIds: number[];
  } | null>(null);

  const [timeslotModalVisible, setTimeslotModalVisible] = useState(false);
  const [timeslotModalData] = useState<{
    timeslot: Timeslot;
    dayIndex: number;
    entries: TimetableEntry[];
  } | null>(null);

  // Day names for display
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Fetch all necessary data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchClasses(),
          fetchSubjects(),
          fetchTeachers(),
          fetchRooms(),
          fetchTimeslots(),
          fetchTimetableEntries()
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

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    if (error) throw error;
    setRooms(data || []);
  };

  const fetchTimeslots = async () => {
    const { data, error } = await supabase
      .from('timeslots')
      .select('*')
      .eq('school_id', schoolId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    setTimeslots(data || []);
  };

  const fetchTimetableEntries = async () => {
    const { data, error } = await supabase
      .from('timetable_entries')
      .select(`
        *,
        classes:class_id(name, grade),
        subjects:subject_id(name, code),
        teachers:teacher_id(first_name, last_name),
        timeslots:timeslot_id(name, start_time, end_time),
        rooms:room_id(name)
      `)
      .eq('school_id', schoolId);

    if (error) throw error;
    setTimetableEntries(data || []);
  };

  // Handle form submission for timetable entry
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // Check if the selected timeslot is a break
      const selectedTimeslot = timeslots.find(t => t.id === values.timeslot_id);
      if (selectedTimeslot?.is_break) {
        message.error('Cannot assign classes to break timeslots');
        return;
      }

      const entryData = {
        class_id: values.class_id,
        subject_id: values.subject_id,
        teacher_id: values.teacher_id,
        timeslot_id: values.timeslot_id,
        room_id: values.room_id,
        day_of_week: values.day_of_week,
        recurring: values.recurring,
        school_id: schoolId,
        ...(values.recurring ? {} : {
          start_date: values.date_range[0].format('YYYY-MM-DD'),
          end_date: values.date_range[1].format('YYYY-MM-DD')
        })
      };

      if (editingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('timetable_entries')
          .update(entryData)
          .eq('id', editingEntry.id);

        if (error) throw error;
        message.success('Timetable entry updated successfully');
      } else {
        // Create new entry
        const { error } = await supabase
          .from('timetable_entries')
          .insert([entryData]);

        if (error) throw error;
        message.success('Timetable entry created successfully');
      }
      
      fetchTimetableEntries();
      setIsModalVisible(false);
      form.resetFields();
      setEditingEntry(null);
    } catch (error) {
      console.error('Error saving timetable entry:', error);
      message.error('Failed to save timetable entry');
    } finally {
      setLoading(false);
    }
  };

  // Handle timeslot form submission
  const handleTimeslotSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const timeslotData = {
        name: values.name,
        start_time: values.time_range[0].format('HH:mm:ss'),
        end_time: values.time_range[1].format('HH:mm:ss'),
        day_of_week: values.day_of_week,
        is_break: values.is_break,
        school_id: schoolId
      };

      if (editingTimeslot) {
        // Update existing timeslot
        const { error } = await supabase
          .from('timeslots')
          .update(timeslotData)
          .eq('id', editingTimeslot.id);

        if (error) throw error;
        message.success('Timeslot updated successfully');
      } else {
        // Create new timeslot
        const { error } = await supabase
          .from('timeslots')
          .insert([timeslotData]);

        if (error) throw error;
        message.success('Timeslot created successfully');
      }
      
      fetchTimeslots();
      setIsTimeslotModalVisible(false);
      timeslotForm.resetFields();
      setEditingTimeslot(null);
    } catch (error) {
      console.error('Error saving timeslot:', error);
      message.error('Failed to save timeslot');
    } finally {
      setLoading(false);
    }
  };

  // Handle room form submission
  const handleRoomSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const roomData = {
        name: values.name,
        capacity: values.capacity,
        description: values.description,
        school_id: schoolId
      };

      if (editingRoom) {
        // Update existing room
        const { error } = await supabase
          .from('rooms')
          .update(roomData)
          .eq('id', editingRoom.id);

        if (error) throw error;
        message.success('Room updated successfully');
      } else {
        // Create new room
        const { error } = await supabase
          .from('rooms')
          .insert([roomData]);

        if (error) throw error;
        message.success('Room created successfully');
      }
      
      fetchRooms();
      setIsRoomModalVisible(false);
      roomForm.resetFields();
      setEditingRoom(null);
    } catch (error) {
      console.error('Error saving room:', error);
      message.error('Failed to save room');
    } finally {
      setLoading(false);
    }
  };

  const groupEntriesByTimeslot = (entries: TimetableEntry[]) => {
    const entriesByTimeslot = entries.reduce((acc, entry) => {
      const timeslotId = entry.timeslot_id;
      if (!acc[timeslotId]) acc[timeslotId] = [];
      acc[timeslotId].push(entry);
      return acc;
    }, {} as Record<number, TimetableEntry[]>);
  
    // Sort timeslots by start time
    const sortedTimeslotIds = Object.keys(entriesByTimeslot)
      .map(Number)
      .sort((a, b) => {
        const timeslotA = timeslots.find(t => t.id === a);
        const timeslotB = timeslots.find(t => t.id === b);
        return (timeslotA?.start_time || '').localeCompare(timeslotB?.start_time || '');
      });
  
    return { entriesByTimeslot, sortedTimeslotIds };
  };

  // Delete timetable entry
  const deleteEntry = async (id: number) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('timetable_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      message.success('Timetable entry deleted successfully');
      fetchTimetableEntries();
    } catch (error) {
      console.error('Error deleting timetable entry:', error);
      message.error('Failed to delete timetable entry');
    } finally {
      setLoading(false);
    }
  };

  // Delete timeslot
  const deleteTimeslot = async (id: number) => {
    try {
      setLoading(true);
      
      // Check if timeslot is used in any timetable entries
      const { count } = await supabase
        .from('timetable_entries')
        .select('*', { count: 'exact' })
        .eq('timeslot_id', id);

      if (count && count > 0) {
        message.error('Cannot delete timeslot used in timetable entries');
        return;
      }

      const { error } = await supabase
        .from('timeslots')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      message.success('Timeslot deleted successfully');
      fetchTimeslots();
    } catch (error) {
      console.error('Error deleting timeslot:', error);
      message.error('Failed to delete timeslot');
    } finally {
      setLoading(false);
    }
  };

  // Delete room
  const deleteRoom = async (id: number) => {
    try {
      setLoading(true);
      
      // Check if room is used in any timetable entries
      const { count } = await supabase
        .from('timetable_entries')
        .select('*', { count: 'exact' })
        .eq('room_id', id);

      if (count && count > 0) {
        message.error('Cannot delete room used in timetable entries');
        return;
      }

      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      message.success('Room deleted successfully');
      fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      message.error('Failed to delete room');
    } finally {
      setLoading(false);
    }
  };

  // Open modal for new/edit entry
  const showModal = (entry?: TimetableEntry, dayIndex?: number, timeslotId?: number) => {
    setIsEditMode(false);
    form.resetFields(); // Always start with a clean form
    
    if (entry) {
      setEditingEntry(entry);
      form.setFieldsValue({
        class_id: entry.class_id,
        subject_id: entry.subject_id,
        teacher_id: entry.teacher_id,
        timeslot_id: entry.timeslot_id,
        room_id: entry.room_id,
        day_of_week: entry.day_of_week,
        recurring: entry.recurring,
        date_range: entry.start_date && entry.end_date ? [
          dayjs(entry.start_date),
          dayjs(entry.end_date)
        ] : undefined
      });
    } else {
      setEditingEntry(null);
      // Only pre-fill day and timeslot if provided
      if (dayIndex !== undefined && timeslotId !== undefined) {
        form.setFieldsValue({
          day_of_week: dayIndex,
          timeslot_id: timeslotId,
          recurring: true
        });
      }
    }
    setIsModalVisible(true);
  };
  
  // Open modal for new/edit timeslot
  const showTimeslotModal = (timeslot?: Timeslot) => {
    if (timeslot) {
      setEditingTimeslot(timeslot);
      timeslotForm.setFieldsValue({
        name: timeslot.name,
        time_range: [
          dayjs(timeslot.start_time, 'HH:mm:ss'),
          dayjs(timeslot.end_time, 'HH:mm:ss')
        ],
        day_of_week: timeslot.day_of_week,
        is_break: timeslot.is_break
      });
    } else {
      setEditingTimeslot(null);
      timeslotForm.resetFields();
    }
    setIsTimeslotModalVisible(true);
  };

  // Open modal for new/edit room
  const showRoomModal = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      roomForm.setFieldsValue({
        name: room.name,
        capacity: room.capacity,
        description: room.description
      });
    } else {
      setEditingRoom(null);
      roomForm.resetFields();
    }
    setIsRoomModalVisible(true);
  };

  // Filter timetable entries based on selected filters
  const getFilteredEntries = () => {
    return timetableEntries.filter(entry => {
      const matchesClass = !selectedClass || entry.class_id === selectedClass;
      const matchesTeacher = !selectedTeacher || entry.teacher_id === selectedTeacher;
      
      return matchesClass && matchesTeacher;
    });
  };

  // Get class name by ID
  const getClassName = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name} (Grade ${cls.grade})` : classId;
  };

  // Get teacher name by ID
  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.user_id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Not assigned';
  };

  // Get subject name by ID
  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? `${subject.name} (${subject.code})` : subjectId.toString();
  };

  // Get room name by ID
  const getRoomName = (roomId?: number) => {
    if (!roomId) return 'Not assigned';
    const room = rooms.find(r => r.id === roomId);
    return room ? room.name : roomId.toString();
  };

  // Get timeslot name by ID
  const getTimeslotName = (timeslotId: number) => {
    const timeslot = timeslots.find(t => t.id === timeslotId);
    return timeslot ? timeslot.name : timeslotId.toString();
  };

  // Enhanced date cell renderer with hover and click handling
  const dateCellRender = (value: dayjs.Dayjs) => {
    const dayOfWeek = value.day();
    const dateStr = value.format('YYYY-MM-DD');
    const dayEntries = getFilteredEntries().filter(entry => {
      if (entry.recurring) {
        return entry.day_of_week === dayOfWeek;
      } else {
        return (
          entry.day_of_week === dayOfWeek &&
          entry.start_date && entry.end_date &&
          dateStr >= entry.start_date && dateStr <= entry.end_date
        );
      }
    });
  
    // Calculate how many entries we can show (3 by default, but can adjust based on space)
    const maxVisibleEntries = 3;
    const hasMoreEntries = dayEntries.length > maxVisibleEntries;
    const visibleEntries = hasMoreEntries 
      ? dayEntries.slice(0, maxVisibleEntries - 1) // Leave room for "See More"
      : dayEntries;
  
      return (
        <div 
          style={{ 
            height: '100%',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            overflow: 'hidden',
            cursor: 'pointer' // Add cursor pointer to indicate clickable area
          }}
          onClick={() => {
            // Group entries by timeslot for the modal
            const { entriesByTimeslot, sortedTimeslotIds } = groupEntriesByTimeslot(dayEntries);
            
            setDayModalData({
              date: value,
              entriesByTimeslot,
              sortedTimeslotIds
            });
            setDayModalVisible(true);
          }}
        >
        {/* Visible entries */}
        {visibleEntries.map((entry, index) => {
          const isBreak = entry.timeslots?.is_break;
          return (
            <Popover
              key={`${entry.id}-${index}`}
              content={
                <Space direction="vertical" size={0}>
                  <Text strong>{entry.timeslots?.name || 'Period'}</Text>
                  {isBreak ? (
                    <Text type="secondary">Break Time</Text>
                  ) : (
                    <>
                      <Text type="secondary">{entry.subjects?.name}</Text>
                      <Text type="secondary">{entry.teachers?.first_name} {entry.teachers?.last_name}</Text>
                      {entry.rooms?.name && <Text type="secondary">{entry.rooms.name}</Text>}
                    </>
                  )}
                </Space>
              }
              title={entry.classes ? `${entry.classes.name} (Grade ${entry.classes.grade})` : "Class Details"}
              trigger="hover"
            >
              <div
                style={{
                  flexShrink: 0,
                  height: '24px',
                  lineHeight: '24px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  padding: '0 6px',
                  borderRadius: '4px',
                  backgroundColor: isBreak ? '#fff0f0' : '#f0f9ff',
                  borderLeft: `3px solid ${isBreak ? '#ff4d4f' : '#1890ff'}`,
                  color: isBreak ? '#ff4d4f' : '#1890ff',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  showModal(entry);
                }}
              >
                {isBreak ? (
                  <>
                    <CoffeeOutlined style={{ marginRight: 4 }} />
                    {entry.timeslots?.name}
                  </>
                ) : (
                  entry.subjects?.name
                )}
              </div>
            </Popover>
          );
        })}
  
        {/* "See More" button if there are additional entries */}
        {hasMoreEntries && (
          <Button
            type="text"
            size="small"
            style={{
              height: '24px',
              padding: '0 6px',
              fontSize: '11px',
              lineHeight: '22px'
            }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the day click
              // Group entries by timeslot for the modal
              const { entriesByTimeslot, sortedTimeslotIds } = groupEntriesByTimeslot(dayEntries);
          
              setDayModalData({
                date: value,
                entriesByTimeslot,
                sortedTimeslotIds
              });
              setDayModalVisible(true);
            }}
          >
            See More ({dayEntries.length - maxVisibleEntries + 1})
          </Button>
        )}
  
        {/* Empty state */}
        {dayEntries.length === 0 && (
          <div
            style={{
              flexShrink: 0,
              height: '24px',
              lineHeight: '24px',
              textAlign: 'center',
              color: '#bfbfbf',
              fontSize: '11px',
              fontStyle: 'italic'
            }}
          >
            No classes
          </div>
        )}
      </div>
    );
  };

  // Enhanced weekly view cell renderer
  const renderWeeklyCell = (timeslot: Timeslot, dayIndex: number) => {
    const entries = getFilteredEntries().filter(
      e => e.timeslot_id === timeslot.id && e.day_of_week === dayIndex
    );
    
    return (
      <div style={{ minHeight: '80px' }}>
        {/* Existing entries */}
        {entries.map(entry => {
          const isBreak = entry.timeslots?.is_break;
          const isHovered = hoveredEntry === entry.id;
          
          return (
            <Popover
              key={entry.id}
              content={
                <Space direction="vertical" size={0}>
                  <Text strong>{entry.timeslots?.name || 'Period'}</Text>
                  {isBreak ? (
                    <Text type="secondary">Break Time</Text>
                  ) : (
                    <>
                      <Text type="secondary">{entry.subjects?.name}</Text>
                      <Text type="secondary">{entry.teachers?.first_name} {entry.teachers?.last_name}</Text>
                      {entry.rooms?.name && <Text type="secondary">{entry.rooms.name}</Text>}
                    </>
                  )}
                </Space>
              }
              title={entry.classes ? `${entry.classes.name} (Grade ${entry.classes.grade})` : "Class Details"}
              trigger="hover"
            >
              <div 
                style={{ 
                  marginBottom: 4,
                  padding: '4px 8px',
                  borderRadius: 4,
                  backgroundColor: isBreak ? '#f5222d' : '#1890ff',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: isHovered ? 0.8 : 1,
                  transform: isHovered ? 'scale(1.02)' : 'scale(1)'
                }}
                onMouseEnter={() => setHoveredEntry(entry.id)}
                onMouseLeave={() => setHoveredEntry(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  showModal(entry);
                }}
              >
                <Text ellipsis style={{ color: '#fff' }}>
                  {isBreak ? (
                    <Space>
                      <CoffeeOutlined />
                      {entry.timeslots?.name}
                    </Space>
                  ) : (
                    <Space>
                      <BookOutlined />
                      {entry.subjects?.name}
                    </Space>
                  )}
                </Text>
              </div>
            </Popover>
          );
        })}
        
        {/* Always show Add button at the bottom */}
        <div style={{ marginTop: entries.length > 0 ? 8 : 0 }}>
          {!timeslot.is_break ? (
            <Button 
              type="dashed" 
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                showModal(undefined, dayIndex, timeslot.id);
              }}
              block
              size="small"
            >
              Add
            </Button>
          ) : (
            <Popover
              content="No classes can be assigned during this period."
              title="Break Time"
              trigger="hover"
            >
              <div style={{ 
                padding: '4px 8px',
                borderRadius: 4,
                backgroundColor: '#fff0f0',
                color: '#f5222d',
                textAlign: 'center',
                fontSize: '0.8em',
                cursor: 'pointer'
              }}>
                <CoffeeOutlined /> Break Time
              </div>
            </Popover>
          )}
        </div>
      </div>
    );
  };
  
// Responsive columns for list view
const responsiveColumns: ColumnType<TimetableEntry>[] = [
  {
    title: 'Day',
    dataIndex: 'day_of_week',
    key: 'day',
    render: (day: number) => dayNames[day],
    responsive: ['md'] as Breakpoint[]
  },
  {
    title: 'Timeslot',
    dataIndex: 'timeslot_id',
    key: 'timeslot',
    render: (timeslotId: number) => getTimeslotName(timeslotId)
  },
  {
    title: 'Class',
    dataIndex: 'class_id',
    key: 'class',
    render: (classId: string) => getClassName(classId),
    responsive: ['sm'] as Breakpoint[]
  },
  {
    title: 'Subject',
    dataIndex: 'subject_id',
    key: 'subject',
    render: (subjectId: number) => getSubjectName(subjectId)
  },
  {
    title: 'Teacher',
    dataIndex: 'teacher_id',
    key: 'teacher',
    render: (teacherId: string) => getTeacherName(teacherId),
    responsive: ['md'] as Breakpoint[]
  },
  {
    title: 'Room',
    dataIndex: 'room_id',
    key: 'room',
    render: (roomId?: number) => getRoomName(roomId),
    responsive: ['lg'] as Breakpoint[]
  },
  {
    title: 'Actions',
    key: 'actions',
    render: (_: any, record: TimetableEntry) => (
      <Space>
        <Button 
          icon={<EditOutlined />} 
          onClick={() => showModal(record)}
          size="small"
        />
        <Popconfirm
          title="Are you sure you want to delete this entry?"
          onConfirm={() => deleteEntry(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button 
            danger 
            icon={<DeleteOutlined />}
            size="small"
          />
        </Popconfirm>
      </Space>
    )
  }
];

  if (loading && timetableEntries.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Card>
        <Tabs defaultActiveKey="timetable">
          {/* Timetable Tab */}
          <TabPane 
            tab={<span><ScheduleOutlined /> Timetable</span>} 
            key="timetable"
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: '8px' }}>
                  <Space style={{ marginBottom: screens.xs ? 8 : 0 }}>
                    <Select 
                      placeholder="Filter by class" 
                      style={{ width: screens.xs ? '100%' : 200 }} 
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
                      placeholder="Filter by teacher" 
                      style={{ width: screens.xs ? '100%' : 200 }} 
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
                  </Space>
                  <Space style={{ marginBottom: screens.xs ? 8 : 0 }}>
                    <Radio.Group 
                      value={viewMode} 
                      onChange={e => setViewMode(e.target.value)}
                      buttonStyle="solid"
                      size={screens.xs ? 'small' : 'middle'}
                    >
                      <Radio.Button value="calendar">
                        <CalendarOutlined /> {screens.sm ? 'Calendar' : ''}
                      </Radio.Button>
                      <Radio.Button value="list">
                        <UnorderedListOutlined /> {screens.sm ? 'List' : ''}
                      </Radio.Button>
                    </Radio.Group>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => showModal()}
                      size={screens.xs ? 'small' : 'middle'}
                    >
                      {screens.sm ? 'New Entry' : ''}
                    </Button>
                  </Space>
                </div>
              </Col>
              
              <Col span={24}>
                {viewMode === 'calendar' ? (
                  <div style={{ overflowX: 'auto' }}>
                    <Calendar 
                      value={selectedDate}
                      onChange={setSelectedDate}
                      dateCellRender={dateCellRender}
                      headerRender={({ value, onChange }) => (
                        <div style={{ padding: 10, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <Button.Group size={screens.xs ? 'small' : 'middle'}>
                            <Button onClick={() => onChange(value.subtract(1, 'month'))}>
                              {screens.xs ? 'Prev' : 'Previous Month'}
                            </Button>
                            <Button onClick={() => onChange(dayjs())}>
                              Today
                            </Button>
                            <Button onClick={() => onChange(value.add(1, 'month'))}>
                              {screens.xs ? 'Next' : 'Next Month'}
                            </Button>
                          </Button.Group>
                          <Title level={4} style={{ margin: 0 }}>
                            {value.format('MMMM YYYY')}
                          </Title>
                        </div>
                      )}
                      style={{ minWidth: screens.xs ? '300px' : '100%' }}
                    />
                  </div>
                ) : (
                  <Table
                    columns={responsiveColumns}
                    dataSource={getFilteredEntries()}
                    rowKey="id"
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: true }}
                    loading={loading}
                    size={screens.xs ? 'small' : 'middle'}
                    locale={{
                      emptyText: (
                        <Empty 
                          description={
                            selectedClass || selectedTeacher ? 
                              "No timetable entries match your filters" : 
                              "No timetable entries found. Add your first entry!"
                          }
                        />
                      )
                    }}
                  />
                )}
              </Col>
            </Row>
          </TabPane>
          
          {/* Weekly View Tab */}
          <TabPane 
            tab={<span><SyncOutlined /> Weekly View</span>} 
            key="weekly"
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: '8px' }}>
                  <Space style={{ marginBottom: screens.xs ? 8 : 0 }}>
                    <Select 
                      placeholder="Filter by class" 
                      style={{ width: screens.xs ? '100%' : 200 }} 
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
                      placeholder="Filter by teacher" 
                      style={{ width: screens.xs ? '100%' : 200 }} 
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
                  </Space>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => showModal()}
                    size={screens.xs ? 'small' : 'middle'}
                    style={{ marginBottom: screens.xs ? 8 : 0 }}
                  >
                    {screens.sm ? 'New Entry' : ''}
                  </Button>
                </div>
              </Col>
              
              <Col span={24}>
                <div style={{ overflowX: 'auto' }}>
                  <Table
                    columns={[
                      {
                        title: 'Timeslot',
                        dataIndex: 'name',
                        key: 'timeslot',
                        fixed: 'left',
                        width: screens.xs ? 120 : 150,
                        render: (name: string, record: Timeslot) => (
                          <div>
                            <Text strong>{name}</Text>
                            <br />
                            <Text type="secondary">
                              {dayjs(record.start_time, 'HH:mm:ss').format('h:mm A')} - {dayjs(record.end_time, 'HH:mm:ss').format('h:mm A')}
                            </Text>
                          </div>
                        )
                      },
                      ...dayNames.map((day, index) => ({
                        title: screens.xs ? day.substring(0, 3) : day,
                        key: day,
                        width: screens.xs ? 120 : undefined,
                        render: (_: any, timeslot: Timeslot) => renderWeeklyCell(timeslot, index)
                      }))
                    ]}
                    dataSource={timeslots}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    loading={loading}
                    size={screens.xs ? 'small' : 'middle'}
                  />
                </div>
              </Col>
            </Row>
          </TabPane>
          
          {/* Timeslots Management Tab */}
          <TabPane 
            tab={
              <span>
                <ScheduleOutlined /> Timeslots
              </span>
            } 
            key="timeslots"
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card 
                  title="Timeslots" 
                  bordered={false}
                  extra={
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => showTimeslotModal()}
                    >
                      Add Timeslot
                    </Button>
                  }
                >
                  <Table
                    columns={[
                      {
                        title: 'Name',
                        dataIndex: 'name',
                        key: 'name'
                      },
                      {
                        title: 'Time',
                        key: 'time',
                        render: (record: Timeslot) => (
                          <Text>
                            {dayjs(record.start_time, 'HH:mm:ss').format('h:mm A')} - {dayjs(record.end_time, 'HH:mm:ss').format('h:mm A')}
                          </Text>
                        )
                      },
                      {
                        title: 'Day',
                        dataIndex: 'day_of_week',
                        key: 'day',
                        render: (day?: number) => day !== undefined ? dayNames[day] : 'Daily'
                      },
                      {
                        title: 'Type',
                        dataIndex: 'is_break',
                        key: 'type',
                        render: (isBreak: boolean) => (
                          <Tag color={isBreak ? 'red' : 'blue'}>
                            {isBreak ? 'Break' : 'Class Period'}
                          </Tag>
                        )
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        render: (_: any, record: Timeslot) => (
                          <Space>
                            <Button 
                              icon={<EditOutlined />} 
                              onClick={() => showTimeslotModal(record)}
                              size="small"
                            />
                            <Popconfirm
                              title="Are you sure you want to delete this timeslot?"
                              onConfirm={() => deleteTimeslot(record.id)}
                              okText="Yes"
                              cancelText="No"
                            >
                              <Button 
                                danger 
                                icon={<DeleteOutlined />}
                                size="small"
                              />
                            </Popconfirm>
                          </Space>
                        )
                      }
                    ]}
                    dataSource={timeslots}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    loading={loading}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>
          
          {/* Rooms Management Tab */}
          <TabPane 
            tab={
              <span>
                <HomeOutlined /> Rooms
              </span>
            } 
            key="rooms"
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card 
                  title="Rooms" 
                  bordered={false}
                  extra={
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => showRoomModal()}
                    >
                      Add Room
                    </Button>
                  }
                >
                  <Table
                    columns={[
                      {
                        title: 'Name',
                        dataIndex: 'name',
                        key: 'name'
                      },
                      {
                        title: 'Capacity',
                        dataIndex: 'capacity',
                        key: 'capacity',
                        render: (capacity?: number) => capacity || 'N/A'
                      },
                      {
                        title: 'Description',
                        dataIndex: 'description',
                        key: 'description',
                        render: (desc?: string) => desc || 'N/A'
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        render: (_: any, record: Room) => (
                          <Space>
                            <Button 
                              icon={<EditOutlined />} 
                              onClick={() => showRoomModal(record)}
                              size="small"
                            />
                            <Popconfirm
                              title="Are you sure you want to delete this room?"
                              onConfirm={() => deleteRoom(record.id)}
                              okText="Yes"
                              cancelText="No"
                            >
                              <Button 
                                danger 
                                icon={<DeleteOutlined />}
                                size="small"
                              />
                            </Popconfirm>
                          </Space>
                        )
                      }
                    ]}
                    dataSource={rooms}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    loading={loading}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* Timetable Entry Modal */}
      <Modal
        title={<>
          <ScheduleOutlined /> {editingEntry ? (isEditMode ? 'Edit Timetable Entry' : 'Timetable Entry Details') : 'Add New Timetable Entry'}
        </>}
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingEntry(null);
          setIsEditMode(false);
        }}
        footer={null}
        width={700}
      >
        {editingEntry && !isEditMode ? (
          <div>
            <Card bordered={false}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>Class:</Text>
                  <Text style={{ display: 'block' }}>
                    {getClassName(editingEntry.class_id)}
                  </Text>
                </div>
                
                <div>
                  <Text strong>Subject:</Text>
                  <Text style={{ display: 'block' }}>
                    {getSubjectName(editingEntry.subject_id)}
                  </Text>
                </div>
                
                <div>
                  <Text strong>Teacher:</Text>
                  <Text style={{ display: 'block' }}>
                    {getTeacherName(editingEntry.teacher_id)}
                  </Text>
                </div>
                
                <div>
                  <Text strong>Timeslot:</Text>
                  <Text style={{ display: 'block' }}>
                    {getTimeslotName(editingEntry.timeslot_id)} ({dayNames[editingEntry.day_of_week]})
                  </Text>
                </div>
                
                {editingEntry.room_id && (
                  <div>
                    <Text strong>Room:</Text>
                    <Text style={{ display: 'block' }}>
                      {getRoomName(editingEntry.room_id)}
                    </Text>
                  </div>
                )}
                
                <div>
                  <Text strong>Schedule Type:</Text>
                  <Text style={{ display: 'block' }}>
                    {editingEntry.recurring ? 'Recurring' : 'One-time'}
                  </Text>
                </div>
                
                {!editingEntry.recurring && editingEntry.start_date && editingEntry.end_date && (
                  <div>
                    <Text strong>Date Range:</Text>
                    <Text style={{ display: 'block' }}>
                      {dayjs(editingEntry.start_date).format('MMM D, YYYY')} - {dayjs(editingEntry.end_date).format('MMM D, YYYY')}
                    </Text>
                  </div>
                )}
              </Space>
            </Card>
            
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsModalVisible(false)}>
                  Close
                </Button>
                <Button 
                  type="primary" 
                  onClick={() => setIsEditMode(true)}
                  icon={<EditOutlined />}
                >
                  Edit
                </Button>
              </Space>
            </div>
          </div>
        ) : (
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Row gutter={16}>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
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
            </Col>
            </Row>

            <Row gutter={16}>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
                <Form.Item
                name="timeslot_id"
                label="Timeslot"
                rules={[{ 
                    required: true, 
                    message: 'Please select a timeslot',
                    validator: (_, value) => {
                    const selectedTimeslot = timeslots.find(t => t.id === value);
                    if (selectedTimeslot?.is_break) {
                        return Promise.reject('Cannot assign classes to break timeslots');
                    }
                    return Promise.resolve();
                    }
                }]}
                >
                <Select 
                    placeholder="Select timeslot"
                    showSearch
                    optionFilterProp="children"
                    notFoundContent={
                    <div style={{ padding: 8 }}>
                        <Text type="secondary">No available timeslots found</Text>
                    </div>
                    }
                >
                    {timeslots
                    .filter(timeslot => !timeslot.is_break) // Filter out break timeslots
                    .map(timeslot => (
                        <Option key={timeslot.id} value={timeslot.id}>
                        {timeslot.name} ({dayjs(timeslot.start_time, 'HH:mm:ss').format('h:mm A')} - {dayjs(timeslot.end_time, 'HH:mm:ss').format('h:mm A')}
                        </Option>
                    ))}
                </Select>
                </Form.Item>
            </Col>
            </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="day_of_week"
                label="Day of Week"
                rules={[{ required: true, message: 'Please select a day' }]}
              >
                <Select placeholder="Select day">
                  {dayNames.map((day, index) => (
                    <Option key={index} value={index}>
                      {day}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="room_id"
                label="Room (Optional)"
              >
                <Select 
                  placeholder="Select room"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {rooms.map(room => (
                    <Option key={room.id} value={room.id}>
                      {room.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="recurring"
            label="Recurring"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch 
              checkedChildren="Recurring" 
              unCheckedChildren="One-time" 
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.recurring !== currentValues.recurring}
          >
            {({ getFieldValue }) => !getFieldValue('recurring') ? (
              <Form.Item
                name="date_range"
                label="Date Range"
                rules={[{ required: true, message: 'Please select a date range' }]}
              >
                <DatePicker.RangePicker style={{ width: '100%' }} />
              </Form.Item>
            ) : null}
          </Form.Item>

          <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {editingEntry ? 'Update Entry' : 'Create Entry'}
            </Button>
            <Button 
              onClick={() => {
                if (editingEntry) {
                  // Reset to the original editing entry values
                  form.setFieldsValue({
                    class_id: editingEntry.class_id,
                    subject_id: editingEntry.subject_id,
                    teacher_id: editingEntry.teacher_id,
                    timeslot_id: editingEntry.timeslot_id,
                    room_id: editingEntry.room_id,
                    day_of_week: editingEntry.day_of_week,
                    recurring: editingEntry.recurring,
                    date_range: editingEntry.start_date && editingEntry.end_date ? [
                      dayjs(editingEntry.start_date),
                      dayjs(editingEntry.end_date)
                    ] : undefined
                  });
                } else {
                  // For new entries, reset to empty or pre-filled day/timeslot
                  form.resetFields();
                  const currentValues = form.getFieldsValue();
                  if (currentValues.day_of_week !== undefined && currentValues.timeslot_id !== undefined) {
                    form.setFieldsValue({
                      day_of_week: currentValues.day_of_week,
                      timeslot_id: currentValues.timeslot_id,
                      recurring: true
                    });
                  }
                }
              }}
            >
              Reset
            </Button>
            {editingEntry && (
              <Button onClick={() => setIsEditMode(false)}>
                Cancel
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
        )}
      </Modal>

      {/* Timeslot Modal */}
      <Modal
        title={<>
            <ScheduleOutlined /> {editingTimeslot ? 'Edit Timeslot' : 'Add New Timeslot'}
        </>}
        visible={isTimeslotModalVisible}
        onCancel={() => {
            setIsTimeslotModalVisible(false);
            setEditingTimeslot(null);
        }}
        footer={null}
        >
        <Form form={timeslotForm} layout="vertical" onFinish={handleTimeslotSubmit}>
            <Form.Item
            name="name"
            label="Timeslot Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
            >
            <Input placeholder="e.g., Period 1, Morning Assembly" />
            </Form.Item>

            <Form.Item
            name="time_range"
            label="Time Range"
            rules={[{ required: true, message: 'Please select a time range' }]}
            >
            <TimePicker.RangePicker format="h:mm A" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
            name="day_of_week"
            label="Day of Week (Optional)"
            help="Leave blank for daily timeslots (same time every day)"
            >
            <Select placeholder="Select specific day (optional)" allowClear>
                {dayNames.map((day, index) => (
                <Option key={index} value={index}>
                    {day}
                </Option>
                ))}
            </Select>
            </Form.Item>

            <Form.Item
            name="is_break"
            label="Is Break Time?"
            valuePropName="checked"
            initialValue={false}
            >
            <Switch 
                checkedChildren={<CoffeeOutlined />} 
                unCheckedChildren={<BookOutlined />} 
            />
            </Form.Item>

            <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.is_break !== currentValues.is_break}
            >
            {({ getFieldValue }) => getFieldValue('is_break') && (
                <Alert
                message="Break Timeslot"
                description="This timeslot will be marked as a break and cannot be assigned to classes."
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                style={{ marginBottom: 16 }}
                />
            )}
            </Form.Item>

            <Form.Item>
            <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                {editingTimeslot ? 'Update Timeslot' : 'Create Timeslot'}
                </Button>
                <Button onClick={() => form.resetFields()}>
                  Reset
                </Button>
            </Space>
            </Form.Item>
        </Form>
      </Modal>

      {/* Room Modal */}
      <Modal
        title={<>
          <HomeOutlined /> {editingRoom ? 'Edit Room' : 'Add New Room'}
        </>}
        visible={isRoomModalVisible}
        onCancel={() => {
          setIsRoomModalVisible(false);
          setEditingRoom(null);
        }}
        footer={null}
      >
        <Form form={roomForm} layout="vertical" onFinish={handleRoomSubmit}>
          <Form.Item
            name="name"
            label="Room Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., Room 101, Science Lab" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="capacity"
                label="Capacity (Optional)"
              >
                <Input type="number" placeholder="e.g., 30" min={1} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <TextArea rows={3} placeholder="Enter room description..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingRoom ? 'Update Room' : 'Create Room'}
              </Button>
              <Button onClick={() => roomForm.resetFields()}>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {dayModalData && (
        <DayScheduleModal
          visible={dayModalVisible}
          onCancel={() => setDayModalVisible(false)}
          date={dayModalData.date}
          entriesByTimeslot={dayModalData.entriesByTimeslot}
          sortedTimeslotIds={dayModalData.sortedTimeslotIds}
          timeslots={timeslots}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
        />
      )}

      {timeslotModalData && (
        <TimeslotDetailModal
          visible={timeslotModalVisible}
          onCancel={() => setTimeslotModalVisible(false)}
          timeslot={timeslotModalData.timeslot}
          dayIndex={timeslotModalData.dayIndex}
          entries={timeslotModalData.entries}
          dayNames={dayNames}
          classes={classes}
          subjects={subjects}
          teachers={teachers}      
        />
      )}      
    </div>
  );
};

export default TimetableManager;