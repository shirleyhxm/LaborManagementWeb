export type TimeoffStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';

export interface TimeoffRequest {
  id: string;
  employeeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  reason: string;
  status: TimeoffStatus;
  reviewedBy: string | null;
  reviewedAt: string | null; // ISO 8601 datetime string
  reviewerNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeoffRequest {
  employeeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
}

export interface ReviewTimeoffRequest {
  reviewerId: string;
  notes?: string;
}

export interface TimeoffSummary {
  pending: TimeoffRequest[];
  approved: TimeoffRequest[];
  denied: TimeoffRequest[];
  cancelled: TimeoffRequest[];
}
