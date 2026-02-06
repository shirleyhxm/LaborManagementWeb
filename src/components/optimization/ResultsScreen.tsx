import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Download, CheckCircle, XCircle, AlertCircle, Clock, DollarSign, Users, TrendingUp, Calendar, List } from 'lucide-react';
import { useOptimization } from '../../contexts/OptimizationContext';
import { exportResultsToCsv } from '../../services/optimizationService';

const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export function ResultsScreen() {
  const { currentJobStatus } = useOptimization();
  const [viewMode, setViewMode] = useState<'schedule' | 'list'>('schedule');

  const handleExport = () => {
    if (!currentJobStatus) return;
    const csvContent = exportResultsToCsv(currentJobStatus);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimization_results_${currentJobStatus.jobId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Build a schedule grouped by employee, then by day
  const buildScheduleByEmployee = () => {
    if (!currentJobStatus?.results) return [];

    return currentJobStatus.results.assignments.map(assignment => {
      // Group shifts by day for this employee
      const shiftsByDay: Record<string, any[]> = {};

      assignment.shifts.forEach(shift => {
        const day = shift.day;
        if (!shiftsByDay[day]) {
          shiftsByDay[day] = [];
        }

        shiftsByDay[day].push({
          startTime: shift.startTime,
          endTime: shift.endTime,
          hours: shift.duration,
          cost: shift.duration * shift.payRate,
          shiftType: shift.isOvertime ? 'OVERTIME' : 'REGULAR',
        });
      });

      // Sort shifts within each day by start time
      Object.keys(shiftsByDay).forEach(day => {
        shiftsByDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
      });

      return {
        workerName: assignment.workerName,
        workerId: assignment.workerId,
        totalHours: assignment.totalHours,
        totalPay: assignment.totalPay,
        utilization: assignment.utilization,
        shiftsByDay,
      };
    });
  };

  // No results yet
  if (!currentJobStatus || !currentJobStatus.results) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Results</h1>
        <Card className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-700 mb-2">No Results Yet</h2>
            <p className="text-neutral-600">Run an optimization to see results here</p>
          </div>
        </Card>
      </div>
    );
  }

  const { results, solveStatus } = currentJobStatus;
  const isOptimal = results.isOptimal;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Results</h1>
        <Button onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Export to CSV
        </Button>
      </div>

      {/* Status Banner */}
      <Card className={`p-4 mb-6 ${isOptimal ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          {isOptimal ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-amber-600" />
          )}
          <div>
            <h2 className={`font-semibold ${isOptimal ? 'text-green-900' : 'text-amber-900'}`}>
              {isOptimal ? 'Optimal Solution Found' : `Solution Status: ${solveStatus}`}
            </h2>
            <p className={`text-sm ${isOptimal ? 'text-green-700' : 'text-amber-700'}`}>
              Solved in {results.solveTimeMs}ms
            </p>
          </div>
        </div>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Cost */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Labor Cost</p>
              <p className="text-2xl font-bold text-neutral-900">
                ${results.metrics?.totalLaborCost?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </Card>

        {/* Total Hours */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Hours</p>
              <p className="text-2xl font-bold text-neutral-900">
                {results.metrics?.totalHours?.toFixed(1) || '0.0'}
              </p>
            </div>
          </div>
        </Card>

        {/* Workers Assigned */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Workers Assigned</p>
              <p className="text-2xl font-bold text-neutral-900">
                {results.metrics?.numberOfWorkers || results.assignments.length}
              </p>
            </div>
          </div>
        </Card>

        {/* Coverage */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Coverage</p>
              <p className="text-2xl font-bold text-neutral-900">
                {results.metrics?.coveragePercent?.toFixed(1) || '100'}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Violations (if any) */}
      {results.violations && results.violations.length > 0 && (
        <Card className="p-6 mb-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Constraint Violations</h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {results.violations.map((violation, idx) => (
                  <li key={idx}>{violation}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Schedule/List View */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            Schedule ({results.metrics?.numberOfShifts || 0} shifts)
          </h2>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'schedule' | 'list')}>
            <TabsList>
              <TabsTrigger value="schedule" className="gap-2">
                <Calendar className="w-4 h-4" />
                Schedule View
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="w-4 h-4" />
                List View
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {viewMode === 'schedule' ? (
          // Schedule Grid View (Employee Rows × Day Columns)
          <div className="overflow-x-auto">
            {results.assignments.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                No assignments found
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="text-left p-3 font-semibold text-sm border border-neutral-300 sticky left-0 bg-neutral-100 min-w-[180px]">
                      Employee
                    </th>
                    {daysOfWeek.map(day => (
                      <th key={day} className="text-center p-3 font-semibold text-sm border border-neutral-300 min-w-[140px]">
                        {day.charAt(0) + day.slice(1).toLowerCase()}
                      </th>
                    ))}
                    <th className="text-center p-3 font-semibold text-sm border border-neutral-300 min-w-[100px]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {buildScheduleByEmployee().map((employee) => (
                    <tr key={employee.workerId} className="hover:bg-neutral-50">
                      {/* Employee Name Column */}
                      <td className="p-3 border border-neutral-300 sticky left-0 bg-white">
                        <div className="font-medium text-sm text-neutral-900">
                          {employee.workerName}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {employee.utilization.toFixed(0)}% utilized
                        </div>
                      </td>

                      {/* Day Columns */}
                      {daysOfWeek.map(day => {
                        const shifts = employee.shiftsByDay[day] || [];
                        return (
                          <td key={day} className="p-2 border border-neutral-300 align-top bg-neutral-50">
                            {shifts.length > 0 ? (
                              <div className="space-y-1">
                                {shifts.map((shift, idx) => (
                                  <div
                                    key={idx}
                                    className={`text-xs p-1.5 rounded ${
                                      shift.shiftType === 'REGULAR'
                                        ? 'bg-blue-50 border border-blue-200'
                                        : 'bg-purple-50 border border-purple-200'
                                    }`}
                                  >
                                    <div className="text-neutral-700 font-medium">
                                      {shift.startTime} - {shift.endTime}
                                    </div>
                                    <div className="text-neutral-600 flex items-center justify-between mt-0.5">
                                      <span>{shift.hours.toFixed(1)}h</span>
                                      <span className="font-medium">${shift.cost.toFixed(0)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-neutral-400 text-center py-2">—</div>
                            )}
                          </td>
                        );
                      })}

                      {/* Total Column */}
                      <td className="p-3 border border-neutral-300 text-center bg-white">
                        <div className="text-sm font-semibold text-neutral-900">
                          {employee.totalHours.toFixed(1)}h
                        </div>
                        <div className="text-xs text-neutral-600 mt-0.5">
                          ${employee.totalPay.toFixed(0)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          // List View (original table)
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b-2 border-neutral-200">
                  <th className="text-left p-3 font-semibold text-sm">Worker</th>
                  <th className="text-left p-3 font-semibold text-sm">Day</th>
                  <th className="text-left p-3 font-semibold text-sm">Time Slot</th>
                  <th className="text-left p-3 font-semibold text-sm">Shift Type</th>
                  <th className="text-left p-3 font-semibold text-sm">Hours</th>
                  <th className="text-left p-3 font-semibold text-sm">Cost</th>
                </tr>
              </thead>
              <tbody>
                {results.assignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-neutral-500">
                      No assignments found
                    </td>
                  </tr>
                ) : (
                  // Flatten assignments -> shifts for list view
                  results.assignments.flatMap(assignment =>
                    assignment.shifts.map((shift, shiftIdx) => (
                      <tr key={`${assignment.workerId}-${shiftIdx}`} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="p-3 text-sm font-medium">{assignment.workerName}</td>
                        <td className="p-3 text-sm">{shift.day}</td>
                        <td className="p-3 text-sm">
                          {shift.startTime} - {shift.endTime}
                        </td>
                        <td className="p-3 text-sm">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              shift.isOvertime
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {shift.isOvertime ? 'OVERTIME' : 'REGULAR'}
                          </span>
                        </td>
                        <td className="p-3 text-sm">{shift.duration.toFixed(1)}</td>
                        <td className="p-3 text-sm">${(shift.duration * shift.payRate).toFixed(2)}</td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Row */}
        {results.assignments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-200 flex justify-between items-center">
            <div className="text-sm text-neutral-600">
              Total: {results.metrics?.numberOfShifts || 0} shift{(results.metrics?.numberOfShifts || 0) !== 1 ? 's' : ''} across {results.assignments.length} worker{results.assignments.length !== 1 ? 's' : ''}
            </div>
            <div className="text-right">
              <div className="text-sm text-neutral-600">Total Hours: {results.metrics?.totalHours?.toFixed(1) || '0.0'}</div>
              <div className="text-lg font-semibold text-neutral-900">
                Total Cost: ${results.metrics?.totalLaborCost?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
