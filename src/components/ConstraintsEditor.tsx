import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { DollarSign, Clock, Users, Shield, AlertCircle, Loader2, Landmark, Info, ChevronUp, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { constraintsService } from "../services/constraintsService";
import { employeeService } from "../services/employeeService";
import { useBusiness } from "../contexts/BusinessContext";
import type {
  BudgetConstraints,
  WorkingHoursRules,
  ComplianceRules,
  SchedulingPriority,
  FairnessSettings,
  HourlyRateRule,
  EmployeeContractedHours,
  PayrollCostRules,
} from "../types/constraints";
import type { Employee } from "../types/employee";

// Small "i" icon that reveals explanatory text on hover, so labels stay
// terse and the page doesn't drown in subtext.
function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// The backend has no default set - it only ever returns what was previously
// saved via a reorder, so a new business starts with an empty list. This is
// a reasonable starting order shown until a manager reorders and saves it.
const DEFAULT_PRIORITIES: SchedulingPriority[] = [
  { priorityOrder: 1, priorityType: 'contracted_hours', name: 'Contracted Hours', description: 'Meet each employee\'s guaranteed hours', isEnabled: true },
  { priorityOrder: 2, priorityType: 'availability', name: 'Availability', description: 'Respect employee availability windows', isEnabled: true },
  { priorityOrder: 3, priorityType: 'forecast', name: 'Forecast Coverage', description: 'Match staffing to projected demand', isEnabled: true },
  { priorityOrder: 4, priorityType: 'labor_cost', name: 'Labor Cost', description: 'Minimize total wage cost', isEnabled: true },
  { priorityOrder: 5, priorityType: 'fair_distribution', name: 'Fair Distribution', description: 'Distribute shifts evenly across employees', isEnabled: true },
];

export function ConstraintsEditor() {
  const { currentBusiness } = useBusiness();

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentTab, setCurrentTab] = useState("working-time");

  // Budget state
  const [budgetConstraints, setBudgetConstraints] = useState<BudgetConstraints | null>(null);
  const [hourlyRates, setHourlyRates] = useState<HourlyRateRule[]>([]);

  // Hours state
  const [workingHoursRules, setWorkingHoursRules] = useState<WorkingHoursRules | null>(null);
  const [contractedHours, setContractedHours] = useState<EmployeeContractedHours[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Compliance state
  const [complianceRules, setComplianceRules] = useState<ComplianceRules | null>(null);

  // Priorities and fairness state
  const [priorities, setPriorities] = useState<SchedulingPriority[]>([]);
  const [fairnessSettings, setFairnessSettings] = useState<FairnessSettings | null>(null);

  // Payroll cost state (employer on-costs, e.g. Employer NI)
  const [payrollCostRules, setPayrollCostRules] = useState<PayrollCostRules | null>(null);

  // Load all data on mount
  useEffect(() => {
    loadAllConstraints();
  }, []);

  const loadAllConstraints = async () => {
    if (!currentBusiness) return;

    try {
      setLoading(true);
      setError(null);

      // Load all constraints and employees in parallel
      const [
        allConstraints,
        employeesData,
      ] = await Promise.all([
        constraintsService.getAllConstraints(currentBusiness.id),
        employeeService.getAllEmployees(currentBusiness.id),
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

      // Set hours data with defaults if null. minRestBetweenShifts defaults
      // to 11 hours per UK statutory daily rest (gov.uk/rest-breaks-work).
      setWorkingHoursRules(allConstraints.workingHours || {
        maxHoursPerWeek: 40,
        maxOvertimeHours: 10,
        minRestBetweenShifts: 11,
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

      // Set priorities and fairness with defaults if null
      setPriorities(allConstraints.priorities.length > 0 ? allConstraints.priorities : DEFAULT_PRIORITIES);
      setFairnessSettings(allConstraints.fairness || {
        rotateWeekendShifts: true,
        balanceDesirableShifts: true,
        seniorityPreference: false,
        updatedAt: new Date().toISOString()
      });

      // Set payroll cost data with defaults if null - disabled by default so
      // no on-cost is silently assumed until a manager explicitly enables it
      setPayrollCostRules(allConstraints.payrollCost || {
        employerNiEnabled: false,
        employerNiWeeklyThreshold: 0,
        employerNiRate: 0,
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
    if (!currentBusiness) return;

    try {
      setLoading(true);
      setError(null);

      // Save all changed constraints
      await Promise.all([
        budgetConstraints && constraintsService.updateBudgetConstraints(currentBusiness.id, budgetConstraints),
        workingHoursRules && constraintsService.updateWorkingHoursRules(currentBusiness.id, workingHoursRules),
        complianceRules && constraintsService.updateComplianceRules(currentBusiness.id, complianceRules),
        fairnessSettings && constraintsService.updateFairnessSettings(currentBusiness.id, fairnessSettings),
        payrollCostRules && constraintsService.updatePayrollCostRules(currentBusiness.id, payrollCostRules),
        priorities.length > 0 && constraintsService.reorderPriorities(currentBusiness.id, { priorities }),
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

  // Swaps a priority with its neighbor and renumbers priorityOrder to match
  // the new position, so priorityOrder always reflects display order.
  const handleMovePriority = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= priorities.length) return;

    const sorted = [...priorities].sort((a, b) => a.priorityOrder - b.priorityOrder);
    [sorted[index], sorted[targetIndex]] = [sorted[targetIndex], sorted[index]];
    const renumbered = sorted.map((priority, i) => ({ ...priority, priorityOrder: i + 1 }));

    setPriorities(renumbered);
    setHasUnsavedChanges(true);
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
        <h2 className="text-neutral-900">Configurations</h2>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="working-time" className="flex-1">Working Time</TabsTrigger>
          <TabsTrigger value="pay-cost" className="flex-1">Pay & Cost</TabsTrigger>
          <TabsTrigger value="priorities" className="flex-1">Priorities</TabsTrigger>
        </TabsList>

        {/* Pay & Cost: wage budget, hourly rate rules, employer on-costs */}
        <TabsContent value="pay-cost" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Labor Cost Budget
                <InfoTooltip text="Wage cost only. Employer on-costs (e.g. National Insurance) are reported separately and are not counted against this budget." />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="weekly-budget">Weekly Wage Budget</Label>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly-budget">Monthly Wage Budget</Label>
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
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm">Hard Budget Limit</p>
                  <InfoTooltip text="Schedule cannot exceed the wage budget above." />
                </div>
                <Switch
                  checked={budgetConstraints?.hardBudgetLimit ?? false}
                  onCheckedChange={(checked: boolean) => {
                    setBudgetConstraints(prev => prev ? {
                      ...prev,
                      hardBudgetLimit: checked
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm">Budget Warning at</p>
                  <InfoTooltip text="Alert when the schedule approaches this percentage of the budget." />
                </div>
                <Select
                  value={budgetConstraints?.budgetWarningThreshold.toString() ?? "90"}
                  onValueChange={(value: string) => {
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
                        <p className="text-sm flex-1">Base Rate {rate.roleId ? `(${rate.roleId})` : ''}</p>
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
                        <div className="flex items-center gap-1.5 flex-1">
                          <p className="text-sm">Overtime Multiplier</p>
                          <InfoTooltip text="Rate applied for hours over 40/week." />
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
                        <p className="text-sm flex-1">Weekend Premium</p>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="w-5 h-5" />
                Employer On-Costs
                <InfoTooltip text="Employer-side costs on top of wage pay, such as Employer National Insurance. Reported alongside labor cost and used to validate true staffing cost - not counted against the wage cost budget." />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm">Employer National Insurance</p>
                  <InfoTooltip text="Applies a rate above a weekly per-employee earnings threshold." />
                </div>
                <Switch
                  checked={payrollCostRules?.employerNiEnabled ?? false}
                  onCheckedChange={(checked: boolean) => {
                    setPayrollCostRules(prev => prev ? {
                      ...prev,
                      employerNiEnabled: checked
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ni-threshold">Weekly Secondary Threshold</Label>
                    <InfoTooltip text="No employer NI is owed below this weekly pay." />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">$</span>
                    <Input
                      id="ni-threshold"
                      type="number"
                      value={payrollCostRules?.employerNiWeeklyThreshold ?? ''}
                      disabled={!payrollCostRules?.employerNiEnabled}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setPayrollCostRules(prev => prev ? {
                          ...prev,
                          employerNiWeeklyThreshold: isNaN(value) ? 0 : value
                        } : null);
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ni-rate">Rate Above Threshold</Label>
                    <InfoTooltip text="Applied to weekly pay above the threshold, per employee. Simplified model: one rate for every employee, not accounting for NI category letter (e.g. reduced rates for under-21s or apprentices)." />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="ni-rate"
                      type="number"
                      step="0.1"
                      value={payrollCostRules?.employerNiRate ?? ''}
                      disabled={!payrollCostRules?.employerNiEnabled}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setPayrollCostRules(prev => prev ? {
                          ...prev,
                          employerNiRate: isNaN(value) ? 0 : value
                        } : null);
                        setHasUnsavedChanges(true);
                      }}
                    />
                    <span className="text-neutral-500">%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Working Time: hours limits + rest/break/notice compliance rules */}
        <TabsContent value="working-time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Working Hours Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="max-hours">Max Hours per Week</Label>
                    <InfoTooltip text="Default cap for all employees." />
                  </div>
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
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                  <p className="text-sm">Max Consecutive Days</p>
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
                  <p className="text-sm">Max Shift Length</p>
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
                  <p className="text-sm">Min Shift Length</p>
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
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Rest Rules
                <InfoTooltip text="Statutory rest entitlements: gov.uk/rest-breaks-work." />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <p className="text-sm">Minimum Rest Between Shift Days</p>
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

              <div className="p-3 border border-neutral-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm">Rest Break Requirements</p>
                  <Switch
                    checked={complianceRules?.mealBreakRequired ?? false}
                    onCheckedChange={(checked: boolean) => {
                      setComplianceRules(prev => prev ? {
                        ...prev,
                        mealBreakRequired: checked
                      } : null);
                      setHasUnsavedChanges(true);
                    }}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="rest-break-duration" className="text-xs">Break Duration</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="rest-break-duration"
                        type="number"
                        value={complianceRules?.mealBreakDuration ?? ''}
                        disabled={!complianceRules?.mealBreakRequired}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                          setComplianceRules(prev => prev ? {
                            ...prev,
                            mealBreakDuration: isNaN(value) ? 0 : value
                          } : null);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-20"
                      />
                      <span className="text-sm text-neutral-500">min</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rest-break-threshold" className="text-xs">After Shift Length</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="rest-break-threshold"
                        type="number"
                        value={complianceRules?.mealBreakMinShiftHours ?? ''}
                        disabled={!complianceRules?.mealBreakRequired}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          setComplianceRules(prev => prev ? {
                            ...prev,
                            mealBreakMinShiftHours: isNaN(value) ? 0 : value
                          } : null);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-20"
                      />
                      <span className="text-sm text-neutral-500">hours</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Compliance Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm">FLSA Overtime Rules</p>
                  <InfoTooltip text="1.5x pay over 40 hours/week." />
                </div>
                <Switch
                  checked={complianceRules?.flsaOvertimeEnabled ?? false}
                  onCheckedChange={(checked: boolean) => {
                    setComplianceRules(prev => prev ? {
                      ...prev,
                      flsaOvertimeEnabled: checked
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm">Minor Labor Laws</p>
                  <InfoTooltip text="Restrictions for employees under 18." />
                </div>
                <Switch
                  checked={complianceRules?.minorLaborLawsEnabled ?? false}
                  onCheckedChange={(checked: boolean) => {
                    setComplianceRules(prev => prev ? {
                      ...prev,
                      minorLaborLawsEnabled: checked
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <p className="text-sm">Advance Notice Period</p>
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
              <CardTitle className="text-base flex items-center gap-1.5">
                Employee Contracted Hours
                <InfoTooltip text="Managed through each employee's profile, not here." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {employees.map((emp) => {
                  // An employee can have multiple effective-dated contracted-hours
                  // rows (e.g. a past rule and a current/future one) - show all of
                  // them rather than picking an arbitrary single one.
                  const empContractedHours = contractedHours
                    .filter(ch => ch.employeeId === emp.id)
                    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
                  const currentRow = empContractedHours.find(ch => {
                    const today = new Date().toISOString().slice(0, 10);
                    return ch.effectiveFrom <= today && (!ch.effectiveTo || ch.effectiveTo >= today);
                  });
                  return (
                    <Accordion key={emp.id} type="single" collapsible>
                      <AccordionItem value={`emp-${emp.id}`} className="border border-neutral-200 rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between flex-1 pr-4">
                            <span className="text-sm">{emp.fullName}</span>
                            <Badge variant="outline">
                              {currentRow?.contractedHours ?? emp.contract?.contractedHoursPerWeek ?? 0}h/week
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-3 pb-4 space-y-3">
                          {empContractedHours.length === 0 ? (
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div>
                                <Label className="text-xs">Min Hours</Label>
                                <Input type="number" value={0} className="mt-1" disabled />
                              </div>
                              <div>
                                <Label className="text-xs">Contracted Hours</Label>
                                <Input
                                  type="number"
                                  value={emp.contract?.contractedHoursPerWeek ?? 0}
                                  className="mt-1"
                                  disabled
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Max Hours</Label>
                                <Input
                                  type="number"
                                  value={emp.contract?.maxHoursPerWeek ?? 40}
                                  className="mt-1"
                                  disabled
                                />
                              </div>
                            </div>
                          ) : (
                            empContractedHours.map((row) => (
                              <div key={row.effectiveFrom} className="space-y-2 pb-3 border-b border-neutral-100 last:border-b-0 last:pb-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant={row === currentRow ? "default" : "outline"} className="text-xs">
                                    {row === currentRow ? "Current" : row.effectiveTo && row.effectiveTo < new Date().toISOString().slice(0, 10) ? "Past" : "Upcoming"}
                                  </Badge>
                                  <span className="text-xs text-neutral-500">
                                    {row.effectiveFrom} {row.effectiveTo ? `– ${row.effectiveTo}` : "onward"}
                                  </span>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div>
                                    <Label className="text-xs">Min Hours</Label>
                                    <Input type="number" value={row.minHours} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Contracted Hours</Label>
                                    <Input type="number" value={row.contractedHours} className="mt-1" disabled />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Max Hours</Label>
                                    <Input type="number" value={row.maxHours} className="mt-1" disabled />
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
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
                <InfoTooltip text="Order of importance when optimizing schedules." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...priorities]
                  .sort((a, b) => a.priorityOrder - b.priorityOrder)
                  .map((priority, index) => (
                    <div
                      key={priority.priorityType}
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
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          disabled={index === 0}
                          onClick={() => handleMovePriority(index, -1)}
                          aria-label={`Move ${priority.name} up`}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          disabled={index === priorities.length - 1}
                          onClick={() => handleMovePriority(index, 1)}
                          aria-label={`Move ${priority.name} down`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fairness Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm">Rotate Weekend Shifts</p>
                  <InfoTooltip text="Distribute weekend work evenly across employees." />
                </div>
                <Switch
                  checked={fairnessSettings?.rotateWeekendShifts ?? false}
                  onCheckedChange={(checked: boolean) => {
                    setFairnessSettings(prev => prev ? {
                      ...prev,
                      rotateWeekendShifts: checked
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm">Balance Desirable Shifts</p>
                  <InfoTooltip text="Fair distribution of preferred shift times." />
                </div>
                <Switch
                  checked={fairnessSettings?.balanceDesirableShifts ?? false}
                  onCheckedChange={(checked: boolean) => {
                    setFairnessSettings(prev => prev ? {
                      ...prev,
                      balanceDesirableShifts: checked
                    } : null);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm">Seniority Preference</p>
                  <InfoTooltip text="Priority for longer-tenured employees." />
                </div>
                <Switch
                  checked={fairnessSettings?.seniorityPreference ?? false}
                  onCheckedChange={(checked: boolean) => {
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
