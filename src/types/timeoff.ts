export type TimeoffStatus = "PENDING" | "APPROVED" | "DENIED" | "CANCELLED";

export interface TimeoffRequest {
  id: string;
  employeeId: string;
  /** Where the request was filed - an employee's own list spans every location. */
  businessId: string;
  businessName: string | null;
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
