import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { DollarSign, Sparkles, Loader2 } from "lucide-react";
import type { OptimizationObjective } from "../types/scheduling";
import type { Employee } from "../types/employee";

const dayOfWeekMap = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

interface ScheduleEditorProps {
  employees: Employee[];
  onGenerateSchedule: (params: {
    employeeIds: string[];
    laborCostBudget: number;
    optimizationObjective: OptimizationObjective;
  }) => Promise<void>;
  isGenerating: boolean;
}

export function ScheduleEditor({ employees, onGenerateSchedule, isGenerating }: ScheduleEditorProps) {
  const [selectedObjective, setSelectedObjective] = useState<OptimizationObjective>("MINIMIZE_LABOR_COST");
  const [laborCostBudget, setLaborCostBudget] = useState<number>(5000);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [draggedEmployee, setDraggedEmployee] = useState<string | null>(null);

  const handleGenerate = async () => {
    const employeesToSchedule = selectedEmployeeIds.length > 0
      ? selectedEmployeeIds
      : employees.map(emp => emp.id);

    await onGenerateSchedule({
      employeeIds: employeesToSchedule,
      laborCostBudget,
      optimizationObjective: selectedObjective,
    });
  };

  const unselectedEmployees = employees.filter(emp => !selectedEmployeeIds.includes(emp.id));

  return (
    <div className="space-y-6">
      {/* Optimization Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Scheduling Objective</CardTitle>
              <CardDescription>Choose your optimization priority and constraints</CardDescription>
            </div>
            <Button
              className="gap-2"
              onClick={handleGenerate}
              disabled={isGenerating || employees.length === 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Schedule
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Scheduling Objective */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Optimization Objective</label>
              <Select value={selectedObjective} onValueChange={(val) => setSelectedObjective(val as OptimizationObjective)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select objective" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MINIMIZE_LABOR_COST">Minimize Labor Cost</SelectItem>
                  <SelectItem value="MAXIMIZE_SALES">Maximize Sales Coverage</SelectItem>
                  <SelectItem value="BALANCED">Balanced Approach</SelectItem>
                  <SelectItem value="MAXIMIZE_FAIRNESS">Maximize Fairness</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Labor Cost Budget */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Labor Cost Budget</label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-neutral-500" />
                <Input
                  type="number"
                  value={laborCostBudget}
                  onChange={(e) => setLaborCostBudget(Number(e.target.value))}
                  className="h-9"
                  placeholder="5000"
                />
              </div>
            </div>

            {/* Employee Selection Summary */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Employees to Schedule</label>
              <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2 h-9">
                <p className="text-sm text-neutral-700">
                  {selectedEmployeeIds.length > 0
                    ? `${selectedEmployeeIds.length} selected`
                    : `All (${employees.length})`}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Selection Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee Selection</CardTitle>
          <CardDescription>
            Drag employees to the drop zone to select them for scheduling, or leave empty to include all employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Selected Employees */}
            {selectedEmployeeIds.length > 0 && (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h3 className="text-sm font-medium text-neutral-900 mb-3">Selected for Scheduling</h3>
                <div className="grid gap-2">
                  {selectedEmployeeIds.map((empId) => {
                    const emp = employees.find(e => e.id === empId);
                    if (!emp) return null;
                    return (
                      <div
                        key={empId}
                        className="flex items-center justify-between bg-white border border-blue-200 rounded px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{emp.fullName}</p>
                          <p className="text-xs text-neutral-500">${emp.normalPayRate}/hr</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== empId));
                          }}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                if (draggedEmployee) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedEmployee && !selectedEmployeeIds.includes(draggedEmployee)) {
                  setSelectedEmployeeIds([...selectedEmployeeIds, draggedEmployee]);
                }
              }}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                draggedEmployee
                  ? 'bg-blue-100 border-blue-400'
                  : 'bg-neutral-50 border-neutral-300'
              }`}
            >
              <p className="text-sm text-neutral-500">
                {draggedEmployee
                  ? "Drop here to include in schedule"
                  : selectedEmployeeIds.length > 0
                    ? `${selectedEmployeeIds.length} employee(s) selected for scheduling`
                    : "Drag employees here to select them for scheduling"}
              </p>
            </div>

            {/* Unselected Employees */}
            {unselectedEmployees.length > 0 && (
              <div className="border border-neutral-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-3">
                  Available Employees ({unselectedEmployees.length})
                </h3>
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {unselectedEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-2 bg-white border border-neutral-200 rounded px-3 py-2 cursor-move hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                      draggable
                      onDragStart={(e) => {
                        setDraggedEmployee(employee.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggedEmployee(null);
                      }}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{employee.fullName}</p>
                        <p className="text-xs text-neutral-500">${employee.normalPayRate}/hr</p>
                      </div>
                      <div className="text-xs text-neutral-400">Drag to select</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}