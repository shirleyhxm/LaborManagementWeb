/**
 * A contract document stored against an employee. The file itself is never
 * part of this payload — it is fetched from the download endpoint on demand.
 */
export interface EmployeeContract {
  id: string;
  employeeId: string;
  businessId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface EmployeeContractsList {
  employeeId: string;
  contracts: EmployeeContract[];
}

/** Mirrors MAX_CONTRACT_SIZE_BYTES on the backend, which rejects anything larger. */
export const MAX_CONTRACT_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * What the file picker offers and the backend accepts. Kept in step with
 * ALLOWED_CONTRACT_CONTENT_TYPES server-side.
 */
export const ALLOWED_CONTRACT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

export const CONTRACT_FILE_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

/** Human-readable file size for the document list. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
