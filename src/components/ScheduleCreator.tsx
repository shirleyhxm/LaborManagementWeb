import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Calendar, Clock, Users, DollarSign, AlertTriangle, Sparkles, Save } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

const employees = [
  { id: 1, name: "Sarah Johnson", role: "Server", rate: 15 },
  { id: 2, name: "Mike Chen", role: "Server", rate: 15 },
  { id: 3, name: "Emma Davis", role: "Cook", rate: 18 },
  { id: 4, name: "John Smith", role: "Server", rate: 16 },
  { id: 5, name: "Lisa Brown", role: "Manager", rate: 22 },
];

const shifts = [
  { time: "6am-2pm", label: "Morning" },
  { time: "2pm-10pm", label: "Evening" },
  { time: "10pm-6am", label: "Night" },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ScheduleCreator() {
  const [selectedObjective, setSelectedObjective] = useState("minimize-cost");
  const [draggedEmployee, setDraggedEmployee] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Page Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-neutral-900">Schedule Creator</h2>
          <p className="text-neutral-500">Week of Jan 20-26, 2025</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Auto-Schedule
          </Button>
          <Button className="gap-2">
            <Save className="w-4 h-4" />
            Save & Publish
          </Button>
        </div>
      </div>

      {/* Optimization Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduling Objective</CardTitle>
          <CardDescription>Choose your optimization priority</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={selectedObjective} onValueChange={setSelectedObjective}>
              <SelectTrigger>
                <SelectValue placeholder="Select objective" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimize-cost">Minimize Labor Cost</SelectItem>
                <SelectItem value="maximize-sales">Maximize Sales Coverage</SelectItem>
                <SelectItem value="minimize-employees">Minimize # Employees</SelectItem>
                <SelectItem value="maximize-fairness">Maximize Fairness</SelectItem>
                <SelectItem value="balanced">Balanced Approach</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2">
              <DollarSign className="w-4 h-4 text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Est. Cost</p>
                <p className="text-sm">$3,240</p>
              </div>
            </div>

            <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2">
              <Users className="w-4 h-4 text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Coverage</p>
                <p className="text-sm">96%</p>
              </div>
            </div>

            <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2">
              <Clock className="w-4 h-4 text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Total Hours</p>
                <p className="text-sm">216h</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Employee List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Employees</CardTitle>
            <CardDescription className="text-xs">Drag to schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {employees.map((emp) => (
              <div
                key={emp.id}
                draggable
                onDragStart={() => setDraggedEmployee(emp.id)}
                onDragEnd={() => setDraggedEmployee(null)}
                className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg cursor-move hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <div>
                  <p className="text-sm">{emp.name}</p>
                  <p className="text-xs text-neutral-500">{emp.role}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  ${emp.rate}/hr
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Schedule Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Weekly Schedule</CardTitle>
              <Tabs defaultValue="grid">
                <TabsList className="h-8">
                  <TabsTrigger value="grid" className="text-xs">Grid</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Days Header */}
                <div className="grid grid-cols-8 gap-2 mb-2">
                  <div className="text-xs text-neutral-500"></div>
                  {days.map((day) => (
                    <div key={day} className="text-center">
                      <p className="text-sm">{day}</p>
                      <p className="text-xs text-neutral-500">Jan {20 + days.indexOf(day)}</p>
                    </div>
                  ))}
                </div>

                {/* Schedule Grid */}
                {shifts.map((shift) => (
                  <div key={shift.time} className="grid grid-cols-8 gap-2 mb-3">
                    <div className="flex flex-col justify-center">
                      <p className="text-sm">{shift.label}</p>
                      <p className="text-xs text-neutral-500">{shift.time}</p>
                    </div>
                    {days.map((day) => {
                      const hasConflict = day === "Tue" && shift.label === "Morning";
                      const isUnderstaffed = day === "Fri" && shift.label === "Evening";
                      const isOverstaffed = day === "Wed" && shift.label === "Morning";
                      
                      return (
                        <div
                          key={`${day}-${shift.time}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {}}
                          className={`min-h-[80px] border-2 border-dashed rounded-lg p-2 space-y-1 ${
                            hasConflict
                              ? "border-red-300 bg-red-50"
                              : isUnderstaffed
                              ? "border-amber-300 bg-amber-50"
                              : isOverstaffed
                              ? "border-blue-300 bg-blue-50"
                              : "border-neutral-200 bg-white hover:border-blue-400 hover:bg-blue-50"
                          } transition-colors`}
                        >
                          {/* Sample scheduled employees */}
                          {day === "Mon" && shift.label === "Morning" && (
                            <>
                              <div className="text-xs bg-green-100 border border-green-300 rounded px-2 py-1">
                                <p>Sarah J.</p>
                              </div>
                              <div className="text-xs bg-green-100 border border-green-300 rounded px-2 py-1">
                                <p>Mike C.</p>
                              </div>
                            </>
                          )}
                          {day === "Tue" && shift.label === "Morning" && (
                            <>
                              <div className="text-xs bg-red-100 border border-red-300 rounded px-2 py-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <p>John S.</p>
                              </div>
                              <p className="text-xs text-neutral-500">Need +1</p>
                            </>
                          )}
                          {day === "Wed" && shift.label === "Morning" && (
                            <>
                              <div className="text-xs bg-green-100 border border-green-300 rounded px-2 py-1">
                                <p>Emma D.</p>
                              </div>
                              <div className="text-xs bg-green-100 border border-green-300 rounded px-2 py-1">
                                <p>Lisa B.</p>
                              </div>
                              <div className="text-xs bg-green-100 border border-green-300 rounded px-2 py-1">
                                <p>Sarah J.</p>
                              </div>
                            </>
                          )}
                          {day === "Fri" && shift.label === "Evening" && (
                            <>
                              <div className="text-xs bg-green-100 border border-green-300 rounded px-2 py-1">
                                <p>Mike C.</p>
                              </div>
                              <p className="text-xs text-amber-600">Need +2</p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-neutral-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-green-300 bg-green-100 rounded"></div>
                <span className="text-xs text-neutral-600">Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-amber-300 bg-amber-50 rounded"></div>
                <span className="text-xs text-neutral-600">Understaffed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-300 bg-blue-50 rounded"></div>
                <span className="text-xs text-neutral-600">Overstaffed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-red-300 bg-red-50 rounded"></div>
                <span className="text-xs text-neutral-600">Conflict</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Conflicts Alert */}
      <Alert className="border-amber-300 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription>
          <p className="text-amber-900">3 scheduling conflicts detected</p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline">View Conflicts</Button>
            <Button size="sm">Auto-Resolve</Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
