import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TrendingUp, TrendingDown, AlertCircle, Users } from "lucide-react";

const forecastData = [
  { day: "Mon", date: "Jan 20", sales: 3200, forecast: 3400, staff: 6, recommended: 7 },
  { day: "Tue", date: "Jan 21", sales: 2800, forecast: 2900, staff: 5, recommended: 5 },
  { day: "Wed", date: "Jan 22", sales: 2600, forecast: 2700, staff: 5, recommended: 5 },
  { day: "Thu", date: "Jan 23", sales: 3100, forecast: 3300, staff: 6, recommended: 7 },
  { day: "Fri", date: "Jan 24", sales: 4800, forecast: 5200, staff: 7, recommended: 9 },
  { day: "Sat", date: "Jan 25", sales: 5400, forecast: 5600, staff: 8, recommended: 10 },
  { day: "Sun", date: "Jan 26", sales: 4200, forecast: 4400, staff: 7, recommended: 8 },
];

export function SalesForecast() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-neutral-900">Sales Forecast & Demand</h2>
        <p className="text-neutral-500">Week of Jan 20-26, 2025</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Projected Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-neutral-900">$25,500</div>
            <p className="text-xs text-green-600 mt-1">+12% vs last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Staffing Gaps</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-neutral-900">8 shifts</div>
            <p className="text-xs text-neutral-500 mt-1">Below recommended levels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Peak Demand Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-neutral-900">Saturday</div>
            <p className="text-xs text-neutral-500 mt-1">$5,600 projected</p>
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
