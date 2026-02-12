import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ArrowLeft, Save, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOptimization } from '../../contexts/OptimizationContext';
import { salesForecastService, type SalesForecast } from '../../services/salesForecastService';
import type { DemandMatrix } from '../../types/optimization';

const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Grid-based demand: days x time slots
type DemandGrid = Record<string, Record<string, number>>; // { day: { time: workerCount } }

export function DemandInput() {
  const navigate = useNavigate();
  const { demandMatrix, setDemandMatrix } = useOptimization();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [salesPerWorker, setSalesPerWorker] = useState(100); // Conversion factor

  // Date range
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  // Time slot configuration
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(60); // 1 hour slots
  const [startHour, setStartHour] = useState(0); // 00:00
  const [endHour, setEndHour] = useState(24); // 24:00

  // Demand grid: { day: { time: workerCount } }
  const [demandGrid, setDemandGrid] = useState<DemandGrid>(() => {
    // Initialize from existing demand matrix if available
    const grid: DemandGrid = {};
    daysOfWeek.forEach(day => {
      grid[day] = {};
    });

    if (demandMatrix?.slots) {
      demandMatrix.slots.forEach(slot => {
        if (!grid[slot.day]) grid[slot.day] = {};
        grid[slot.day][slot.startTime] = slot.requiredCount;
      });
    }

    return grid;
  });

  // Load sales forecast on mount
  useEffect(() => {
    loadSalesForecast();
  }, []);

  // Generate time slots based on configuration
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    const totalMinutes = (endHour - startHour) * 60;
    const numSlots = Math.floor(totalMinutes / slotDurationMinutes);

    for (let i = 0; i < numSlots; i++) {
      const minutes = startHour * 60 + i * slotDurationMinutes;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      slots.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Validate date range (max 3 months = 90 days)
  const validateDateRange = (start: string, end: string): string | null => {
    if (!start || !end) return null;

    const startDateObj = new Date(start);
    const endDateObj = new Date(end);

    if (endDateObj < startDateObj) {
      return 'End date must be after start date';
    }

    const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 90) {
      return 'Date range cannot exceed 3 months (90 days) to limit computation load';
    }

    return null;
  };

  // Handle start date change with validation
  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    const error = validateDateRange(newStartDate, endDate);
    setDateRangeError(error);
  };

  // Handle end date change with validation
  const handleEndDateChange = (newEndDate: string) => {
    setEndDate(newEndDate);
    const error = validateDateRange(startDate, newEndDate);
    setDateRangeError(error);
  };

  const loadSalesForecast = async () => {
    setIsLoading(true);
    try {
      const forecast = await salesForecastService.get();
      convertForecastToDemand(forecast);
    } catch (error) {
      console.error('Failed to load sales forecast:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const convertForecastToDemand = (forecast: SalesForecast) => {
    const grid: DemandGrid = {};

    // Initialize empty grid
    daysOfWeek.forEach(day => {
      grid[day] = {};
    });

    // Convert sales forecast to worker demand
    if (forecast.weeklyPattern) {
      Object.entries(forecast.weeklyPattern).forEach(([day, timeMap]) => {
        Object.entries(timeMap).forEach(([time, sales]) => {
          const workersNeeded = Math.ceil(sales / salesPerWorker);
          if (workersNeeded > 0) {
            grid[day][time] = workersNeeded;
          }
        });
      });
    }

    setDemandGrid(grid);
    setHasUnsavedChanges(false); // Clear unsaved flag when loading fresh data

    // Set date range to current week
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startDateStr = monday.toISOString().split('T')[0];
    const endDateStr = sunday.toISOString().split('T')[0];

    setStartDate(startDateStr);
    setEndDate(endDateStr);

    // Validate the date range
    const error = validateDateRange(startDateStr, endDateStr);
    setDateRangeError(error);
  };

  const updateCell = (day: string, time: string, value: number) => {
    setDemandGrid(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [time]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleClearAll = () => {
    if (!window.confirm('Are you sure you want to clear all demand data?')) {
      return;
    }

    const emptyGrid: DemandGrid = {};
    daysOfWeek.forEach(day => {
      emptyGrid[day] = {};
    });
    setDemandGrid(emptyGrid);
    setHasUnsavedChanges(true); // Mark as unsaved since user made a change
  };

  // Convert grid to demand slots for backend
  const gridToSlots = () => {
    const slots: any[] = [];

    daysOfWeek.forEach(day => {
      const dayData = demandGrid[day] || {};
      const times = Object.keys(dayData).sort();

      times.forEach(time => {
        const count = dayData[time];
        if (count > 0) {
          // Calculate end time
          const [hours, minutes] = time.split(':').map(Number);
          const endMinutes = hours * 60 + minutes + slotDurationMinutes;
          const endHours = Math.floor(endMinutes / 60) % 24;
          const endMins = endMinutes % 60;
          const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

          slots.push({
            day,
            startTime: time,
            endTime,
            requiredCount: count,
            skillsNeeded: ['General'],
          });
        }
      });
    });

    return slots;
  };

  const handleSaveToDemandForecast = async () => {
    if (!startDate || !endDate) {
      alert('Please set start and end dates');
      return;
    }

    // Check for date range validation errors
    if (dateRangeError) {
      alert(dateRangeError);
      return;
    }

    setIsSaving(true);
    try {
      // Convert demand grid back to sales forecast format
      const weeklyPattern: Record<string, Record<string, number>> = {};

      Object.entries(demandGrid).forEach(([day, timeMap]) => {
        if (!weeklyPattern[day]) {
          weeklyPattern[day] = {};
        }

        Object.entries(timeMap).forEach(([time, workerCount]) => {
          if (workerCount > 0) {
            // Convert workers back to sales
            const estimatedSales = workerCount * salesPerWorker;
            weeklyPattern[day][time] = estimatedSales;
          }
        });
      });

      await salesForecastService.update({
        weeklyPattern,
        updatedBy: 'user',
      });

      // Also save to demand matrix context
      const matrix: DemandMatrix = {
        startDate,
        endDate,
        timeSlotMinutes: slotDurationMinutes,
        slots: gridToSlots(),
      };
      setDemandMatrix(matrix);

      // Clear unsaved changes flag after successful save
      setHasUnsavedChanges(false);
    } catch (error) {
      alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to get cell background color based on demand
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-white';
    if (count === 1) return 'bg-blue-50';
    if (count === 2) return 'bg-blue-100';
    if (count === 3) return 'bg-blue-200';
    if (count >= 4) return 'bg-blue-300';
    return 'bg-white';
  };

  if (isLoading) {
    return (
      <div>
        <Card className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-neutral-600">Loading sales forecast...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/inputs')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inputs
          </Button>
          <h1 className="text-3xl font-bold">Demand Matrix</h1>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={loadSalesForecast}
            disabled={isLoading || isSaving}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reload from Forecast
          </Button>
          <Button
            onClick={handleSaveToDemandForecast}
            disabled={isSaving || !!dateRangeError}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Configuration Section */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className={`w-full border rounded px-3 py-2 text-sm ${
                dateRangeError ? 'border-red-500 bg-red-50' : 'border-neutral-300'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className={`w-full border rounded px-3 py-2 text-sm ${
                dateRangeError ? 'border-red-500 bg-red-50' : 'border-neutral-300'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time Slot (minutes)</label>
            <select
              value={slotDurationMinutes}
              onChange={(e) => setSlotDurationMinutes(parseInt(e.target.value))}
              className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
            >
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hours Range</label>
            <div className="flex gap-2">
              <select
                value={startHour}
                onChange={(e) => setStartHour(parseInt(e.target.value))}
                className="w-full border border-neutral-300 rounded px-2 py-2 text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>
              <span className="self-center">to</span>
              <select
                value={endHour}
                onChange={(e) => setEndHour(parseInt(e.target.value))}
                className="w-full border border-neutral-300 rounded px-2 py-2 text-sm"
              >
                {Array.from({ length: 25 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sales per Worker</label>
            <input
              type="number"
              min="1"
              value={salesPerWorker}
              onChange={(e) => setSalesPerWorker(parseInt(e.target.value) || 100)}
              className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Date range error message */}
        {dateRangeError && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{dateRangeError}</p>
          </div>
        )}
      </Card>

      {/* Demand Grid Section */}
      <Card className={`p-0 ${hasUnsavedChanges ? 'border-2 border-amber-400 bg-amber-50' : ''}`}>
        <div className="flex justify-between items-center mb-4 px-6 pt-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Worker Demand Grid</h2>
            {hasUnsavedChanges && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                Unsaved Changes
              </span>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleClearAll}
            size="sm"
            className="gap-2 text-red-600 hover:text-red-700"
          >
            Clear All
          </Button>
        </div>

        <p className="text-sm text-neutral-600 mb-4 px-6">
          Enter the number of workers needed for each time slot. Click on a cell to edit. Leave blank or 0 for no coverage needed.
        </p>

        <div className="overflow-x-auto px-6">
          <table className="border-collapse border border-neutral-300 w-full">
            <thead>
              <tr>
                <th className="border border-neutral-300 bg-neutral-100 p-2 text-sm font-semibold sticky left-0 z-10 text-center">
                  Day
                </th>
                {timeSlots.map(time => (
                  <th
                    key={time}
                    className="border border-neutral-300 bg-neutral-100 p-2 text-xs font-semibold min-w-[60px] text-center"
                  >
                    {time}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daysOfWeek.map((day, dayIdx) => (
                <tr key={day}>
                  <td className="border border-neutral-300 bg-neutral-100 p-2 text-sm font-semibold sticky left-0 z-10 text-center">
                    {dayLabels[dayIdx]}
                  </td>
                  {timeSlots.map(time => {
                    const count = demandGrid[day]?.[time] || 0;
                    return (
                      <td
                        key={`${day}-${time}`}
                        className={`border border-neutral-300 p-0 ${getCellColor(count)}`}
                      >
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={count || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            updateCell(day, time, val);
                          }}
                          className="w-full h-full text-center border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 p-2 text-sm"
                          placeholder="0"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs text-neutral-600 px-6 pb-6">
          <span className="font-semibold">Heat Map:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-neutral-300"></div>
            <span>0</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border border-neutral-300"></div>
            <span>1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-neutral-300"></div>
            <span>2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-200 border border-neutral-300"></div>
            <span>3</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-300 border border-neutral-300"></div>
            <span>4+</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
