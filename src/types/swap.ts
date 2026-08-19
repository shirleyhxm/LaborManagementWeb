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
}

export type SwapRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";

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
}

export interface SwapRequestsListResponse {
  incoming: SwapRequest[];
  outgoing: SwapRequest[];
}
