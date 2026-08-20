export type TimeoffStatus = "PENDING" | "APPROVED" | "DENIED" | "CANCELLED";

export interface TimeoffRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: TimeoffStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNotes: string;
  totalDays: number;
  isApproved: boolean;
  isActive: boolean;
}
