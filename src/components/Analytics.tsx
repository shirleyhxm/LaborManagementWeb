import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { BarChart3, TrendingUp, TrendingDown, Download, MessageSquare, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { COLORS } from '../styles/theme';

const performanceMetrics = [
  { week: "Week 1", laborCost: 12450, sales: 24800, coverage: 94, complaints: 2 },
  { week: "Week 2", laborCost: 13200, sales: 26400, coverage: 96, complaints: 1 },
  { week: "Week 3", laborCost: 11800, sales: 23600, coverage: 92, complaints: 3 },
  { week: "Week 4", laborCost: 12650, sales: 25200, coverage: 95, complaints: 1 },
];

const feedback = [
  {
    id: 1,
    employee: "Sarah Johnson",
    date: "Jan 20, 2025",
    rating: 4,
    comment: "Overall good schedule, but would prefer fewer late nights",
    type: "schedule",
  },
  {
    id: 2,
    employee: "Mike Chen",
    date: "Jan 18, 2025",
    rating: 5,
    comment: "Perfect! Got all my requested days off",
    type: "time-off",
  },
  {
    id: 3,
    employee: "Emma Davis",
    date: "Jan 15, 2025",
    rating: 3,
    comment: "Schedule was posted late, need more advance notice",
    type: "process",
  },
];

export function Analytics() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-neutral-900">Analytics & Feedback</h2>
          <p className="text-neutral-500">Performance insights and employee feedback</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Time Period Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-sm text-neutral-600">Time Period:</Label>
            <Select defaultValue="last-4-weeks">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="last-4-weeks">Last 4 Weeks</SelectItem>
                <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="feedback">Employee Feedback</TabsTrigger>
          <TabsTrigger value="pain-points">Pain Points</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          {/* Key Metrics Summary */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Avg Labor Cost</CardTitle>
                <TrendingDown className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-neutral-900">$12,525</div>
                <p className="text-xs text-green-600 mt-1">-5% vs previous period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Avg Coverage</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-neutral-900">94.2%</div>
                <p className="text-xs text-green-600 mt-1">+2% vs previous period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Schedule Efficiency</CardTitle>
                <BarChart3 className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-neutral-900">88%</div>
                <p className="text-xs text-neutral-500 mt-1">Labor to sales ratio</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Employee Satisfaction</CardTitle>
                <Star className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-neutral-900">4.2/5</div>
                <p className="text-xs text-neutral-500 mt-1">Based on feedback</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Labor Cost vs Sales Trend</CardTitle>
              <CardDescription>Weekly performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 border border-neutral-200 rounded-lg bg-neutral-50 flex items-center justify-center mb-4">
                <div className="text-center space-y-2">
                  <BarChart3 className="w-12 h-12 mx-auto text-neutral-300" />
                  <p className="text-sm text-neutral-500">[Chart: Line graph showing labor cost and sales over time]</p>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs">Period</th>
                      <th className="text-right px-4 py-2 text-xs">Labor Cost</th>
                      <th className="text-right px-4 py-2 text-xs">Sales</th>
                      <th className="text-right px-4 py-2 text-xs">Coverage</th>
                      <th className="text-right px-4 py-2 text-xs">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceMetrics.map((metric) => (
                      <tr key={metric.week} className="border-b border-neutral-100">
                        <td className="px-4 py-3 text-sm">{metric.week}</td>
                        <td className="text-right px-4 py-3 text-sm">${metric.laborCost.toLocaleString()}</td>
                        <td className="text-right px-4 py-3 text-sm">${metric.sales.toLocaleString()}</td>
                        <td className="text-right px-4 py-3 text-sm">{metric.coverage}%</td>
                        <td className="text-right px-4 py-3 text-sm">{metric.complaints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Efficiency Breakdown */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scheduling Efficiency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Constraint Compliance</span>
                    <span>96%</span>
                  </div>
                  <Progress value={96} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Employee Preference Match</span>
                    <span>87%</span>
                  </div>
                  <Progress value={87} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Forecast Accuracy</span>
                    <span>94%</span>
                  </div>
                  <Progress value={94} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Schedule Stability</span>
                    <span>89%</span>
                  </div>
                  <Progress value={89} />
                  <p className="text-xs text-neutral-500 mt-1">Fewer last-minute changes</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <span className="text-sm text-neutral-500">Regular Hours</span>
                  <span className="text-sm">$10,850 (87%)</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <span className="text-sm text-neutral-500">Overtime</span>
                  <span className="text-sm">$1,200 (10%)</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <span className="text-sm text-neutral-500">Weekend Premium</span>
                  <span className="text-sm">$375 (3%)</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                  <span className="text-sm">Total Labor Cost</span>
                  <span className="text-sm">$12,425</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employee Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Employee Feedback</CardTitle>
                  <CardDescription>Responses from your team</CardDescription>
                </div>
                <Button className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Request Feedback
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {feedback.map((item) => (
                <div key={item.id} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm">{item.employee}</p>
                      <p className="text-xs text-neutral-500">{item.date}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < item.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-neutral-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-neutral-700 mb-2">{item.comment}</p>
                  <Badge variant="outline" className="text-xs">
                    {item.type}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Satisfaction Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Schedule Clarity</span>
                    <span>4.3/5</span>
                  </div>
                  <Progress value={86} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Work-Life Balance</span>
                    <span>4.1/5</span>
                  </div>
                  <Progress value={82} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Fairness</span>
                    <span>4.4/5</span>
                  </div>
                  <Progress value={88} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Communication</span>
                    <span>3.9/5</span>
                  </div>
                  <Progress value={78} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Submit Feedback</CardTitle>
                <CardDescription>Report scheduling issues or suggestions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="feedback-type">Feedback Type</Label>
                  <Select>
                    <SelectTrigger id="feedback-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="schedule">Schedule Issue</SelectItem>
                      <SelectItem value="process">Process Improvement</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedback-text">Your Feedback</Label>
                  <Textarea
                    id="feedback-text"
                    placeholder="Describe the issue or suggestion..."
                    rows={4}
                  />
                </div>
                <Button className="w-full">Submit Feedback</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pain Points Tab */}
        <TabsContent value="pain-points" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identified Pain Points</CardTitle>
              <CardDescription>Common scheduling challenges this period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg p-4" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: COLORS.status.amber.border, backgroundColor: COLORS.status.amber.background }}>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.status.amber.light }}>
                    <TrendingUp className="w-4 h-4" style={{ color: COLORS.status.amber.text }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm">Last-Minute Call-Ins</p>
                      <Badge variant="outline" style={{ color: COLORS.status.amber.text, backgroundColor: COLORS.status.amber.light }}>
                        High Impact
                      </Badge>
                    </div>
                    <p className="text-sm mb-2" style={{ color: COLORS.status.amber.text }}>
                      8 instances in the last 4 weeks causing coverage gaps
                    </p>
                    <p className="text-xs" style={{ color: COLORS.status.amber.text }}>
                      Suggestion: Build backup staff list or incentivize on-call availability
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: COLORS.status.amber.border, backgroundColor: COLORS.status.amber.background }}>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.status.amber.light }}>
                    <MessageSquare className="w-4 h-4" style={{ color: COLORS.status.amber.text }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm">Late Schedule Publishing</p>
                      <Badge variant="outline" style={{ color: COLORS.status.amber.text, backgroundColor: COLORS.status.amber.light }}>
                        Medium Impact
                      </Badge>
                    </div>
                    <p className="text-sm mb-2" style={{ color: COLORS.status.amber.text }}>
                      Schedule posted less than 7 days in advance in 3 out of 4 weeks
                    </p>
                    <p className="text-xs" style={{ color: COLORS.status.amber.text }}>
                      Suggestion: Set auto-publish deadline or use AI optimization earlier
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: COLORS.status.info.border, backgroundColor: COLORS.status.info.background }}>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.status.info.light }}>
                    <BarChart3 className="w-4 h-4" style={{ color: COLORS.status.info.text }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm">Forecast Mismatch</p>
                      <Badge variant="outline" style={{ color: COLORS.status.info.text, backgroundColor: COLORS.status.info.light }}>
                        Low Impact
                      </Badge>
                    </div>
                    <p className="text-sm mb-2" style={{ color: COLORS.status.info.text }}>
                      Friday evenings consistently understaffed despite forecasts
                    </p>
                    <p className="text-xs" style={{ color: COLORS.status.info.text }}>
                      Suggestion: Adjust Friday evening staffing recommendations
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Common Complaints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { issue: "Too many closing shifts", count: 5 },
                  { issue: "Not enough weekend days off", count: 4 },
                  { issue: "Schedule changes without notice", count: 3 },
                  { issue: "Uneven hour distribution", count: 2 },
                ].map((complaint, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg"
                  >
                    <span className="text-sm">{complaint.issue}</span>
                    <Badge variant="outline">{complaint.count} reports</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Action Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm flex-1">Review and update weekend rotation policy</span>
              </div>
              <div className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm flex-1">Create backup staff protocol</span>
              </div>
              <div className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm flex-1">Set auto-publish deadline for schedules</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
