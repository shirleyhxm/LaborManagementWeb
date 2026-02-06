import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Calendar, Users, Settings, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useOptimization } from '../../contexts/OptimizationContext';
import { salesForecastService } from '../../services/salesForecastService';
import { employeeService } from '../../services/employeeService';
import type { WorkerInput, DemandMatrix } from '../../types/optimization';

export function InputsHub() {
  const navigate = useNavigate();
  const { demandMatrix, workers, constraints, setDemandMatrix, setWorkers } = useOptimization();
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      // Load workers from employees API if not already loaded
      if (workers.length === 0) {
        const employees = await employeeService.getAllEmployees();
        const workerInputs: WorkerInput[] = employees.map(emp => ({
          name: emp.fullName,
          hourlyRate: emp.normalPayRate,
          groups: Array.from(emp.groups),
          maxHoursPerWeek: emp.contract.maxHoursPerWeek,
          productivity: emp.productivity,
          availability: emp.availability.map(a => ({
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
          })),
        }));
        setWorkers(workerInputs);
      }

      // Load demand from sales forecast if not already loaded
      if (!demandMatrix || demandMatrix.slots.length === 0) {
        const forecast = await salesForecastService.get();
        const demandSlots = convertForecastToDemand(forecast);
        if (demandSlots.length > 0) {
          // Set date range to current week
          const today = new Date();
          const monday = new Date(today);
          monday.setDate(today.getDate() - today.getDay() + 1);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);

          const matrix: DemandMatrix = {
            startDate: monday.toISOString().split('T')[0],
            endDate: sunday.toISOString().split('T')[0],
            timeSlotMinutes: 60,
            slots: demandSlots,
          };
          setDemandMatrix(matrix);
        }
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const convertForecastToDemand = (forecast: any) => {
    const demandSlots: any[] = [];
    const salesPerWorker = 100;

    Object.entries(forecast.weeklyForecast).forEach(([day, timeMap]: [string, any]) => {
      const daySlots: { time: string; sales: number }[] = [];

      Object.entries(timeMap).forEach(([time, sales]: [string, any]) => {
        daySlots.push({ time, sales });
      });

      daySlots.sort((a, b) => a.time.localeCompare(b.time));

      for (let i = 0; i < daySlots.length; i++) {
        const current = daySlots[i];
        const next = daySlots[i + 1];
        const workersNeeded = Math.ceil(current.sales / salesPerWorker);

        if (workersNeeded > 0) {
          const endTime = next ? next.time : addHour(current.time);
          demandSlots.push({
            day: day,
            startTime: current.time,
            endTime: endTime,
            requiredCount: workersNeeded,
            skillsNeeded: ['General'],
          });
        }
      }
    });

    return demandSlots;
  };

  const addHour = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const nextHour = (hours + 1) % 24;
    return `${String(nextHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Check completion status
  const isDemandComplete = demandMatrix !== null && demandMatrix.slots.length > 0;
  const isWorkersComplete = workers.length > 0;
  const isConstraintsComplete = true; // Constraints have defaults, so always "complete"

  const allInputsComplete = isDemandComplete && isWorkersComplete && isConstraintsComplete;

  if (isLoadingData) {
    return (
      <div>
        <Card className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-neutral-600">Loading optimization inputs...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Configure Optimization Inputs</h1>
        <p className="text-neutral-600 mt-2">
          Set up your demand requirements, worker pool, and constraints to find the mathematically optimal assignment.
        </p>
      </div>

      {/* Progress Overview */}
      <Card className="mb-8 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-neutral-900">Input Progress</h3>
              <p className="text-sm text-neutral-600 mt-1">
                {allInputsComplete
                  ? '✅ All inputs configured! Ready to optimize.'
                  : `${[isDemandComplete, isWorkersComplete].filter(Boolean).length} of 2 required inputs complete`}
              </p>
            </div>
            {allInputsComplete && (
              <Button
                onClick={() => navigate('/optimize')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continue to Optimize →
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Input Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Demand Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/inputs/demand')}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              {isDemandComplete ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5 text-neutral-300" />
              )}
            </div>
            <CardTitle className="mt-4">Demand</CardTitle>
            <CardDescription>
              Coverage requirements across time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDemandComplete ? (
              <div className="space-y-2">
                <p className="text-sm text-neutral-600">
                  ✓ {demandMatrix!.slots.length} time slots configured
                </p>
                <p className="text-sm text-neutral-600">
                  📅 {demandMatrix!.startDate} to {demandMatrix!.endDate}
                </p>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                Set up when and how many workers you need
              </p>
            )}
            <Button variant="ghost" className="w-full mt-4">
              {isDemandComplete ? 'Edit Demand' : 'Configure Demand'}
            </Button>
          </CardContent>
        </Card>

        {/* Workers Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/inputs/workers')}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              {isWorkersComplete ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5 text-neutral-300" />
              )}
            </div>
            <CardTitle className="mt-4">Workers</CardTitle>
            <CardDescription>
              Your available labor pool
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isWorkersComplete ? (
              <div className="space-y-2">
                <p className="text-sm text-neutral-600">
                  ✓ {workers.length} workers configured
                </p>
                <p className="text-sm text-neutral-600">
                  💰 ${workers.reduce((sum, w) => sum + w.hourlyRate, 0) / workers.length} avg rate
                </p>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                Import workers via CSV or add manually
              </p>
            )}
            <Button variant="ghost" className="w-full mt-4">
              {isWorkersComplete ? 'Edit Workers' : 'Add Workers'}
            </Button>
          </CardContent>
        </Card>

        {/* Constraints Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/inputs/constraints')}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <CardTitle className="mt-4">Constraints</CardTitle>
            <CardDescription>
              Rules and requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-neutral-600">
                ✓ Max {constraints.maxHoursPerWeek}h/week
              </p>
              <p className="text-sm text-neutral-600">
                ✓ {constraints.minRestBetweenShifts}h rest between shifts
              </p>
            </div>
            <Button variant="ghost" className="w-full mt-4">
              Customize Constraints
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <Card className="mt-8 bg-neutral-50">
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-sm font-bold">
                1
              </span>
              <div>
                <p className="font-medium">Configure Demand</p>
                <p className="text-sm text-neutral-600">
                  Tell us when and how many workers you need
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-sm font-bold">
                2
              </span>
              <div>
                <p className="font-medium">Add Your Workers</p>
                <p className="text-sm text-neutral-600">
                  Import your team with their availability and pay rates
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-sm font-bold">
                3
              </span>
              <div>
                <p className="font-medium">Set Constraints (Optional)</p>
                <p className="text-sm text-neutral-600">
                  Customize labor rules and requirements
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-sm font-bold">
                4
              </span>
              <div>
                <p className="font-medium">Optimize</p>
                <p className="text-sm text-neutral-600">
                  Our solver finds the mathematically optimal assignment in seconds
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
