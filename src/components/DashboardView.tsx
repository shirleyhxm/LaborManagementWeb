import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { DollarSign, Users, Clock, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
import { COLORS } from '../styles/theme';

export function DashboardView() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-neutral-900">Dashboard Overview</h2>
        <p className="text-neutral-500">Week of Jan 20-26, 2025</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Labor Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-neutral-900">$12,450</div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={83} className="flex-1" />
              <span className="text-xs text-neutral-500">83%</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              $2,550 under budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Coverage</CardTitle>
            <Users className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-neutral-900">94%</div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={94} className="flex-1" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              3 shifts understaffed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Schedule Compliance</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-neutral-900">92%</div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={92} className="flex-1" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              All constraints met
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Unresolved Conflicts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-neutral-900">5</div>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="outline" className="text-xs">2 Availability</Badge>
              <Badge variant="outline" className="text-xs">3 Overtime</Badge>
            </div>
            <Button variant="link" className="text-xs p-0 h-auto mt-1">
              Review conflicts →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Suggestions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
            <CardDescription>Requires immediate attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p>Tuesday 9am shift understaffed</p>
                    <p className="text-xs text-neutral-500 mt-1">Need 1 more server</p>
                  </div>
                  <Button size="sm" variant="outline">Fix</Button>
                </div>
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p>John Smith approaching overtime</p>
                    <p className="text-xs text-neutral-500 mt-1">38 hours scheduled</p>
                  </div>
                  <Button size="sm" variant="outline">Adjust</Button>
                </div>
              </AlertDescription>
            </Alert>

            <Alert style={{ borderColor: COLORS.status.info.border, backgroundColor: COLORS.status.info.background }}>
              <TrendingUp className="h-4 w-4" style={{ color: COLORS.primary[600] }} />
              <AlertDescription>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p style={{ color: COLORS.status.info.text }}>Friday sales forecast increased</p>
                    <p className="text-xs mt-1" style={{ color: COLORS.status.info.text }}>Consider adding staff</p>
                  </div>
                  <Button size="sm" variant="outline">Review</Button>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Suggestions</CardTitle>
            <CardDescription>Optimize your schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-neutral-200 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm">Move Sarah to Thu evening shift</p>
                  <p className="text-xs text-neutral-500">Saves $45 in labor cost</p>
                </div>
                <Badge variant="outline" style={{ color: COLORS.status.success.text, backgroundColor: COLORS.status.success.background, borderColor: COLORS.status.success.border }}>
                  -$45
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">Dismiss</Button>
                <Button size="sm" className="flex-1">Apply</Button>
              </div>
            </div>

            <div className="border border-neutral-200 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm">Add Mike for Sat lunch rush</p>
                  <p className="text-xs text-neutral-500">Matches peak demand forecast</p>
                </div>
                <Badge variant="outline" style={{ color: COLORS.status.info.text, backgroundColor: COLORS.status.info.background, borderColor: COLORS.status.info.border }}>
                  +Coverage
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">Dismiss</Button>
                <Button size="sm" className="flex-1">Apply</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Summary</CardTitle>
          <CardDescription>Current week overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-neutral-500">Total Employees Scheduled</p>
                <p className="text-neutral-900 mt-1">24</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Total Hours</p>
                <p className="text-neutral-900 mt-1">520 hours</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Avg Hours per Employee</p>
                <p className="text-neutral-900 mt-1">21.7 hours</p>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-500">Optimization Score</span>
                <span className="text-sm">87/100</span>
              </div>
              <Progress value={87} />
              <p className="text-xs text-neutral-500 mt-2">
                Good balance between cost efficiency and coverage
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
