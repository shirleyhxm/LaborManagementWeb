export interface SalesRecord {
  id: string;
  employeeId: string;
  shiftId: string | null;
  scheduleId: string | null;
  amount: number;
  category: string | null;
  timestamp: string; // ISO 8601 datetime string
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesRequest {
  employeeId: string;
  shiftId?: string;
  scheduleId?: string;
  amount: number;
  category?: string;
  notes?: string;
  timestamp?: string; // ISO 8601 datetime string, defaults to now if not provided
}

export interface SalesPerformanceMetrics {
  employeeId: string;
  startDate: string;
  endDate: string;
  totalSalesAmount: number;
  totalTransactions: number;
  averageSaleAmount: number;
  salesPerHour: number; // productivity metric
  performanceRate: number; // actual vs target percentage
  totalHoursWorked: number;
}

export interface DailySalesSummary {
  date: string;
  totalSales: number;
  totalTransactions: number;
  topPerformers: TopPerformer[];
}

export interface TopPerformer {
  employeeId: string;
  employeeName: string;
  totalSales: number;
  transactions: number;
  rank: number;
}

export interface SalesByEmployee {
  employeeId: string;
  employeeName?: string;
  sales: SalesRecord[];
  totalAmount: number;
  transactionCount: number;
}
