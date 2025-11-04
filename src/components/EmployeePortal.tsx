import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Calendar, Clock, User, ArrowLeftRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { employeeService } from "../services/employeeService";
import type { Employee } from "../types/employee";

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

const timeOffRequests = [
  { dates: "Feb 14-16", reason: "Personal", status: "approved" },
  { dates: "Mar 1-3", reason: "Vacation", status: "pending" },
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">My Schedule</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off</TabsTrigger>
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

        {/* Time Off Tab */}
        <TabsContent value="timeoff" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Time Off Requests</CardTitle>
                <Button className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Request Time Off
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeOffRequests.map((request, idx) => (
                  <div
                    key={idx}
                    className="border border-neutral-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm">{request.dates}</p>
                          <Badge
                            variant="outline"
                            className={
                              request.status === "approved"
                                ? "text-green-700 bg-green-50 border-green-300"
                                : "text-amber-700 bg-amber-50 border-amber-300"
                            }
                          >
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-neutral-500 text-sm">{request.reason}</p>
                      </div>
                      {request.status === "pending" && (
                        <Button variant="ghost" size="sm">Cancel</Button>
                      )}
                    </div>
                  </div>
                ))}

                {timeOffRequests.length === 0 && (
                  <div className="text-center py-8 text-neutral-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No time off requests</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available PTO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Vacation Days</span>
                    <span>8 of 15 remaining</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: "53%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Sick Days</span>
                    <span>5 of 5 remaining</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-full"></div>
                  </div>
                </div>
              </div>
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
