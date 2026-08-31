export interface TeamShift {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  isOvertime: boolean;
  payRate: number | null;
  isMine: boolean;
  /**
   * Set only on the caller's own shifts at a location other than the one being
   * viewed, so the calendar can mark where each shift is. Absent means "this
   * location", which needs no label.
   */
  businessId?: string;
  businessName?: string;
}

export type SwapRequestStatus = "PENDING" | "PENDING_APPROVAL" | "APPROVED" | "DENIED" | "DECLINED" | "CANCELLED";

export interface SwapRequest {
  id: string;
  requestingEmployeeId: string;
  requestingEmployeeName: string;
  targetEmployeeId: string;
  targetEmployeeName: string;
  targetShiftId: string;
  shiftDate: string;
  shiftStartTime: string;
  shiftEndTime: string;
  message: string | null;
  status: SwapRequestStatus;
  requestedAt: string;
  respondedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface SwapRequestsListResponse {
  incoming: SwapRequest[];
  outgoing: SwapRequest[];
}
