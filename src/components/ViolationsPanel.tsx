import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { AlertTriangle, X, ChevronDown, ChevronRight } from "lucide-react";
import type {
  ConstraintViolation,
  ScheduleLevelViolation,
  TimeBlockViolation,
  EmployeeViolation,
  EmployeeDayViolation,
  ShiftViolation
} from "../types/scheduling";
import {
  isScheduleLevelViolation,
  isTimeBlockViolation,
  isEmployeeViolation,
  isEmployeeDayViolation,
  isShiftViolation
} from "../types/scheduling";
import type { Employee } from "../types/employee";

interface ViolationsPanelProps {
  violations: ConstraintViolation[];
  employees: Employee[];
  onClose: () => void;
}

export function ViolationsPanel({ violations, employees, onClose }: ViolationsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['schedule', 'timeblock', 'employee', 'employeeday', 'shift'])
  );

  // Group violations by type
  const scheduleLevelViolations = violations.filter(isScheduleLevelViolation);
  const timeBlockViolations = violations.filter(isTimeBlockViolation);
  const employeeViolations = violations.filter(isEmployeeViolation);
  const employeeDayViolations = violations.filter(isEmployeeDayViolation);
  const shiftViolations = violations.filter(isShiftViolation);

  // Helper to get employee name
  const getEmployeeName = (employeeId: string) => {
    return employees.find(emp => emp.id === employeeId)?.fullName || employeeId;
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const totalViolations = violations.length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-base">
              Violations ({totalViolations})
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {totalViolations === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p className="text-sm">No violations detected</p>
            <p className="text-xs mt-1">Schedule is compliant with all constraints</p>
          </div>
        ) : (
          <>
            {/* Schedule-Level Violations */}
            {scheduleLevelViolations.length > 0 && (
              <div className="border border-red-200 rounded-md">
                <button
                  onClick={() => toggleSection('schedule')}
                  className="w-full flex items-center justify-between p-3 hover:bg-red-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('schedule') ? (
                      <ChevronDown className="w-4 h-4 text-red-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-medium text-sm text-red-900">
                      Schedule-Level Issues ({scheduleLevelViolations.length})
                    </span>
                  </div>
                </button>
                {expandedSections.has('schedule') && (
                  <div className="p-3 pt-0 space-y-2">
                    {scheduleLevelViolations.map((violation, idx) => (
                      <div key={idx} className="bg-red-50 p-2 rounded text-xs">
                        <p className="font-medium text-red-800">{violation.type}</p>
                        <p className="text-red-700 mt-1">{violation.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Time-Block Violations */}
            {timeBlockViolations.length > 0 && (
              <div className="border border-orange-200 rounded-md">
                <button
                  onClick={() => toggleSection('timeblock')}
                  className="w-full flex items-center justify-between p-3 hover:bg-orange-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('timeblock') ? (
                      <ChevronDown className="w-4 h-4 text-orange-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-orange-600" />
                    )}
                    <span className="font-medium text-sm text-orange-900">
                      Time-Block Issues ({timeBlockViolations.length})
                    </span>
                  </div>
                </button>
                {expandedSections.has('timeblock') && (
                  <div className="p-3 pt-0 space-y-2">
                    {timeBlockViolations.map((violation, idx) => (
                      <div key={idx} className="bg-orange-50 p-2 rounded text-xs">
                        <p className="font-medium text-orange-800">{violation.type}</p>
                        <p className="text-orange-700 mt-1">{violation.description}</p>
                        <p className="text-orange-600 text-[11px] mt-1">
                          {violation.dayOfWeek} • {violation.startTime} - {violation.endTime}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Employee Violations */}
            {employeeViolations.length > 0 && (
              <div className="border border-yellow-200 rounded-md">
                <button
                  onClick={() => toggleSection('employee')}
                  className="w-full flex items-center justify-between p-3 hover:bg-yellow-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('employee') ? (
                      <ChevronDown className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-yellow-600" />
                    )}
                    <span className="font-medium text-sm text-yellow-900">
                      Employee Issues ({employeeViolations.length})
                    </span>
                  </div>
                </button>
                {expandedSections.has('employee') && (
                  <div className="p-3 pt-0 space-y-2">
                    {employeeViolations.map((violation, idx) => (
                      <div key={idx} className="bg-yellow-50 p-2 rounded text-xs">
                        <p className="font-medium text-yellow-800">{violation.type}</p>
                        <p className="text-yellow-700 mt-1">{violation.description}</p>
                        <p className="text-yellow-600 text-[11px] mt-1">
                          Employee: {getEmployeeName(violation.employeeId)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Employee-Day Violations */}
            {employeeDayViolations.length > 0 && (
              <div className="border border-amber-200 rounded-md">
                <button
                  onClick={() => toggleSection('employeeday')}
                  className="w-full flex items-center justify-between p-3 hover:bg-amber-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('employeeday') ? (
                      <ChevronDown className="w-4 h-4 text-amber-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="font-medium text-sm text-amber-900">
                      Employee-Day Issues ({employeeDayViolations.length})
                    </span>
                  </div>
                </button>
                {expandedSections.has('employeeday') && (
                  <div className="p-3 pt-0 space-y-2">
                    {employeeDayViolations.map((violation, idx) => (
                      <div key={idx} className="bg-amber-50 p-2 rounded text-xs">
                        <p className="font-medium text-amber-800">{violation.type}</p>
                        <p className="text-amber-700 mt-1">{violation.description}</p>
                        <p className="text-amber-600 text-[11px] mt-1">
                          {getEmployeeName(violation.employeeId)} • {violation.dayOfWeek}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Shift Violations */}
            {shiftViolations.length > 0 && (
              <div className="border border-red-200 rounded-md">
                <button
                  onClick={() => toggleSection('shift')}
                  className="w-full flex items-center justify-between p-3 hover:bg-red-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('shift') ? (
                      <ChevronDown className="w-4 h-4 text-red-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-medium text-sm text-red-900">
                      Shift Issues ({shiftViolations.length})
                    </span>
                  </div>
                </button>
                {expandedSections.has('shift') && (
                  <div className="p-3 pt-0 space-y-2">
                    {shiftViolations.map((violation, idx) => (
                      <div key={idx} className="bg-red-50 p-2 rounded text-xs">
                        <p className="font-medium text-red-800">{violation.type}</p>
                        <p className="text-red-700 mt-1">{violation.description}</p>
                        <p className="text-red-600 text-[11px] mt-1">
                          {getEmployeeName(violation.employeeId)} • {violation.dayOfWeek} • {violation.startTime} - {violation.endTime}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}