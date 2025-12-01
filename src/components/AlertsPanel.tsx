import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Bell, AlertTriangle, Clock, UserX, Users, CheckCircle2, X } from "lucide-react";
import { COLORS } from '../styles/theme';

const activeAlerts = [
  {
    id: 1,
    type: "absence",
    priority: "high",
    title: "John Smith called in sick",
    description: "Tuesday 2pm-10pm shift now uncovered",
    time: "5 minutes ago",
    employee: "John Smith",
  },
  {
    id: 2,
    type: "understaffed",
    priority: "high",
    title: "Friday evening understaffed",
    description: "Need 2 more servers for dinner rush",
    time: "1 hour ago",
  },
  {
    id: 3,
    type: "overtime",
    priority: "medium",
    title: "Emma Davis approaching overtime",
    description: "Currently at 38 hours this week",
    time: "2 hours ago",
    employee: "Emma Davis",
  },
  {
    id: 4,
    type: "forecast",
    priority: "medium",
    title: "Sales forecast updated",
    description: "Saturday lunch demand increased by 15%",
    time: "3 hours ago",
  },
];

const recentChanges = [
  {
    id: 1,
    action: "Shift added",
    employee: "Sarah Johnson",
    shift: "Wed 6am-2pm",
    time: "10 minutes ago",
    user: "Manager Lisa",
  },
  {
    id: 2,
    action: "Swap approved",
    employee: "Mike Chen",
    shift: "Thu 2pm-10pm → Fri 10am-6pm",
    time: "25 minutes ago",
    user: "Manager Lisa",
  },
  {
    id: 3,
    action: "Schedule published",
    employee: "All staff",
    shift: "Week of Jan 27",
    time: "2 hours ago",
    user: "Manager Lisa",
  },
];

