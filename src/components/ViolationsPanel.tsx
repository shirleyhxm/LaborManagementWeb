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
import { COLORS } from '../styles/theme';

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
              <div className="rounded-md" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: COLORS.status.error.border }}>
                <button
                  onClick={() => toggleSection('schedule')}
                  className="w-full flex items-center justify-between p-3 transition-colors"
                  style={{ backgroundColor: expandedSections.has('schedule') ? COLORS.status.error.background : 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.status.error.background}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = expandedSections.has('schedule') ? COLORS.status.error.background : 'transparent'}
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('schedule') ? (
                      <ChevronDown className="w-4 h-4" style={{ color: '#dc2626' }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: '#dc2626' }} />
                    )}
                    <span className="font-medium text-sm" style={{ color: COLORS.status.error.text }}>
                      Schedule-Level Issues ({scheduleLevelViolations.length})
                    </span>
                  </div>
                </button>
                {expandedSections.has('schedule') && (
                  <div className="p-3 pt-0 space-y-2">
                    {scheduleLevelViolations.map((violation, idx) => (
                      <div key={idx} className="p-2 rounded text-xs" style={{ backgroundColor: COLORS.status.error.background }}>
                        <p className="font-medium" style={{ color: COLORS.status.error.text }}>{violation.type}</p>
                        <p className="mt-1" style={{ color: COLORS.status.error.text }}>{violation.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Time-Block Violations */}
            {timeBlockViolations.length > 0 && (
              <div className="rounded-md" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: COLORS.status.orange.border }}>
                <button
                  onClick={() => toggleSection('timeblock')}
                  className="w-full flex items-center justify-between p-3 transition-colors"
                  style={{ backgroundColor: expandedSections.has('timeblock') ? COLORS.status.orange.background : 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.status.orange.background}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = expandedSections.has('timeblock') ? COLORS.status.orange.background : 'transparent'}
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('timeblock') ? (
                      <ChevronDown className="w-4 h-4" style={{ color: COLORS.status.orange.text }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: COLORS.status.orange.text }} />
                    )}
                    <span className="font-medium text-sm" style={{ color: COLORS.status.orange.text }}>
                      Time-Block Issues ({timeBlockViolations.length})
                    </span>
                  </div>
                </button>
                {expandedSections.has('timeblock') && (
                  <div className="p-3 pt-0 space-y-2">
                    {timeBlockViolations.map((violation, idx) => (
                      <div key={idx} className="p-2 rounded text-xs" style={{ backgroundColor: COLORS.status.orange.background }}>
                        <p className="font-medium" style={{ color: COLORS.status.orange.text }}>{violation.type}</p>
                        <p className="mt-1" style={{ color: COLORS.status.orange.text }}>{violation.description}</p>
                        <p className="text-[11px] mt-1" style={{ color: COLORS.status.orange.text }}>
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
              <div className="rounded-md" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: COLORS.status.warning.border }}>
                <button
                  onClick={() => toggleSection('employee')}
                  className="w-full flex items-center justify-between p-3 transition-colors"
                  style={{ backgroundColor: expandedSections.has('employee') ? COLORS.status.warning.background : 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.status.warning.background}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = expandedSections.has('employee') ? COLORS.status.warning.background : 'transparent'}
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('employee') ? (
                      <ChevronDown className="w-4 h-4" style={{ color: COLORS.status.warning.text }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: COLORS.status.warning.text }} />
                    )}
                    <span className="font-medium text-sm" style={{ color: COLORS.status.warning.text }}>
                      Employee Issues ({employeeViolations.length})
                    </span>
                  </div>
                </button>
                {expandedSections.has('employee') && (
                  <div className="p-3 pt-0 space-y-2">
                    {employeeViolations.map((violation, idx) => (
                      <div key={idx} className="p-2 rounded text-xs" style={{ backgroundColor: COLORS.status.warning.background }}>
                        <p className="font-medium" style={{ color: COLORS.status.warning.text }}>{violation.type}</p>
                        <p className="mt-1" style={{ color: COLORS.status.warning.text }}>{violation.description}</p>
                        <p className="text-[11px] mt-1" style={{ color: COLORS.status.warning.text }}>
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
              <div className="rounded-md" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: COLORS.status.amber.border }}>
                <button
                  onClick={() => toggleSection('employeeday')}
                  className="w-full flex items-center justify-between p-3 transition-colors"
                  style={{ backgroundColor: expandedSections.has('employeeday') ? COLORS.status.amber.background : 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.status.amber.background}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = expandedSections.has('employeeday') ? COLORS.status.amber.background : 'transparent'}
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('employeeday') ? (
                      <ChevronDown className="w-4 h-4" style={{ color: COLORS.status.amber.text }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: COLORS.status.amber.text }} />
                    )}
                    <span className="font-medium text-sm" style={{ color: COLORS.status.amber.text }}>
                      Employee-Day Issues ({employeeDayViolations.length})
                    </span>
                  </div>
                </button>
                {expandedSections.has('employeeday') && (
                  <div className="p-3 pt-0 space-y-2">
                    {employeeDayViolations.map((violation, idx) => (
                      <div key={idx} className="p-2 rounded text-xs" style={{ backgroundColor: COLORS.status.amber.background }}>
                        <p className="font-medium" style={{ color: COLORS.status.amber.text }}>{violation.type}</p>
                        <p className="mt-1" style={{ color: COLORS.status.amber.text }}>{violation.description}</p>
                        <p className="text-[11px] mt-1" style={{ color: COLORS.status.amber.text }}>
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
              <div className="rounded-md" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: COLORS.status.error.border }}>
                <button
                  onClick={() => toggleSection('shift')}
                  className="w-full flex items-center justify-between p-3 transition-colors"
                  style={{ backgroundColor: expandedSections.has('shift') ? COLORS.status.error.background : 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.status.error.background}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = expandedSections.has('shift') ? COLORS.status.error.background : 'transparent'}
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('shift') ? (
                      <ChevronDown className="w-4 h-4" style={{ color: '#dc2626' }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: '#dc2626' }} />
                    )}
                    <span className="font-medium text-sm" style={{ color: COLORS.status.error.text }}>
                      Shift Issues ({shiftViolations.length})
                    </span>
                  </div>
                </button>
                {expandedSections.has('shift') && (
                  <div className="p-3 pt-0 space-y-2">
                    {shiftViolations.map((violation, idx) => (
                      <div key={idx} className="p-2 rounded text-xs" style={{ backgroundColor: COLORS.status.error.background }}>
                        <p className="font-medium" style={{ color: COLORS.status.error.text }}>{violation.type}</p>
                        <p className="mt-1" style={{ color: COLORS.status.error.text }}>{violation.description}</p>
                        <p className="text-[11px] mt-1" style={{ color: '#dc2626' }}>
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