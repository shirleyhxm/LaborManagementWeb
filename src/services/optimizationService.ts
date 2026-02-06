import { API_BASE_URL } from './api';
import type {
  OptimizationRequestV2,
  OptimizationJobResponse,
  OptimizationJobStatus,
  WorkerImportResponse,
} from '../types/optimization';

const API_V2_BASE = `${API_BASE_URL}/v2`;

/**
 * V2 Optimization API Service
 * Provides simplified, optimization-focused workflow
 */

/**
 * Submit a new optimization job
 */
export async function submitOptimization(
  request: OptimizationRequestV2
): Promise<OptimizationJobResponse> {
  const response = await fetch(`${API_V2_BASE}/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit optimization');
  }

  return response.json();
}

/**
 * Get optimization job status and results
 */
export async function getOptimizationStatus(
  jobId: string
): Promise<OptimizationJobStatus> {
  const response = await fetch(`${API_V2_BASE}/optimize/${jobId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get optimization status');
  }

  return response.json();
}

/**
 * Poll for optimization completion
 * @param jobId Job ID to poll
 * @param intervalMs Polling interval in milliseconds (default: 1000)
 * @param timeoutMs Max time to wait in milliseconds (default: 60000)
 * @param onProgress Optional callback for progress updates
 */
export async function pollOptimizationStatus(
  jobId: string,
  intervalMs: number = 1000,
  timeoutMs: number = 60000,
  onProgress?: (status: OptimizationJobStatus) => void
): Promise<OptimizationJobStatus> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const status = await getOptimizationStatus(jobId);

        // Call progress callback if provided
        if (onProgress) {
          onProgress(status);
        }

        // Check if completed
        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          clearInterval(interval);
          resolve(status);
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          clearInterval(interval);
          reject(new Error('Optimization timed out'));
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, intervalMs);
  });
}

/**
 * Import workers from CSV content
 */
export async function importWorkersFromCsv(
  csvContent: string
): Promise<WorkerImportResponse> {
  const response = await fetch(`${API_BASE_URL}/employees/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/csv',
    },
    body: csvContent,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to import workers');
  }

  return response.json();
}

/**
 * Get CSV template for worker import
 */
export async function getWorkerImportTemplate(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/employees/import/template`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get template');
  }

  return response.text();
}

/**
 * Export optimization results to CSV
 */
export function exportResultsToCsv(status: OptimizationJobStatus): string {
  if (!status.results) {
    throw new Error('No results available to export');
  }

  const lines: string[] = [];

  // Header
  lines.push('Worker,Day,Start Time,End Time,Duration (hrs),Pay Rate,Is Overtime,Total Pay');

  // Assignments
  status.results.assignments.forEach((assignment) => {
    assignment.shifts.forEach((shift) => {
      const pay = shift.duration * shift.payRate;
      lines.push(
        `"${assignment.workerName}",${shift.day},${shift.startTime},${shift.endTime},${shift.duration},${shift.payRate},${shift.isOvertime ? 'Yes' : 'No'},${pay.toFixed(2)}`
      );
    });
  });

  // Add summary
  lines.push('');
  lines.push('Summary');
  lines.push(`Total Labor Cost,$${status.results.metrics.totalLaborCost.toFixed(2)}`);
  lines.push(`Total Hours,${status.results.metrics.totalHours.toFixed(1)}`);
  lines.push(`Coverage,${status.results.metrics.coveragePercent.toFixed(1)}%`);
  lines.push(`Number of Workers,${status.results.metrics.numberOfWorkers}`);
  lines.push(`Number of Shifts,${status.results.metrics.numberOfShifts}`);
  lines.push(`Average Utilization,${status.results.metrics.averageUtilization.toFixed(1)}%`);
  lines.push(`Solve Status,${status.solveStatus}`);
  lines.push(`Is Optimal,${status.results.isOptimal ? 'Yes' : 'No'}`);
  lines.push(`Solve Time,${status.solveTimeMs}ms`);

  return lines.join('\n');
}

/**
 * Download CSV file
 */
export function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
