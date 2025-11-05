import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TrendingUp, TrendingDown, AlertCircle, Users } from "lucide-react";
import { useSalesForecast } from "../hooks/useSalesForecast";

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
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun",
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
  const { forecast, loading, error } = useSalesForecast();

  const forecastData = useMemo<DayForecast[]>(() => {
    if (!forecast?.weeklyForecast) return [];

    const weekStart = getWeekStart();
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
  // Calculate date range for header
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekRange = `${formatDate(weekStart)}-${formatDate(weekEnd)}, ${weekEnd.getFullYear()}`;

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
                                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300">
                                  -{day.recommended - day.staff}
                                </Badge>
                              ) : isOver ? (
                                <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-300">
                                  +{day.staff - day.recommended}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-green-700 bg-green-50 border-green-300">
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
                <div className="h-64 border border-neutral-200 rounded-lg bg-neutral-50 flex items-center justify-center">
                  <p className="text-sm text-neutral-500">[Chart: Hourly breakdown for selected day]</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Monday</Button>
                  <Button variant="outline" size="sm">Tuesday</Button>
                  <Button variant="outline" size="sm">Wednesday</Button>
                  <Button size="sm">Thursday</Button>
                </div>
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
                  <Badge variant="outline" className="text-amber-700 bg-amber-50">
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
                  <Badge variant="outline" className="text-amber-700 bg-amber-50">
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
