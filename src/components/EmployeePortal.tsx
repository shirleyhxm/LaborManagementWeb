import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Calendar, Clock, User, ArrowLeftRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

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

export function EmployeePortal() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Employee Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-blue-100 text-blue-700">SJ</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-neutral-900">Sarah Johnson</h2>
              <p className="text-neutral-500">Server • Employee ID: 1024</p>
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
                  <CardDescription>Set your preferred working hours</CardDescription>
                </div>
                <Button>Update</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                  <div key={day} className="flex items-center justify-between py-2 border-b border-neutral-100">
                    <span className="text-sm">{day}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-neutral-500">6am - 10pm</span>
                      <Badge variant="outline" className="text-green-700 bg-green-50">
                        Available
                      </Badge>
                    </div>
                  </div>
                ))}
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
