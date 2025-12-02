import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { DollarSign, Clock, Users, Shield, AlertCircle, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const employeeRules = [
  { id: 1, name: "Sarah Johnson", minHours: 20, maxHours: 40, contractedHours: 32 },
  { id: 2, name: "Mike Chen", minHours: 15, maxHours: 30, contractedHours: 25 },
  { id: 3, name: "Emma Davis", minHours: 32, maxHours: 40, contractedHours: 40 },
];

export function ConstraintsEditor() {
  const [laborBudget, setLaborBudget] = useState("15000");
  const [maxOvertimeHours, setMaxOvertimeHours] = useState("10");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-neutral-900">Constraints & Rules</h2>
          <p className="text-neutral-500">Configure scheduling requirements and priorities</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Rule
        </Button>
      </div>

      <Tabs defaultValue="budget" className="space-y-4">
        <TabsList>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="priorities">Priorities</TabsTrigger>
        </TabsList>

        {/* Budget Constraints */}
        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Labor Cost Budget
              </CardTitle>
              <CardDescription>Set maximum labor cost limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="weekly-budget">Weekly Budget</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">$</span>
                    <Input
                      id="weekly-budget"
                      type="number"
                      value={laborBudget}
                      onChange={(e) => setLaborBudget(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-neutral-500">Current projected: $12,450</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly-budget">Monthly Budget</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">$</span>
                    <Input
                      id="monthly-budget"
                      type="number"
                      defaultValue="60000"
                    />
                  </div>
                  <p className="text-xs text-neutral-500">Current projected: $49,800</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Hard Budget Limit</p>
                  <p className="text-xs text-neutral-500">Schedule cannot exceed budget</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Budget Warning at</p>
                  <p className="text-xs text-neutral-500">Alert when approaching limit</p>
                </div>
                <Select defaultValue="90">
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80">80%</SelectItem>
                    <SelectItem value="90">90%</SelectItem>
                    <SelectItem value="95">95%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hourly Rate Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm">Base Rate (Server)</p>
                    <p className="text-xs text-neutral-500">Standard hourly wage</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">$</span>
                    <Input type="number" defaultValue="15" className="w-20" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm">Overtime Multiplier</p>
                    <p className="text-xs text-neutral-500">Rate for hours over 40/week</p>
                  </div>
                  <Input type="number" defaultValue="1.5" step="0.1" className="w-20" />
                </div>

                <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm">Weekend Premium</p>
                    <p className="text-xs text-neutral-500">Additional rate for Sat-Sun</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">+$</span>
                    <Input type="number" defaultValue="2" className="w-20" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hours Constraints */}
        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Working Hours Rules
              </CardTitle>
              <CardDescription>Set limits on employee working hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max-hours">Max Hours per Week</Label>
                  <Input
                    id="max-hours"
                    type="number"
                    defaultValue="40"
                  />
                  <p className="text-xs text-neutral-500">Default for all employees</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-overtime">Max Overtime Hours</Label>
                  <Input
                    id="max-overtime"
                    type="number"
                    value={maxOvertimeHours}
                    onChange={(e) => setMaxOvertimeHours(e.target.value)}
                  />
                  <p className="text-xs text-neutral-500">Per employee per week</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                  <div>
                    <p className="text-sm">Minimum Rest Between Shifts</p>
                    <p className="text-xs text-neutral-500">Time required between shifts</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue="8" className="w-20" />
                    <span className="text-sm text-neutral-500">hours</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                  <div>
                    <p className="text-sm">Max Consecutive Days</p>
                    <p className="text-xs text-neutral-500">Without a day off</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue="6" className="w-20" />
                    <span className="text-sm text-neutral-500">days</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                  <div>
                    <p className="text-sm">Max Shift Length</p>
                    <p className="text-xs text-neutral-500">Maximum hours per shift</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue="12" className="w-20" />
                    <span className="text-sm text-neutral-500">hours</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employee Contracted Hours</CardTitle>
              <CardDescription>Minimum hours guaranteed per employee</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {employeeRules.map((emp) => (
                  <Accordion key={emp.id} type="single" collapsible>
                    <AccordionItem value={`emp-${emp.id}`} className="border border-neutral-200 rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between flex-1 pr-4">
                          <span className="text-sm">{emp.name}</span>
                          <Badge variant="outline">{emp.contractedHours}h/week</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-3 pb-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <Label className="text-xs">Min Hours</Label>
                            <Input type="number" defaultValue={emp.minHours} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">Contracted Hours</Label>
                            <Input type="number" defaultValue={emp.contractedHours} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">Max Hours</Label>
                            <Input type="number" defaultValue={emp.maxHours} className="mt-1" />
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="w-full">
                          Save Changes
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Rules */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Labor Law Compliance
              </CardTitle>
              <CardDescription>Legal requirements and regulations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">FLSA Overtime Rules</p>
                  <p className="text-xs text-neutral-500">1.5x pay over 40 hours/week</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Meal Break Requirements</p>
                  <p className="text-xs text-neutral-500">30 min break for 6+ hour shifts</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Minor Labor Laws</p>
                  <p className="text-xs text-neutral-500">Restrictions for employees under 18</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Advance Notice Period</p>
                  <p className="text-xs text-neutral-500">Schedule posted days in advance</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input type="number" defaultValue="7" className="w-20" />
                  <span className="text-sm text-neutral-500">days</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Compliance Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="border border-neutral-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm">California Split Shift Rule</p>
                      <p className="text-xs text-neutral-500">Premium pay for split shifts over 1 hour apart</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-xs text-neutral-500">Active</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Add Custom Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Priority Rules */}
        <TabsContent value="priorities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Scheduling Priorities
              </CardTitle>
              <CardDescription>Order of importance when optimizing schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg bg-blue-50">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Meet Contracted Hours</p>
                    <p className="text-xs text-neutral-500">Highest priority</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-neutral-200 text-neutral-700 rounded">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Respect Employee Availability</p>
                    <p className="text-xs text-neutral-500">High priority</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-neutral-200 text-neutral-700 rounded">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Match Sales Forecast</p>
                    <p className="text-xs text-neutral-500">Medium priority</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-neutral-200 text-neutral-700 rounded">
                    4
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Minimize Labor Cost</p>
                    <p className="text-xs text-neutral-500">Medium priority</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-neutral-200 text-neutral-700 rounded">
                    5
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Distribute Hours Fairly</p>
                    <p className="text-xs text-neutral-500">Low priority</p>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-4">
                Reorder Priorities
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fairness Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Rotate Weekend Shifts</p>
                  <p className="text-xs text-neutral-500">Distribute weekend work evenly</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Balance Desirable Shifts</p>
                  <p className="text-xs text-neutral-500">Fair distribution of preferred times</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Seniority Preference</p>
                  <p className="text-xs text-neutral-500">Priority for longer-tenured employees</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Actions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900">Unsaved changes</p>
                <p className="text-xs text-blue-700">Save your constraint updates to apply them to scheduling</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Discard</Button>
              <Button>Save Changes</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
