import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Loader2, AlertCircle, RefreshCw, Calendar, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { useTimeoffRequests } from "../hooks/useTimeoffRequests";
import { useEmployees } from "../hooks/useEmployees";
import { useBusiness } from "../contexts/BusinessContext";
import { timeoffService } from "../services/timeoffService";
import type { TimeoffRequest } from "../types/timeoff";

const formatDate = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

export function TimeoffRequestsPanel() {
  const { currentBusiness } = useBusiness();
  const { requests, loading, error, refetch } = useTimeoffRequests();
  const { employees } = useEmployees();
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const employeeName = (employeeId: string) => employees.find(e => e.id === employeeId)?.fullName || "Unknown employee";

  const handleReview = async (request: TimeoffRequest, decision: "approve" | "deny") => {
    if (!currentBusiness) return;
    setActionId(request.id);
    setActionStatus(null);
    try {
      if (decision === "approve") await timeoffService.approveTimeoffRequest(currentBusiness.id, request.id);
      else await timeoffService.denyTimeoffRequest(currentBusiness.id, request.id);
      await refetch();
      setActionStatus({ type: "success", message: `Request ${decision === "approve" ? "approved" : "denied"}.` });
      setTimeout(() => setActionStatus(null), 4000);
    } catch (err) {
      setActionStatus({
        type: "error",
        message: err instanceof Error ? err.message : `Failed to ${decision} request`,
      });
    } finally {
      setActionId(null);
    }
  };

  const pending = requests
    .filter(r => r.status === "PENDING")
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
  const reviewed = requests
    .filter(r => r.status !== "PENDING")
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-neutral-600">Loading time off requests...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-300 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription>
          <p className="text-red-900">Failed to load time off requests</p>
          <p className="text-sm text-red-700 mt-1">{error.message}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={refetch}>
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-neutral-900">Time Off Requests</h2>
          <p className="text-neutral-500">{pending.length} pending approval</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {actionStatus && (
        <Alert
          variant={actionStatus.type === "error" ? "destructive" : "default"}
          className={actionStatus.type === "success" ? "border-green-300 bg-green-50" : ""}
        >
          <AlertDescription className={actionStatus.type === "success" ? "text-green-800" : ""}>
            {actionStatus.message}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending</CardTitle>
          <CardDescription>Awaiting your approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pending.map((request) => (
              <div key={request.id} className="border border-neutral-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{employeeName(request.employeeId)}</p>
                    <p className="text-sm text-neutral-700">
                      {formatDate(request.startDate)}
                      {request.startDate !== request.endDate && ` - ${formatDate(request.endDate)}`}
                      {' '}({request.totalDays} day{request.totalDays === 1 ? '' : 's'})
                    </p>
                    <p className="text-neutral-500 text-sm">{request.reason}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={actionId === request.id}
                      onClick={() => handleReview(request, "deny")}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Deny
                    </Button>
                    <Button
                      size="sm"
                      disabled={actionId === request.id}
                      onClick={() => handleReview(request, "approve")}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {pending.length === 0 && (
              <div className="text-center py-8 text-neutral-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No pending requests</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
          <CardDescription>Previously reviewed or cancelled requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reviewed.map((request) => (
              <div key={request.id} className="border border-neutral-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{employeeName(request.employeeId)}</p>
                      <Badge
                        variant="outline"
                        className={
                          request.status === "APPROVED"
                            ? "text-green-700 bg-green-50 border-green-300"
                            : "text-neutral-500 bg-neutral-50 border-neutral-300"
                        }
                      >
                        {request.status.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-700">
                      {formatDate(request.startDate)}
                      {request.startDate !== request.endDate && ` - ${formatDate(request.endDate)}`}
                    </p>
                    <p className="text-neutral-500 text-sm">{request.reason}</p>
                  </div>
                </div>
              </div>
            ))}

            {reviewed.length === 0 && (
              <div className="text-center py-8 text-neutral-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No reviewed requests yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
