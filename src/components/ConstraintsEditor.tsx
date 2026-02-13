import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { DollarSign, Clock, Users, Shield, AlertCircle, Plus, Trash2, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { constraintsService } from "../services/constraintsService";
import { employeeService } from "../services/employeeService";
import type {
  BudgetConstraints,
  WorkingHoursRules,
  ComplianceRules,
  CustomComplianceRule,
  SchedulingPriority,
  FairnessSettings,
  HourlyRateRule,
  EmployeeContractedHours,
} from "../types/constraints";
import type { Employee } from "../types/employee";

export function ConstraintsEditor() {
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentTab, setCurrentTab] = useState("budget");

  // Budget state
  const [budgetConstraints, setBudgetConstraints] = useState<BudgetConstraints | null>(null);
  const [hourlyRates, setHourlyRates] = useState<HourlyRateRule[]>([]);

  // Hours state
  const [workingHoursRules, setWorkingHoursRules] = useState<WorkingHoursRules | null>(null);
  const [contractedHours, setContractedHours] = useState<EmployeeContractedHours[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Compliance state
  const [complianceRules, setComplianceRules] = useState<ComplianceRules | null>(null);
  const [customComplianceRules, setCustomComplianceRules] = useState<CustomComplianceRule[]>([]);

  // Priorities and fairness state
  const [priorities, setPriorities] = useState<SchedulingPriority[]>([]);
  const [fairnessSettings, setFairnessSettings] = useState<FairnessSettings | null>(null);

  // Load all data on mount
  useEffect(() => {
    loadAllConstraints();
  }, []);

  const loadAllConstraints = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all constraints and employees in parallel
      const [
        allConstraints,
        employeesData,
      ] = await Promise.all([
        constraintsService.getAllConstraints(),
        employeeService.getAllEmployees(),
      ]);

      // Set budget data with defaults if null
      setBudgetConstraints(allConstraints.budget || {
        weeklyBudget: 15000,
        monthlyBudget: 60000,
        hardBudgetLimit: true,
        budgetWarningThreshold: 90,
        updatedAt: new Date().toISOString()
      });
      setHourlyRates(allConstraints.hourlyRates || []);

      // Set hours data with defaults if null
      setWorkingHoursRules(allConstraints.workingHours || {
        maxHoursPerWeek: 40,
        maxOvertimeHours: 10,
        minRestBetweenShifts: 8,
        maxConsecutiveDays: 6,
        maxShiftLength: 12,
        minShiftLength: 1,
        updatedAt: new Date().toISOString()
      });
      setContractedHours(allConstraints.contractedHours || []);
      setEmployees(employeesData);

      // Set compliance data with defaults if null
      setComplianceRules(allConstraints.compliance || {
        flsaOvertimeEnabled: true,
        mealBreakRequired: true,
        mealBreakMinShiftHours: 6,
        mealBreakDuration: 30,
        minorLaborLawsEnabled: true,
        advanceNoticePeriod: 7,
        updatedAt: new Date().toISOString()
      });
      setCustomComplianceRules(allConstraints.customCompliance || []);

      // Set priorities and fairness with defaults if null
      setPriorities(allConstraints.priorities || []);
      setFairnessSettings(allConstraints.fairness || {
        rotateWeekendShifts: true,
        balanceDesirableShifts: true,
        seniorityPreference: false,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("Failed to load constraints:", err);
      setError(err.message || "Failed to load constraints");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      setError(null);

      // Save all changed constraints
      await Promise.all([
        budgetConstraints && constraintsService.updateBudgetConstraints(budgetConstraints),
        workingHoursRules && constraintsService.updateWorkingHoursRules(workingHoursRules),
        complianceRules && constraintsService.updateComplianceRules(complianceRules),
        fairnessSettings && constraintsService.updateFairnessSettings(fairnessSettings),
      ]);

      setHasUnsavedChanges(false);
      await loadAllConstraints();
    } catch (err: any) {
      console.error("Failed to save constraints:", err);
      setError(err.message || "Failed to save constraints");
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false);
    loadAllConstraints();
  };

  if (loading && !budgetConstraints) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !budgetConstraints) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadAllConstraints}>Retry</Button>
        </div>
      </div>
    );
  }

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

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
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
                      value={budgetConstraints?.weeklyBudget ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setBudgetConstraints(prev => prev ? {
                          ...prev,
                          weeklyBudget: isNaN(value) ? 0 : value
                        } : null);
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500">Maximum weekly labor cost</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly-budget">Monthly Budget</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">$</span>
                    <Input
                      id="monthly-budget"
                      type="number"
                      value={budgetConstraints?.monthlyBudget ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setBudgetConstraints(prev => prev ? {
                          ...prev,
                          monthlyBudget: isNaN(value) ? 0 : value
                        } : null);
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500">Maximum monthly labor cost</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Hard Budget Limit</p>
                  <p className="text-xs text-neutral-500">Schedule cannot exceed budget</p>
                </div>
                <Switch
                  checked={budgetConstraints?.hardBudgetLimit ?? false}
                  onCheckedChange={(checked) => {
                    setBudgetConstraints(prev => prev ? {
                      ...prev,
                      hardBudgetLimit: checked
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Budget Warning at</p>
                  <p className="text-xs text-neutral-500">Alert when approaching limit</p>
                </div>
                <Select
                  value={budgetConstraints?.budgetWarningThreshold.toString() ?? "90"}
                  onValueChange={(value) => {
                    setBudgetConstraints(prev => prev ? {
                      ...prev,
                      budgetWarningThreshold: parseFloat(value)
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                >
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
                {hourlyRates.length > 0 ? (
                  hourlyRates.map((rate, index) => (
                    <div key={rate.roleId || `rate-${index}`}>
                      <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm">Base Rate {rate.roleId ? `(${rate.roleId})` : ''}</p>
                          <p className="text-xs text-neutral-500">Standard hourly wage</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500">$</span>
                          <Input
                            type="number"
                            value={rate.baseRate}
                            className="w-20"
                            disabled
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg mt-3">
                        <div className="flex-1">
                          <p className="text-sm">Overtime Multiplier</p>
                          <p className="text-xs text-neutral-500">Rate for hours over 40/week</p>
                        </div>
                        <Input
                          type="number"
                          value={rate.overtimeMultiplier}
                          step="0.1"
                          className="w-20"
                          disabled
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg mt-3">
                        <div className="flex-1">
                          <p className="text-sm">Weekend Premium</p>
                          <p className="text-xs text-neutral-500">Additional rate for Sat-Sun</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500">+$</span>
                          <Input
                            type="number"
                            value={rate.weekendPremium}
                            className="w-20"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-4">No hourly rate rules configured</p>
                )}
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
                    value={workingHoursRules?.maxHoursPerWeek ?? ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setWorkingHoursRules(prev => prev ? {
                        ...prev,
                        maxHoursPerWeek: isNaN(value) ? 0 : value
                      } : null);
                      setHasUnsavedChanges(true);
                    }}
                  />
                  <p className="text-xs text-neutral-500">Default for all employees</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-overtime">Max Overtime Hours</Label>
                  <Input
                    id="max-overtime"
                    type="number"
                    value={workingHoursRules?.maxOvertimeHours ?? ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setWorkingHoursRules(prev => prev ? {
                        ...prev,
                        maxOvertimeHours: isNaN(value) ? 0 : value
                      } : null);
                      setHasUnsavedChanges(true);
                    }}
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
                    <Input
                      type="number"
                      value={workingHoursRules?.minRestBetweenShifts ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setWorkingHoursRules(prev => prev ? {
                          ...prev,
                          minRestBetweenShifts: isNaN(value) ? 0 : value
                        } : null);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-20"
                    />
                    <span className="text-sm text-neutral-500">hours</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                  <div>
                    <p className="text-sm">Max Consecutive Days</p>
                    <p className="text-xs text-neutral-500">Without a day off</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={workingHoursRules?.maxConsecutiveDays ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setWorkingHoursRules(prev => prev ? {
                          ...prev,
                          maxConsecutiveDays: isNaN(value) ? 0 : value
                        } : null);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-20"
                    />
                    <span className="text-sm text-neutral-500">days</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                  <div>
                    <p className="text-sm">Max Shift Length</p>
                    <p className="text-xs text-neutral-500">Maximum hours per shift</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={workingHoursRules?.maxShiftLength ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setWorkingHoursRules(prev => prev ? {
                          ...prev,
                          maxShiftLength: isNaN(value) ? 0 : value
                        } : null);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-20"
                    />
                    <span className="text-sm text-neutral-500">hours</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                  <div>
                    <p className="text-sm">Min Shift Length</p>
                    <p className="text-xs text-neutral-500">Minimum hours per shift</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={workingHoursRules?.minShiftLength ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setWorkingHoursRules(prev => prev ? {
                          ...prev,
                          minShiftLength: isNaN(value) ? 0 : value
                        } : null);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-20"
                    />
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
                {employees.map((emp) => {
                  const empContractedHours = contractedHours.find(ch => ch.employeeId === emp.id);
                  return (
                    <Accordion key={emp.id} type="single" collapsible>
                      <AccordionItem value={`emp-${emp.id}`} className="border border-neutral-200 rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between flex-1 pr-4">
                            <span className="text-sm">{emp.fullName}</span>
                            <Badge variant="outline">
                              {empContractedHours?.contractedHours ?? emp.contract?.contractedHoursPerWeek ?? 0}h/week
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-3 pb-4 space-y-3">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <Label className="text-xs">Min Hours</Label>
                              <Input
                                type="number"
                                value={empContractedHours?.minHours ?? 0}
                                className="mt-1"
                                disabled
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Contracted Hours</Label>
                              <Input
                                type="number"
                                value={empContractedHours?.contractedHours ?? emp.contract?.contractedHoursPerWeek ?? 0}
                                className="mt-1"
                                disabled
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Max Hours</Label>
                              <Input
                                type="number"
                                value={empContractedHours?.maxHours ?? emp.contract?.maxHoursPerWeek ?? 40}
                                className="mt-1"
                                disabled
                              />
                            </div>
                          </div>
                          <p className="text-xs text-neutral-500">Note: Employee contracted hours are managed through the employee profile</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
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
                <Switch
                  checked={complianceRules?.flsaOvertimeEnabled ?? false}
                  onCheckedChange={(checked) => {
                    setComplianceRules(prev => prev ? {
                      ...prev,
                      flsaOvertimeEnabled: checked
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Meal Break Requirements</p>
                  <p className="text-xs text-neutral-500">
                    {complianceRules?.mealBreakDuration ?? 30} min break for {complianceRules?.mealBreakMinShiftHours ?? 6}+ hour shifts
                  </p>
                </div>
                <Switch
                  checked={complianceRules?.mealBreakRequired ?? false}
                  onCheckedChange={(checked) => {
                    setComplianceRules(prev => prev ? {
                      ...prev,
                      mealBreakRequired: checked
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Minor Labor Laws</p>
                  <p className="text-xs text-neutral-500">Restrictions for employees under 18</p>
                </div>
                <Switch
                  checked={complianceRules?.minorLaborLawsEnabled ?? false}
                  onCheckedChange={(checked) => {
                    setComplianceRules(prev => prev ? {
                      ...prev,
                      minorLaborLawsEnabled: checked
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Advance Notice Period</p>
                  <p className="text-xs text-neutral-500">Schedule posted days in advance</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={complianceRules?.advanceNoticePeriod ?? ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                      setComplianceRules(prev => prev ? {
                        ...prev,
                        advanceNoticePeriod: isNaN(value) ? 0 : value
                      } : null);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-20"
                  />
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
                {customComplianceRules.map((rule) => (
                  <div key={rule.name} className="border border-neutral-200 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm">{rule.name}</p>
                        <p className="text-xs text-neutral-500">{rule.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (confirm(`Delete rule "${rule.name}"?`)) {
                            try {
                              await constraintsService.deleteCustomComplianceRule(rule.name);
                              await loadAllConstraints();
                            } catch (err: any) {
                              setError(err.message || "Failed to delete rule");
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={async (checked) => {
                          try {
                            await constraintsService.updateCustomComplianceRule(rule.name, {
                              name: rule.name,
                              description: rule.description,
                              isActive: checked,
                              ruleType: rule.ruleType,
                              configuration: rule.configuration
                            });
                            await loadAllConstraints();
                          } catch (err: any) {
                            setError(err.message || "Failed to update rule");
                          }
                        }}
                      />
                      <span className="text-xs text-neutral-500">Active</span>
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full gap-2" disabled>
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
                {priorities
                  .sort((a, b) => a.priorityOrder - b.priorityOrder)
                  .map((priority, index) => (
                    <div
                      key={`${priority.priorityType}-${priority.priorityOrder}`}
                      className={`flex items-center gap-3 p-3 border border-neutral-200 rounded-lg ${
                        index === 0 ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded ${
                          index === 0
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        {priority.priorityOrder}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{priority.name}</p>
                        <p className="text-xs text-neutral-500">{priority.description}</p>
                      </div>
                    </div>
                  ))}
              </div>

              <Button variant="outline" className="w-full mt-4" disabled>
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
                <Switch
                  checked={fairnessSettings?.rotateWeekendShifts ?? false}
                  onCheckedChange={(checked) => {
                    setFairnessSettings(prev => prev ? {
                      ...prev,
                      rotateWeekendShifts: checked
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Balance Desirable Shifts</p>
                  <p className="text-xs text-neutral-500">Fair distribution of preferred times</p>
                </div>
                <Switch
                  checked={fairnessSettings?.balanceDesirableShifts ?? false}
                  onCheckedChange={(checked) => {
                    setFairnessSettings(prev => prev ? {
                      ...prev,
                      balanceDesirableShifts: checked
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm">Seniority Preference</p>
                  <p className="text-xs text-neutral-500">Priority for longer-tenured employees</p>
                </div>
                <Switch
                  checked={fairnessSettings?.seniorityPreference ?? false}
                  onCheckedChange={(checked) => {
                    setFairnessSettings(prev => prev ? {
                      ...prev,
                      seniorityPreference: checked
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Actions - Floating */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-50">
          <Card className="bg-blue-50 border-blue-200 shadow-lg pointer-events-auto max-w-4xl mx-4">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-start gap-3 flex-1">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-900">Unsaved changes</p>
                    <p className="text-xs text-blue-700">Save your constraint updates to apply them to scheduling</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" onClick={handleDiscardChanges} disabled={loading}>
                    Discard
                  </Button>
                  <Button onClick={handleSaveChanges} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm text-red-900">Error</p>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