export function AlertsPanel() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-neutral-900">Alerts & Updates</h2>
          <p className="text-neutral-500">Real-time notifications and schedule changes</p>
        </div>
        <Button variant="outline" className="gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Mark All Read
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full" style={{ backgroundColor: COLORS.status.error.light }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#dc2626' }} />
              </div>
              <div>
                <p className="text-xs text-neutral-500">Critical</p>
                <p className="text-neutral-900">2</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full" style={{ backgroundColor: COLORS.status.amber.light }}>
                <Clock className="w-5 h-5" style={{ color: '#d97706' }} />
              </div>
              <div>
                <p className="text-xs text-neutral-500">Pending</p>
                <p className="text-neutral-900">5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full" style={{ backgroundColor: COLORS.status.info.light }}>
                <Bell className="w-5 h-5" style={{ color: COLORS.primary[600] }} />
              </div>
              <div>
                <p className="text-xs text-neutral-500">Today</p>
                <p className="text-neutral-900">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full" style={{ backgroundColor: COLORS.status.success.light }}>
                <CheckCircle2 className="w-5 h-5" style={{ color: '#16a34a' }} />
              </div>
              <div>
                <p className="text-xs text-neutral-500">Resolved</p>
                <p className="text-neutral-900">8</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Alerts</TabsTrigger>
          <TabsTrigger value="history">Change History</TabsTrigger>
          <TabsTrigger value="settings">Notification Settings</TabsTrigger>
        </TabsList>

        {/* Active Alerts Tab */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Requires Immediate Action</CardTitle>
              <CardDescription>Critical alerts that need your attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeAlerts
                .filter((alert) => alert.priority === "high")
                .map((alert) => (
                  <Alert key={alert.id} style={{ borderColor: COLORS.status.error.border, backgroundColor: COLORS.status.error.background }}>
                    <AlertTriangle className="h-4 w-4" style={{ color: '#dc2626' }} />
                    <AlertDescription>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p style={{ color: COLORS.status.error.text }}>{alert.title}</p>
                              <p className="text-sm mt-1" style={{ color: COLORS.status.error.text }}>{alert.description}</p>
                              <p className="text-xs mt-1" style={{ color: '#dc2626' }}>{alert.time}</p>
                            </div>
                            <Button variant="ghost" size="sm">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {alert.type === "absence" && (
                            <>
                              <Button size="sm" variant="outline">Find Replacement</Button>
                              <Button size="sm">Auto-Fill</Button>
                            </>
                          )}
                          {alert.type === "understaffed" && (
                            <>
                              <Button size="sm" variant="outline">View Schedule</Button>
                              <Button size="sm">Add Staff</Button>
                            </>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Other Alerts</CardTitle>
              <CardDescription>Additional notifications and updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeAlerts
                .filter((alert) => alert.priority === "medium")
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="border border-neutral-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.status.amber.light }}>
                        {alert.type === "overtime" && <Clock className="w-4 h-4" style={{ color: '#d97706' }} />}
                        {alert.type === "forecast" && <Bell className="w-4 h-4" style={{ color: COLORS.primary[600] }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm">{alert.title}</p>
                          <Button variant="ghost" size="sm">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-neutral-500">{alert.description}</p>
                        <p className="text-xs text-neutral-400 mt-1">{alert.time}</p>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline">Review</Button>
                          <Button size="sm" variant="ghost">Dismiss</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="justify-start gap-2">
                <Users className="w-4 h-4" />
                Find Available Staff
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <UserX className="w-4 h-4" />
                Call List
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <Bell className="w-4 h-4" />
                Send Notification
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <Clock className="w-4 h-4" />
                Adjust Schedule
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Schedule Changes</CardTitle>
              <CardDescription>Track all modifications to the schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentChanges.map((change) => (
                <div
                  key={change.id}
                  className="flex items-start gap-3 pb-3 border-b border-neutral-100 last:border-0"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs" style={{ backgroundColor: COLORS.status.purple.light, color: COLORS.status.purple.text }}>
                      {change.user.split(" ")[1][0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm">
                          <span className="text-neutral-900">{change.action}</span>
                          <span className="text-neutral-500"> • {change.employee}</span>
                        </p>
                        <p className="text-sm text-neutral-500">{change.shift}</p>
                        <p className="text-xs text-neutral-400 mt-1">
                          {change.time} • by {change.user}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {change.action.split(" ")[0]}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filter History</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="outline" className="cursor-pointer hover:bg-neutral-100">
                All Changes
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-neutral-100">
                Shifts Added
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-neutral-100">
                Shifts Removed
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-neutral-100">
                Swaps
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-neutral-100">
                Time Off
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Preferences</CardTitle>
              <CardDescription>Choose which notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Employee Call-Ins</p>
                  <p className="text-xs text-neutral-500">When staff reports absence</p>
                </div>
                <Badge variant="outline" style={{ color: COLORS.status.error.text, backgroundColor: COLORS.status.error.background }}>Critical</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Understaffing Alerts</p>
                  <p className="text-xs text-neutral-500">Shifts below minimum coverage</p>
                </div>
                <Badge variant="outline" style={{ color: COLORS.status.error.text, backgroundColor: COLORS.status.error.background }}>Critical</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Overtime Warnings</p>
                  <p className="text-xs text-neutral-500">Employees approaching limits</p>
                </div>
                <Badge variant="outline" style={{ color: COLORS.status.amber.text, backgroundColor: COLORS.status.amber.background }}>High</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Swap Requests</p>
                  <p className="text-xs text-neutral-500">Employee shift change requests</p>
                </div>
                <Badge variant="outline" style={{ color: COLORS.status.info.text, backgroundColor: COLORS.status.info.background }}>Medium</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Forecast Changes</p>
                  <p className="text-xs text-neutral-500">Sales projection updates</p>
                </div>
                <Badge variant="outline" style={{ color: COLORS.neutral[700], backgroundColor: COLORS.neutral[50] }}>Low</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">In-App Notifications</p>
                  <p className="text-xs text-neutral-500">Receive alerts in the application</p>
                </div>
                <Badge variant="outline" style={{ color: COLORS.status.success.text, backgroundColor: COLORS.status.success.background }}>Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Email Notifications</p>
                  <p className="text-xs text-neutral-500">manager@restaurant.com</p>
                </div>
                <Badge variant="outline" style={{ color: COLORS.status.success.text, backgroundColor: COLORS.status.success.background }}>Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">SMS Alerts</p>
                  <p className="text-xs text-neutral-500">Critical alerts only</p>
                </div>
                <Badge variant="outline" className="text-neutral-500">Inactive</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
