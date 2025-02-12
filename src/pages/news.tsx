import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Plus, DollarSign, FileText, Clock, Calendar, Search, Edit, UserPlus } from "lucide-react";

const PayrollPage = () => {
  // State variables
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const [activeTab, setActiveTab] = useState("current");
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyMonthFilter, setHistoryMonthFilter] = useState("all");
  const [historyDepartmentFilter, setHistoryDepartmentFilter] = useState("all");
  const [historyRoleFilter, setHistoryRoleFilter] = useState("all");

  const initialFormState = {
    employeeId: "",
    name: "",
    role: "",
    department: "",
    basicSalary: "",
    allowances: "",
    deductions: "",
    month: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<any[]>([]);

  // Fetch payroll data from Supabase
  const fetchPayrollData = async () => {
    const { data, error } = await supabase.from("employees").select("*");
    if (error) console.error("Error fetching payroll data:", error);
    else setPayrollData(data);
  };

  // Fetch payroll history from Supabase
  const fetchPayrollHistory = async () => {
    const { data, error } = await supabase.from("payroll_history").select("*");
    if (error) console.error("Error fetching payroll history:", error);
    else setPayrollHistory(data);
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchPayrollData();
    fetchPayrollHistory();
  }, []);

  // Process payroll for selected employees
  const handleProcessPayroll = async (employeeIds: number[]) => {
    const currentDate = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("employees")
      .update({ status: "Paid", processed_date: currentDate, processed_by: "Admin User" })
      .in("id", employeeIds);
    if (error) {
      console.error("Error processing payroll:", error);
    } else if (data) {
      // Add processed payrolls to payroll history
      const processedPayrolls = (data as any[] ?? []).map((employee: any) => ({
        employee_id: employee.employee_id,
        name: employee.name,
        role: employee.role,
        department: employee.department,
        basic_salary: employee.basic_salary,
        allowances: employee.allowances,
        deductions: employee.deductions,
        net_salary: employee.net_salary,
        month: employee.month,
        processed_date: currentDate,
        processed_by: "Admin User",
      }));
      const { error: historyError } = await supabase
        .from("payroll_history")
        .insert(processedPayrolls);
      if (historyError) console.error("Error adding to payroll history:", historyError);
      fetchPayrollData();
      fetchPayrollHistory();
    }
    setSelectedEmployees([]);
  };

  // Edit employee payroll
  const handleEditEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setFormData({
      employeeId: employee.employee_id,
      name: employee.name,
      role: employee.role,
      department: employee.department,
      basicSalary: employee.basic_salary,
      allowances: employee.allowances,
      deductions: employee.deductions,
      month: employee.month,
    });
    setShowEditModal(true);
  };

  // Add new employee
  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setFormData(initialFormState);
    setShowAddModal(true);
  };

  // Save employee (add or update)
  const handleSaveEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const netSalary = Number(formData.basicSalary) + Number(formData.allowances) - Number(formData.deductions);
    const employeeData = {
      employee_id: formData.employeeId,
      name: formData.name,
      role: formData.role,
      department: formData.department,
      basic_salary: Number(formData.basicSalary),
      allowances: Number(formData.allowances),
      deductions: Number(formData.deductions),
      net_salary: netSalary,
      status: "Pending",
      payment_date: new Date().toISOString().split("T")[0],
      month: formData.month,
    };

    if (selectedEmployee) {
      const { error } = await supabase
        .from("employees")
        .update(employeeData)
        .eq("id", selectedEmployee.id);
      if (error) console.error("Error updating employee:", error);
      else fetchPayrollData();
    } else {
      const { error } = await supabase.from("employees").insert([employeeData]);
      if (error) console.error("Error adding employee:", error);
      else fetchPayrollData();
    }
    setShowEditModal(false);
    setShowAddModal(false);
    setFormData(initialFormState);
  };

  // Custom select component
  const CustomSelect = ({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; placeholder: string }) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full md:w-40 px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  // Modal component
  const Modal = ({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-medium">{title}</h3>
            <button onClick={onClose} className="text-gray-500 bg-gray-300 hover:text-gray-700">
              ×
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    );
  };

  // Employee form component
  const EmployeeForm = ({ onSubmit, buttonText }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; buttonText: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Employee ID</label>
          <input
            type="text"
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            className="w-full p-2 bg-gray-300 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 bg-gray-300 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <input
            type="text"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full p-2 bg-gray-300 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Department</label>
          <input
            type="text"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            className="w-full p-2 bg-gray-300 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Basic Salary</label>
          <input
            type="number"
            value={formData.basicSalary}
            onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
            className="w-full p-2 bg-gray-300 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Allowances</label>
          <input
            type="number"
            value={formData.allowances}
            onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
            className="w-full p-2 bg-gray-300 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Deductions</label>
          <input
            type="number"
            value={formData.deductions}
            onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
            className="w-full p-2 bg-gray-300 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <select
            value={formData.month}
            onChange={(e) => setFormData({ ...formData, month: e.target.value })}
            className="w-full p-2 bg-gray-300 border rounded"
            required
          >
            <option value="">Select Month</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={() => {
            setShowEditModal(false);
            setShowAddModal(false);
          }}
          className="px-4 py-2 bg-red-600 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {buttonText}
        </button>
      </div>
    </form>
  );

  // Render payroll table
  const renderPayrollTable = (data: any[], isHistory = false) => (
    <div className="bg-white rounded-lg shadow">
      <div className="hidden md:grid grid-cols-10 gap-4 p-4 bg-gray-50 font-medium">
        {!isHistory && (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedEmployees.length === filteredPayroll.length}
              onChange={() => {
                if (selectedEmployees.length === filteredPayroll.length) {
                  setSelectedEmployees([]);
                } else {
                  setSelectedEmployees(filteredPayroll.map((item) => item.id));
                }
              }}
              className="w-4 h-4"
            />
          </div>
        )}
        <div>Employee ID</div>
        <div>Name</div>
        <div>Role</div>
        <div>Department</div>
        <div>Basic Salary</div>
        <div>Allowances</div>
        <div>Net Salary</div>
        <div>Status</div>
        <div>Actions</div>
        {isHistory && <div>Processed Date</div>}
      </div>

      <div className="divide-y">
        {data.map((payroll) => (
          <div key={payroll.id} className="p-4">
            <div className="md:grid md:grid-cols-10 md:gap-4 space-y-2 md:space-y-0 items-center">
              {!isHistory && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(payroll.id)}
                    onChange={() => {
                      if (selectedEmployees.includes(payroll.id)) {
                        setSelectedEmployees((prev) => prev.filter((id) => id !== payroll.id));
                      } else {
                        setSelectedEmployees((prev) => [...prev, payroll.id]);
                      }
                    }}
                    disabled={payroll.status === "Paid"}
                    className="w-4 h-4"
                  />
                </div>
              )}
              <div className="font-medium">{payroll.employee_id}</div>
              <div>{payroll.name}</div>
              <div>{payroll.role}</div>
              <div>{payroll.department}</div>
              <div>${payroll.basic_salary}</div>
              <div>${payroll.allowances}</div>
              <div>${payroll.net_salary}</div>
              <div>
                <span
                  className={`px-2 py-1 rounded-full text-sm ${
                    payroll.status === "Paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {payroll.status}
                </span>
              </div>
              <div>
                {!isHistory && (
                  <button
                    onClick={() => handleEditEmployee(payroll)}
                    className="p-2 text-blue-500 hover:text-blue-700"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>
              {isHistory && <div>{payroll.processed_date}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Filter payroll data
  const filteredPayroll = payrollData.filter((payroll) => {
    const statusMatch = statusFilter === "all" || payroll.status === statusFilter;
    const departmentMatch = departmentFilter === "all" || payroll.department === departmentFilter;
    const roleMatch = roleFilter === "all" || payroll.role === roleFilter;
    const monthMatch = monthFilter === "all" || payroll.month === monthFilter;
    const searchMatch =
      searchQuery === "" ||
      payroll.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payroll.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && departmentMatch && roleMatch && monthMatch && searchMatch;
  });

  // Filter payroll history
  const filteredPayrollHistory = payrollHistory.filter((payroll) => {
    const departmentMatch = historyDepartmentFilter === "all" || payroll.department === historyDepartmentFilter;
    const roleMatch = historyRoleFilter === "all" || payroll.role === historyRoleFilter;
    const monthMatch = historyMonthFilter === "all" || payroll.month === historyMonthFilter;
    const searchMatch =
      historySearchQuery === "" ||
      payroll.name.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      payroll.employee_id.toLowerCase().includes(historySearchQuery.toLowerCase());
    return departmentMatch && roleMatch && monthMatch && searchMatch;
  });

  // Calculate totals
  const totalPayroll = filteredPayroll.reduce((sum, item) => sum + item.net_salary, 0);
  const processedCount = filteredPayroll.filter((item) => item.status === "Paid").length;
  const pendingCount = filteredPayroll.filter((item) => item.status === "Pending").length;

  // Unique departments and roles
  const departments = [...new Set(payrollData.map((item) => item.department))];
  const roles = [...new Set(payrollData.map((item) => item.role))];
  const historyDepartments = [...new Set(payrollHistory.map((item) => item.department))];
  const historyRoles = [...new Set(payrollHistory.map((item) => item.role))];

  return (
    <div className="min-h-screen text-black">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Payroll Management</h2>
        <button
          onClick={handleAddEmployee}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <DollarSign className="w-5 h-5" />
            <h3 className="font-medium">Total Payroll</h3>
          </div>
          <p className="text-2xl font-bold">${totalPayroll}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 text-green-500 mb-2">
            <FileText className="w-5 h-5" />
            <h3 className="font-medium">Processed</h3>
          </div>
          <p className="text-2xl font-bold">{processedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 text-yellow-500 mb-2">
            <Clock className="w-5 h-5" />
            <h3 className="font-medium">Pending</h3>
          </div>
          <p className="text-2xl font-bold">{pendingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 text-purple-500 mb-2">
            <Calendar className="w-5 h-5" />
            <h3 className="font-medium">Next Payday</h3>
          </div>
          <p className="text-2xl font-bold">Mar 1</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b">
          <div className="flex gap-4">
            <button
              onClick={() => {
                setActiveTab("current");
                setHistorySearchQuery("");
                setHistoryMonthFilter("all");
                setHistoryDepartmentFilter("all");
                setHistoryRoleFilter("all");
              }}
              className={`px-4 py-2 font-medium transition-colors duration-300 ${
                activeTab === "current"
                  ? "border-b-2 border-blue-500 bg-blue-600 text-white"
                  : "text-gray-500 bg-blue-100 hover:text-blue-500 hover:bg-gray-100"
              }`}
            >
              Current Payroll
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                setSearchQuery("");
                setMonthFilter("all");
                setDepartmentFilter("all");
                setRoleFilter("all");
                setSelectedEmployees([]);
              }}
              className={`px-4 py-2 font-medium transition-colors duration-300 ${
                activeTab === "history"
                  ? "border-b-2 border-blue-500 bg-blue-600 text-white"
                  : "text-gray-500 bg-blue-100 hover:text-blue-500 hover:bg-gray-100"
              }`}
            >
              Payroll History
            </button>
          </div>
        </div>
      </div>

      {activeTab === "current" && (
        <>
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {/* Search Bar */}
              <div className="relative flex-grow md:max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-300 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Month Filter */}
              <CustomSelect
                value={monthFilter}
                onChange={setMonthFilter}
                options={months.map((month) => ({ value: month, label: month }))}
                placeholder="All Months"
              />

              {/* Status Filter */}
              <CustomSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "Paid", label: "Paid" },
                  { value: "Pending", label: "Pending" },
                ]}
                placeholder="All Status"
              />

              {/* Department Filter */}
              <CustomSelect
                value={departmentFilter}
                onChange={setDepartmentFilter}
                options={departments.map((dept) => ({ value: dept, label: dept }))}
                placeholder="All Departments"
              />

              {/* Role Filter */}
              <CustomSelect
                value={roleFilter}
                onChange={setRoleFilter}
                options={roles.map((role) => ({ value: role, label: role }))}
                placeholder="All Roles"
              />

              {/* Process Selected Button */}
              <button
                className={`bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 ${
                  selectedEmployees.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => handleProcessPayroll(selectedEmployees)}
                disabled={selectedEmployees.length === 0}
              >
                <Plus className="w-4 h-4" />
                Process Selected
              </button>
            </div>
          </div>

          {/* Payroll Table */}
          {renderPayrollTable(filteredPayroll)}
        </>
      )}

      {activeTab === "history" && (
        <>
          {/* History Filters */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {/* Search Bar */}
              <div className="relative flex-grow md:max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="pl-10 bg-gray-300 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Month Filter */}
              <CustomSelect
                value={historyMonthFilter}
                onChange={setHistoryMonthFilter}
                options={months.map((month) => ({ value: month, label: month }))}
                placeholder="All Months"
              />

              {/* Department Filter */}
              <CustomSelect
                value={historyDepartmentFilter}
                onChange={setHistoryDepartmentFilter}
                options={historyDepartments.map((dept) => ({ value: dept, label: dept }))}
                placeholder="All Departments"
              />

              {/* Role Filter */}
              <CustomSelect
                value={historyRoleFilter}
                onChange={setHistoryRoleFilter}
                options={historyRoles.map((role) => ({ value: role, label: role }))}
                placeholder="All Roles"
              />
            </div>
          </div>

          {/* Payroll History Table */}
          {renderPayrollTable(filteredPayrollHistory, true)}
        </>
      )}

      {/* Edit Modal */}
      <Modal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Employee Payroll"
      >
        <EmployeeForm onSubmit={handleSaveEmployee} buttonText="Save Changes" />
      </Modal>

      {/* Add Modal */}
      <Modal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Employee"
      >
        <EmployeeForm onSubmit={handleSaveEmployee} buttonText="Add Employee" />
      </Modal>
    </div>
  );
};

export default PayrollPage;