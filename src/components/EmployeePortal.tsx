import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Calendar, Clock, User, ArrowLeftRight, AlertCircle, CheckCircle2, Loader2, DollarSign, TrendingUp, LogIn, LogOut } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { employeeService } from "../services/employeeService";
import { attendanceService } from "../services/attendanceService";
import { timeoffService } from "../services/timeoffService";
import { salesService } from "../services/salesService";
import type { Employee } from "../types/employee";
import type { ClockRecord, AttendanceStats } from "../types/attendance";
import type { TimeoffRequest } from "../types/timeoff";
import type { SalesRecord, SalesPerformanceMetrics } from "../types/sales";

const mySchedule = [
  { day: "Mon", date: "Jan 20", shift: "2pm-10pm", hours: 8, location: "Main Floor" },
  { day: "Wed", date: "Jan 22", shift: "6am-2pm", hours: 8, location: "Kitchen" },
  { day: "Fri", date: "Jan 24", shift: "2pm-10pm", hours: 8, location: "Main Floor" },
  { day: "Sat", date: "Jan 25", shift: "10am-6pm", hours: 8, location: "Main Floor" },
];

const swapRequests = [
  { from: "John Smith", shift: "Thu, Jan 23 - 2pm-10pm", status: "pending" },
  { from: "Emma Davis", shift: "Sat, Jan 25 - 10am-6pm", status: "approved" },
];

const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

// Helper to convert backend availability to UI format (hours array per day)
const backendToUIAvailability = (backendAvailability: Employee['availability']): Record<string, number[]> => {
  const uiAvailability: Record<string, number[]> = {};

  // Initialize all days with empty arrays
  daysOfWeek.forEach(day => {
    uiAvailability[day] = [];
  });

  // Convert each availability range to hours
  backendAvailability.forEach(avail => {
    const startHour = parseInt(avail.startTime.split(':')[0]);
    const endHour = parseInt(avail.endTime.split(':')[0]);

    // Add all hours in the range (exclusive of end hour)
    for (let hour = startHour; hour < endHour; hour++) {
      if (!uiAvailability[avail.dayOfWeek].includes(hour)) {
        uiAvailability[avail.dayOfWeek].push(hour);
      }
    }
  });

  // Sort hours for each day
  Object.keys(uiAvailability).forEach(day => {
    uiAvailability[day].sort((a, b) => a - b);
  });

  return uiAvailability;
};

// Helper to convert UI availability to backend format (time ranges)
const uiToBackendAvailability = (uiAvailability: Record<string, number[]>): Employee['availability'] => {
  const backendAvailability: Employee['availability'] = [];

  Object.entries(uiAvailability).forEach(([day, hours]) => {
    if (hours.length === 0) return;

    // Group consecutive hours into ranges
    const sortedHours = [...hours].sort((a, b) => a - b);
    let rangeStart = sortedHours[0];
    let rangeEnd = sortedHours[0] + 1;

    for (let i = 1; i <= sortedHours.length; i++) {
      const currentHour = sortedHours[i];

      if (currentHour === rangeEnd) {
        // Extend current range
        rangeEnd = currentHour + 1;
      } else {
        // Save current range and start new one
        backendAvailability.push({
          dayOfWeek: day,
          startTime: `${String(rangeStart).padStart(2, '0')}:00`,
          endTime: `${String(rangeEnd).padStart(2, '0')}:00`,
        });

        if (i < sortedHours.length) {
          rangeStart = currentHour;
          rangeEnd = currentHour + 1;
        }
      }
    }
  });

  return backendAvailability;
};

