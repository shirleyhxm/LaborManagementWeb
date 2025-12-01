import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TrendingUp, TrendingDown, AlertCircle, Users, Edit2, Save, X } from "lucide-react";
import { useSalesForecast } from "../hooks/useSalesForecast";
import { salesForecastService } from "../services/salesForecastService";
import { COLORS } from '../styles/theme';

interface DayForecast {
  day: string;
  date: string;
  sales: number;
  forecast: number;
  staff: number;
  recommended: number;
}

// Helper to get day abbreviation
function getDayAbbr(dayName: string): string {
  const map: Record<string, string> = {
    MONDAY: "Mon",
    TUESDAY: "Tue",
    WEDNESDAY: "Wed",
    THURSDAY: "Thu",
    FRIDAY: "Fri",
    SATURDAY: "Sat",
    SUNDAY: "Sun",
  };
  return map[dayName] || dayName;
}

// Helper to format date
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Helper to get the start of the current week (Monday)
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Calculate recommended staff based on forecast (simple heuristic: $500 per staff member)
function calculateRecommendedStaff(forecast: number): number {
  return Math.ceil(forecast / 500);
}

export function SalesForecast() {
  const { forecast, loading, error, refetch } = useSalesForecast();
  const [selectedDay, setSelectedDay] = useState<string>("MONDAY");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedForecast, setEditedForecast] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const forecastData = useMemo<DayForecast[]>(() => {
    if (!forecast?.weeklyForecast) return [];

    const weekStart = getWeekStart();
    const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

    return daysOfWeek.map((dayName, index) => {
      const dayData = forecast.weeklyForecast[dayName] || {};

      // Sum all hourly sales for the day to get daily forecast
      const dailyForecast = Object.values(dayData).reduce((sum, sales) => sum + sales, 0);

      // Calculate date for this day
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);

      // Calculate recommended staff
      const recommended = calculateRecommendedStaff(dailyForecast);

      // For now, use placeholder for current staff (80% of recommended as a demo)
      const staff = Math.max(1, Math.floor(recommended * 0.8));

      // Use 90% of forecast as "actual" sales for demo purposes
      const sales = Math.round(dailyForecast * 0.9);

      return {
        day: getDayAbbr(dayName),
        date: formatDate(date),
        sales,
        forecast: Math.round(dailyForecast),
        staff,
        recommended,
      };
    });
  }, [forecast]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    if (forecastData.length === 0) {
      return {
        projectedSales: 0,
        percentageChange: 0,
        staffingGaps: 0,
        peakDay: { name: "", amount: 0 },
      };
    }

    const projectedSales = forecastData.reduce((sum, day) => sum + day.forecast, 0);
    const percentageChange = 12; // Placeholder - would need historical data

    const staffingGaps = forecastData.reduce((count, day) => {
      return count + (day.staff < day.recommended ? 1 : 0);
    }, 0);

    const peakDay = forecastData.reduce((max, day) => {
      return day.forecast > max.amount ? { name: day.day, amount: day.forecast } : max;
    }, { name: "", amount: 0 });

    return { projectedSales, percentageChange, staffingGaps, peakDay };
  }, [forecastData]);

  // Get hourly data for selected day
  const hourlyData = useMemo(() => {
    if (!forecast?.weeklyForecast || !selectedDay) return [];

    const dayData = forecast.weeklyForecast[selectedDay] || {};

    // Convert to array and sort by time
    return Object.entries(dayData)
      .map(([time, sales]) => ({
        time,
        sales: Math.round(sales),
        staff: Math.max(1, Math.ceil(sales / 500)), // Simple heuristic
      }))
      .sort((a, b) => {
        // Sort by time (assumes format like "09:00", "14:00", etc.)
        return a.time.localeCompare(b.time);
      });
  }, [forecast, selectedDay]);

  const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

  // Calculate date range for header
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekRange = `${formatDate(weekStart)}-${formatDate(weekEnd)}, ${weekEnd.getFullYear()}`;

  // Edit mode handlers
  const handleEnterEditMode = () => {
    if (forecast?.weeklyForecast && selectedDay) {
      const dayData = forecast.weeklyForecast[selectedDay] || {};
      setEditedForecast({ ...dayData });
      setIsEditMode(true);
      setSaveError(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedForecast({});
    setSaveError(null);
  };

  const handleForecastChange = (time: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setEditedForecast(prev => ({ ...prev, [time]: numValue }));
    }
  };

  const handleSave = async () => {
    if (!forecast?.weeklyForecast) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      // Create updated weekly forecast with edited values for selected day
      const updatedWeeklyForecast = {
        ...forecast.weeklyForecast,
        [selectedDay]: editedForecast,
      };

      await salesForecastService.update({
        weeklyForecast: updatedWeeklyForecast,
      });

      // Refetch to get updated data
      await refetch();

      setIsEditMode(false);
      setEditedForecast({});
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save forecast");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-neutral-900">Sales Forecast & Demand</h2>
          <p className="text-neutral-500">Loading forecast data...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-neutral-900">Sales Forecast & Demand</h2>
          <p className="text-red-500">Error loading forecast data</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-neutral-900">Sales Forecast & Demand</h2>
        <p className="text-neutral-500">Week of {weekRange}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Projected Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-neutral-900">${metrics.projectedSales.toLocaleString()}</div>
            <p className="text-xs text-green-600 mt-1">+{metrics.percentageChange}% vs last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Staffing Gaps</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-neutral-900">{metrics.staffingGaps} shifts</div>
            <p className="text-xs text-neutral-500 mt-1">Below recommended levels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Peak Demand Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-neutral-900">{metrics.peakDay.name || "N/A"}</div>
            <p className="text-xs text-neutral-500 mt-1">${metrics.peakDay.amount.toLocaleString()} projected</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Forecast View */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Forecast vs Staffing</CardTitle>
            <CardDescription>Align staff levels with expected demand</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="weekly">
              <TabsList className="mb-4">
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="hourly">Hourly</TabsTrigger>
              </TabsList>

              <TabsContent value="weekly" className="space-y-4">
                {/* Visual Chart Placeholder */}
                <div className="h-64 border border-neutral-200 rounded-lg bg-neutral-50 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="flex justify-center gap-8">
                      <div className="space-y-1">
                        <div className="w-12 h-12 bg-blue-200 rounded"></div>
                        <p className="text-xs text-neutral-500">Sales</p>
                      </div>
                      <div className="space-y-1">
                        <div className="w-12 h-12 bg-green-200 rounded"></div>
                        <p className="text-xs text-neutral-500">Staff</p>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-500">[Chart: Bar/Line combo showing sales forecast and staffing levels]</p>
                  </div>
                </div>

                {/* Data Table */}
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs">Day</th>
                        <th className="text-right px-4 py-2 text-xs">Forecast</th>
                        <th className="text-right px-4 py-2 text-xs">Current Staff</th>
                        <th className="text-right px-4 py-2 text-xs">Recommended</th>
                        <th className="text-center px-4 py-2 text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData.map((day) => {
                        const isUnder = day.staff < day.recommended;
                        const isOver = day.staff > day.recommended;
                        
                        return (
                          <tr key={day.day} className="border-b border-neutral-100">
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm">{day.day}</p>
                                <p className="text-xs text-neutral-500">{day.date}</p>
                              </div>
                            </td>
                            <td className="text-right px-4 py-3">
                              <p className="text-sm">${day.forecast.toLocaleString()}</p>
                            </td>
                            <td className="text-right px-4 py-3">
                              <p className="text-sm">{day.staff}</p>
                            </td>
                            <td className="text-right px-4 py-3">
                              <p className="text-sm">{day.recommended}</p>
                            </td>
                            <td className="text-center px-4 py-3">
                              {isUnder ? (
                                <Badge variant="outline" style={{ color: COLORS.status.amber.text, backgroundColor: COLORS.status.amber.background, borderColor: COLORS.status.amber.border }}>
                                  -{day.recommended - day.staff}
                                </Badge>
                              ) : isOver ? (
                                <Badge variant="outline" style={{ color: COLORS.status.info.text, backgroundColor: COLORS.status.info.background, borderColor: COLORS.status.info.border }}>
                                  +{day.staff - day.recommended}
                                </Badge>
                              ) : (
                                <Badge variant="outline" style={{ color: COLORS.status.success.text, backgroundColor: COLORS.status.success.background, borderColor: COLORS.status.success.border }}>
                                  Optimal
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="hourly" className="space-y-4">
                {/* Day selector and edit controls */}
                <div className="flex justify-between items-center gap-4">
                  <div className="flex gap-2 flex-wrap">
                    {daysOfWeek.map((day) => (
                      <Button
                        key={day}
                        variant={selectedDay === day ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedDay(day);
                          setIsEditMode(false);
                          setEditedForecast({});
                        }}
                        disabled={isEditMode}
                      >
                        {getDayAbbr(day)}
                      </Button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {!isEditMode ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEnterEditMode}
                        disabled={hourlyData.length === 0}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={isSaving}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Error message */}
                {saveError && (
                  <div className="rounded-lg p-3" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: COLORS.status.error.border, backgroundColor: COLORS.status.error.background }}>
                    <div className="flex items-center gap-2" style={{ color: '#dc2626' }}>
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-sm">{saveError}</p>
                    </div>
                  </div>
                )}

                {/* Hourly data table */}
                {hourlyData.length > 0 ? (
                  <div className="border border-neutral-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs">Time</th>
                          <th className="text-right px-4 py-2 text-xs">Forecast Sales</th>
                          <th className="text-right px-4 py-2 text-xs">Recommended Staff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hourlyData.map((hour) => {
                          const displayValue = isEditMode ? editedForecast[hour.time] || hour.sales : hour.sales;
                          const displayStaff = Math.max(1, Math.ceil(displayValue / 500));

                          return (
                            <tr key={hour.time} className="border-b border-neutral-100">
                              <td className="px-4 py-3">
                                <p className="text-sm">{hour.time}</p>
                              </td>
                              <td className="text-right px-4 py-3">
                                {isEditMode ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    value={editedForecast[hour.time] ?? hour.sales}
                                    onChange={(e) => handleForecastChange(hour.time, e.target.value)}
                                    className="w-24 text-sm text-right border border-neutral-300 rounded px-2 py-1"
                                  />
                                ) : (
                                  <p className="text-sm">${displayValue.toLocaleString()}</p>
                                )}
                              </td>
                              <td className="text-right px-4 py-3">
                                <p className="text-sm">{displayStaff}</p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-64 border border-neutral-200 rounded-lg bg-neutral-50 flex items-center justify-center">
                    <p className="text-sm text-neutral-500">No hourly data available for {selectedDay}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Demand Insights */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demand Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm">High Demand Alert</p>
                    <p className="text-xs text-neutral-500">Friday-Sunday expected 20% above average</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <TrendingDown className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm">Lower Traffic</p>
                    <p className="text-xs text-neutral-500">Tuesday-Wednesday slower than usual</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm">Peak Hours</p>
                    <p className="text-xs text-neutral-500">12pm-2pm and 6pm-8pm consistently busy</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Staffing Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="border border-neutral-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm">Friday Evening</p>
                  <Badge variant="outline" style={{ color: COLORS.status.amber.text, backgroundColor: COLORS.status.amber.background }}>
                    +2 staff
                  </Badge>
                </div>
                <p className="text-xs text-neutral-500 mb-2">
                  Add 2 servers to meet forecast
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  Apply
                </Button>
              </div>

              <div className="border border-neutral-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm">Saturday Lunch</p>
                  <Badge variant="outline" style={{ color: COLORS.status.amber.text, backgroundColor: COLORS.status.amber.background }}>
                    +3 staff
                  </Badge>
                </div>
                <p className="text-xs text-neutral-500 mb-2">
                  Peak demand expected
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historical Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Forecast Accuracy</span>
                  <span>94%</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[94%]"></div>
                </div>
                <p className="text-xs text-neutral-500">Based on last 4 weeks</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