export function EmployeePortal() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize with empty availability
  const [availability, setAvailability] = useState<Record<string, number[]>>({});

  // Attendance state
  const [activeClockRecord, setActiveClockRecord] = useState<ClockRecord | null>(null);
  const [clockRecords, setClockRecords] = useState<ClockRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Time off state
  const [timeoffRequests, setTimeoffRequests] = useState<TimeoffRequest[]>([]);
  const [loadingTimeoff, setLoadingTimeoff] = useState(false);
  const [showTimeoffForm, setShowTimeoffForm] = useState(false);
  const [timeoffFormData, setTimeoffFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Sales state
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [salesMetrics, setSalesMetrics] = useState<SalesPerformanceMetrics | null>(null);
  const [loadingSales, setLoadingSales] = useState(false);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [salesFormData, setSalesFormData] = useState({
    amount: "",
    category: "",
    notes: "",
  });

  const toggleHour = (day: string, hour: number) => {
      setAvailability(prev => {
          const dayHours = prev[day] || [];
          const isAvailable = dayHours.includes(hour);

          return {
              ...prev,
              [day]: isAvailable
                  ? dayHours.filter(h => h !== hour)
                  : [...dayHours, hour].sort((a, b) => a - b)
          };
      });
  };

  const formatHour = (hour: number) => {
      if (hour === 0) return "12am";
      if (hour === 12) return "12pm";
      return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
  };

  const handleSaveAvailability = async () => {
    if (!employee) return;

    setSaving(true);
    try {
      const backendAvailability = uiToBackendAvailability(availability);
      await employeeService.updateEmployee(employee.id, {
        availability: backendAvailability,
      });

      // Refresh employee data
      const updatedEmployee = await employeeService.getEmployeeById(employee.id);
      setEmployee(updatedEmployee);
      alert('Availability saved successfully!');
    } catch (err) {
      console.error('Failed to save availability:', err);
      alert('Failed to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Attendance handlers
  const fetchAttendanceData = async () => {
    if (!employee) return;

    setLoadingAttendance(true);
    try {
      const [activeStatus, records, stats] = await Promise.all([
        attendanceService.getActiveStatus(employee.id),
        attendanceService.getEmployeeRecords(employee.id),
        attendanceService.getStats(employee.id),
      ]);

      setActiveClockRecord(activeStatus.record);
      setClockRecords(records);
      setAttendanceStats(stats);
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleClockIn = async () => {
    if (!employee) return;

    setLoadingAttendance(true);
    try {
      const record = await attendanceService.clockIn({ employeeId: employee.id });
      setActiveClockRecord(record);
      await fetchAttendanceData();
      alert('Clocked in successfully!');
    } catch (err) {
      console.error('Failed to clock in:', err);
      alert('Failed to clock in. Please try again.');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleClockOut = async () => {
    if (!employee || !activeClockRecord) return;

    setLoadingAttendance(true);
    try {
      await attendanceService.clockOut({ id: activeClockRecord.id });
      setActiveClockRecord(null);
      await fetchAttendanceData();
      alert('Clocked out successfully!');
    } catch (err) {
      console.error('Failed to clock out:', err);
      alert('Failed to clock out. Please try again.');
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Time off handlers
  const fetchTimeoffData = async () => {
    if (!employee) return;

    setLoadingTimeoff(true);
    try {
      const requests = await timeoffService.getEmployeeRequests(employee.id);
      setTimeoffRequests(requests);
    } catch (err) {
      console.error('Failed to fetch timeoff data:', err);
    } finally {
      setLoadingTimeoff(false);
    }
  };

  const handleSubmitTimeoff = async () => {
    if (!employee) return;

    if (!timeoffFormData.startDate || !timeoffFormData.endDate || !timeoffFormData.reason) {
      alert('Please fill in all fields');
      return;
    }

    setLoadingTimeoff(true);
    try {
      await timeoffService.createRequest({
        employeeId: employee.id,
        startDate: timeoffFormData.startDate,
        endDate: timeoffFormData.endDate,
        reason: timeoffFormData.reason,
      });

      setShowTimeoffForm(false);
      setTimeoffFormData({ startDate: "", endDate: "", reason: "" });
      await fetchTimeoffData();
      alert('Time off request submitted successfully!');
    } catch (err) {
      console.error('Failed to submit timeoff request:', err);
      alert('Failed to submit request. Please try again.');
    } finally {
      setLoadingTimeoff(false);
    }
  };

  const handleCancelTimeoff = async (requestId: string) => {
    setLoadingTimeoff(true);
    try {
      await timeoffService.cancelRequest(requestId);
      await fetchTimeoffData();
      alert('Time off request cancelled successfully!');
    } catch (err) {
      console.error('Failed to cancel timeoff request:', err);
      alert('Failed to cancel request. Please try again.');
    } finally {
      setLoadingTimeoff(false);
    }
  };

  // Sales handlers
  const fetchSalesData = async () => {
    if (!employee) return;

    setLoadingSales(true);
    try {
      const [records, metrics] = await Promise.all([
        salesService.getEmployeeSales(employee.id),
        salesService.getPerformanceMetrics(employee.id),
      ]);

      setSalesRecords(records);
      setSalesMetrics(metrics);
    } catch (err) {
      console.error('Failed to fetch sales data:', err);
    } finally {
      setLoadingSales(false);
    }
  };

  const handleSubmitSale = async () => {
    if (!employee) return;

    if (!salesFormData.amount) {
      alert('Please enter a sale amount');
      return;
    }

    setLoadingSales(true);
    try {
      await salesService.createSale({
        employeeId: employee.id,
        amount: parseFloat(salesFormData.amount),
        category: salesFormData.category || undefined,
        notes: salesFormData.notes || undefined,
      });

      setShowSalesForm(false);
      setSalesFormData({ amount: "", category: "", notes: "" });
      await fetchSalesData();
      alert('Sale recorded successfully!');
    } catch (err) {
      console.error('Failed to record sale:', err);
      alert('Failed to record sale. Please try again.');
    } finally {
      setLoadingSales(false);
    }
  };

  // For demo purposes, we'll fetch the first employee
  // In a real app, this would be based on the logged-in user's ID
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        setLoading(true);
        const employees = await employeeService.getAllEmployees();
        if (employees.length > 0) {
          const emp = employees[0];
          setEmployee(emp);
          // Convert backend availability to UI format
          setAvailability(backendToUIAvailability(emp.availability));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load employee data"));
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, []);

  // Fetch additional data when employee is loaded
  useEffect(() => {
    if (employee) {
      fetchAttendanceData();
      fetchTimeoffData();
      fetchSalesData();
    }
  }, [employee]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-neutral-600">Loading employee data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !employee) {
    return (
      <Alert className="border-red-300 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription>
          <p className="text-red-900">Failed to load employee data</p>
          <p className="text-sm text-red-700 mt-1">{error?.message || "No employee found"}</p>
        </AlertDescription>
      </Alert>
    );
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Employee Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {getInitials(employee.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-neutral-900">{employee.fullName}</h2>
              <p className="text-neutral-500">
                ${employee.normalPayRate}/hr • Employee ID: {employee.id}
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-xs text-neutral-500">This Week</p>
                <p className="text-neutral-900">32 hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-xs text-neutral-500">Next Shift</p>
                <p className="text-neutral-900">Mon 2pm</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-xs text-neutral-500">Pending</p>
                <p className="text-neutral-900">1 request</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="schedule">My Schedule</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="swaps">Shift Swaps</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>

        {/* My Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Your schedule for next week has been published
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Week of Jan 20-26, 2025</CardTitle>
                  <CardDescription>Your upcoming shifts</CardDescription>
                </div>
                <Button variant="outline" size="sm">Export</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mySchedule.map((shift) => (
                  <div
                    key={shift.day}
                    className="border border-neutral-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm">{shift.day}, {shift.date}</p>
                          <Badge variant="outline" className="text-xs">
                            {shift.hours}h
                          </Badge>
                        </div>
                        <p className="text-neutral-500 text-sm">{shift.shift}</p>
                        <p className="text-neutral-500 text-xs">{shift.location}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Request Swap</Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Days off */}
                <div className="border border-dashed border-neutral-200 rounded-lg p-4 bg-neutral-50">
                  <p className="text-sm text-neutral-500">Tuesday, Jan 21 - Day Off</p>
                </div>
                <div className="border border-dashed border-neutral-200 rounded-lg p-4 bg-neutral-50">
                  <p className="text-sm text-neutral-500">Thursday, Jan 23 - Day Off</p>
                </div>
                <div className="border border-dashed border-neutral-200 rounded-lg p-4 bg-neutral-50">
                  <p className="text-sm text-neutral-500">Sunday, Jan 26 - Day Off</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-200">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Total Hours This Week</span>
                  <span>32 hours</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          {/* Clock In/Out Card */}
          <Card>
            <CardHeader>
              <CardTitle>Clock In/Out</CardTitle>
              <CardDescription>Track your work hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeClockRecord ? (
                  <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <p className="font-medium text-green-900">Currently Clocked In</p>
                        </div>
                        <p className="text-sm text-green-700">
                          Clock in time: {new Date(activeClockRecord.clockInTime).toLocaleString()}
                        </p>
                        {activeClockRecord.notes && (
                          <p className="text-sm text-green-700 mt-1">
                            Notes: {activeClockRecord.notes}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={handleClockOut}
                        disabled={loadingAttendance}
                        variant="outline"
                        className="gap-2 border-green-600 text-green-700 hover:bg-green-100"
                      >
                        {loadingAttendance ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4" />
                        )}
                        Clock Out
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-neutral-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900 mb-1">Not Clocked In</p>
                        <p className="text-sm text-neutral-500">
                          Click the button to start tracking your work hours
                        </p>
                      </div>
                      <Button
                        onClick={handleClockIn}
                        disabled={loadingAttendance}
                        className="gap-2"
                      >
                        {loadingAttendance ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogIn className="w-4 h-4" />
                        )}
                        Clock In
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Statistics */}
          {attendanceStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-neutral-500">Total Hours Worked</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      {attendanceStats.totalHoursWorked.toFixed(1)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Attendance Rate</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      {attendanceStats.attendanceRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Avg Hours/Day</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      {attendanceStats.averageHoursPerDay.toFixed(1)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Days Worked</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      {attendanceStats.totalDaysWorked} / {attendanceStats.totalDaysScheduled}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Clock Records */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Clock Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clockRecords.slice(0, 10).map((record) => (
                  <div
                    key={record.id}
                    className="border border-neutral-200 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-neutral-500" />
                          <p className="text-sm font-medium text-neutral-900">
                            {new Date(record.clockInTime).toLocaleDateString()}
                          </p>
                          {record.durationHours && (
                            <Badge variant="outline" className="text-xs">
                              {record.durationHours.toFixed(1)}h
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500">
                          In: {new Date(record.clockInTime).toLocaleTimeString()}
                          {record.clockOutTime && (
                            <> • Out: {new Date(record.clockOutTime).toLocaleTimeString()}</>
                          )}
                        </p>
                        {record.notes && (
                          <p className="text-xs text-neutral-500 mt-1">{record.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {clockRecords.length === 0 && (
                  <div className="text-center py-8 text-neutral-500">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No clock records yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="timeoff" className="space-y-4">
          {/* Request Form */}
          {showTimeoffForm && (
            <Card className="border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">New Time Off Request</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTimeoffForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={timeoffFormData.startDate}
                        onChange={(e) =>
                          setTimeoffFormData({ ...timeoffFormData, startDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={timeoffFormData.endDate}
                        onChange={(e) =>
                          setTimeoffFormData({ ...timeoffFormData, endDate: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Textarea
                      id="reason"
                      value={timeoffFormData.reason}
                      onChange={(e) =>
                        setTimeoffFormData({ ...timeoffFormData, reason: e.target.value })
                      }
                      placeholder="e.g., Vacation, Personal, Family emergency..."
                    />
                  </div>
                  <Button
                    onClick={handleSubmitTimeoff}
                    disabled={loadingTimeoff}
                    className="w-full"
                  >
                    {loadingTimeoff ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Time Off Requests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Time Off Requests</CardTitle>
                <Button
                  className="gap-2"
                  onClick={() => setShowTimeoffForm(true)}
                  disabled={showTimeoffForm}
                >
                  <Calendar className="w-4 h-4" />
                  Request Time Off
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTimeoff && timeoffRequests.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {timeoffRequests.map((request) => {
                    const statusColors = {
                      PENDING: "text-amber-700 bg-amber-50 border-amber-300",
                      APPROVED: "text-green-700 bg-green-50 border-green-300",
                      DENIED: "text-red-700 bg-red-50 border-red-300",
                      CANCELLED: "text-neutral-700 bg-neutral-50 border-neutral-300",
                    };

                    return (
                      <div
                        key={request.id}
                        className="border border-neutral-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-neutral-900">
                                {request.startDate} to {request.endDate}
                              </p>
                              <Badge
                                variant="outline"
                                className={statusColors[request.status]}
                              >
                                {request.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {request.totalDays} days
                              </Badge>
                            </div>
                            <p className="text-neutral-500 text-sm">{request.reason}</p>
                            {request.reviewerNotes && (
                              <p className="text-xs text-neutral-500 mt-2">
                                <span className="font-medium">Review notes:</span> {request.reviewerNotes}
                              </p>
                            )}
                            {request.reviewedAt && (
                              <p className="text-xs text-neutral-500 mt-1">
                                Reviewed: {new Date(request.reviewedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          {request.status === "PENDING" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelTimeoff(request.id)}
                              disabled={loadingTimeoff}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {timeoffRequests.length === 0 && !loadingTimeoff && (
                    <div className="text-center py-8 text-neutral-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No time off requests</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shift Swaps Tab */}
        <TabsContent value="swaps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incoming Swap Requests</CardTitle>
              <CardDescription>Other employees want to swap with you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {swapRequests.map((request, idx) => (
                  <div
                    key={idx}
                    className="border border-neutral-200 rounded-lg p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-purple-100 text-purple-700">
                            {request.from.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm">{request.from}</p>
                          <p className="text-neutral-500 text-sm">{request.shift}</p>
                          <Badge
                            variant="outline"
                            className={
                              request.status === "approved"
                                ? "text-green-700 bg-green-50 border-green-300 mt-1"
                                : "text-amber-700 bg-amber-50 border-amber-300 mt-1"
                            }
                          >
                            {request.status}
                          </Badge>
                        </div>
                      </div>
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Decline</Button>
                          <Button size="sm">Accept</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Swap Requests</CardTitle>
              <CardDescription>Shifts you want to swap</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-neutral-500">
                <ArrowLeftRight className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No active swap requests</p>
                <Button variant="outline" size="sm" className="mt-3">
                  Request Swap
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          {/* Record Sale Form */}
          {showSalesForm && (
            <Card className="border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Record New Sale</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSalesForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Sale Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={salesFormData.amount}
                      onChange={(e) =>
                        setSalesFormData({ ...salesFormData, amount: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category (Optional)</Label>
                    <Input
                      id="category"
                      type="text"
                      value={salesFormData.category}
                      onChange={(e) =>
                        setSalesFormData({ ...salesFormData, category: e.target.value })
                      }
                      placeholder="e.g., Retail, Service, Food..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={salesFormData.notes}
                      onChange={(e) =>
                        setSalesFormData({ ...salesFormData, notes: e.target.value })
                      }
                      placeholder="Additional details about this sale..."
                    />
                  </div>
                  <Button
                    onClick={handleSubmitSale}
                    disabled={loadingSales}
                    className="w-full"
                  >
                    {loadingSales ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Recording...
                      </>
                    ) : (
                      "Record Sale"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics */}
          {salesMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-neutral-500">Total Sales</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      ${salesMetrics.totalSalesAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Transactions</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      {salesMetrics.totalTransactions}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Avg Sale</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      ${salesMetrics.averageSaleAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Sales/Hour</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      ${salesMetrics.salesPerHour.toFixed(2)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-neutral-500">Performance Rate</p>
                      <p className="text-sm font-semibold text-neutral-900">
                        {salesMetrics.performanceRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          salesMetrics.performanceRate >= 100
                            ? "bg-green-500"
                            : salesMetrics.performanceRate >= 75
                            ? "bg-blue-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(salesMetrics.performanceRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sales Records */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sales Records</CardTitle>
                <Button
                  className="gap-2"
                  onClick={() => setShowSalesForm(true)}
                  disabled={showSalesForm}
                >
                  <DollarSign className="w-4 h-4" />
                  Record Sale
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSales && salesRecords.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {salesRecords.slice(0, 20).map((record) => (
                    <div
                      key={record.id}
                      className="border border-neutral-200 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <p className="text-sm font-semibold text-neutral-900">
                              ${record.amount.toFixed(2)}
                            </p>
                            {record.category && (
                              <Badge variant="outline" className="text-xs">
                                {record.category}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500">
                            {new Date(record.timestamp).toLocaleString()}
                          </p>
                          {record.notes && (
                            <p className="text-xs text-neutral-500 mt-1">{record.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {salesRecords.length === 0 && !loadingSales && (
                    <div className="text-center py-8 text-neutral-500">
                      <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No sales recorded yet</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability" className="space-y-4">
          <Card>
              <CardHeader>
                  <div className="flex items-center justify-between">
                      <div>
                          <CardTitle>My Availability</CardTitle>
                          <CardDescription>Click hours to toggle availability</CardDescription>
                      </div>
                      <Button
                          onClick={handleSaveAvailability}
                          disabled={saving}
                      >
                          {saving ? (
                              <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  Saving...
                              </>
                          ) : (
                              'Save Changes'
                          )}
                      </Button>
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                      {/* Hour labels */}
                      <div className="flex gap-1 ml-24 overflow-x-auto pb-2 scroll-smooth">
                          {hours.map(hour => (
                              <div key={hour} className="flex-shrink-0 w-16 text-center">
                                  <span className="text-xs text-neutral-500">{formatHour(hour)}</span>
                              </div>
                          ))}
                      </div>

                      {/* Days with hour blocks */}
                      {daysOfWeek.map((day) => {
                          const dayHours = availability[day] || [];
                          const hasAvailability = dayHours.length > 0;

                          return (
                              <div key={day} className="flex items-center gap-2">
                                  <div className="w-20 flex-shrink-0">
                                      <span className="text-sm">{day.slice(0, 3)}</span>
                                  </div>
                                  <div className="flex gap-1 overflow-x-auto flex-1 scroll-smooth">
                                      {hours.map(hour => {
                                          const isAvailable = dayHours.includes(hour);
                                          return (
                                              <button
                                                  key={hour}
                                                  onClick={() => toggleHour(day, hour)}
                                                  className={`flex-shrink-0 w-16 h-10 rounded text-xs transition-all border ${
                                                      isAvailable
                                                          ? 'bg-green-500 border-green-600 text-white hover:bg-green-600'
                                                          : 'bg-neutral-100 border-neutral-200 text-neutral-400 hover:bg-neutral-200 hover:border-neutral-300'
                                                  }`}
                                                  title={`${day} ${formatHour(hour)}`}
                                              >
                                                  {formatHour(hour).replace(/[apm]/g, '')}
                                              </button>
                                          );
                                      })}
                                  </div>
                                  <div className="w-16 flex-shrink-0 text-right">
                                      {hasAvailability && (
                                          <span className="text-xs text-neutral-500">{dayHours.length}h</span>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  {/* Helper text */}
                  <div className="mt-4 pt-4 border-t border-neutral-200">
                      <p className="text-xs text-neutral-500">
                          💡 Tip: Click and drag across hours to quickly select multiple time slots
                      </p>
                  </div>
              </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scheduling Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Maximum hours per week</p>
                  <p className="text-xs text-neutral-500">Currently: 40 hours</p>
                </div>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Preferred shifts</p>
                  <p className="text-xs text-neutral-500">Evening shifts preferred</p>
                </div>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
