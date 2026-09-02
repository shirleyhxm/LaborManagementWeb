import { api, API_BASE_URL, ApiError } from './api';
import type { EmployeeContract, EmployeeContractsList } from '../types/contract';

/**
 * Contract documents for an employee.
 *
 * Listing goes through the shared `api` helper, but uploads and downloads
 * cannot: that helper always sets `Content-Type: application/json` and
 * JSON-stringifies the body, which would corrupt a file going out and mangle
 * one coming back. Those two calls use fetch directly and rebuild the auth
 * headers themselves.
 *
 * Manager calls are scoped to the employee's *home* business — the backend
 * rejects a borrowed employee's id under any other location.
 */

/**
 * Auth headers for the raw-fetch calls, deliberately without Content-Type:
 * the browser must set it itself so the multipart boundary is included.
 */
function fileRequestHeaders(omitBusinessHeader = false): HeadersInit {
  const headers: HeadersInit = {};

  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const userJson = localStorage.getItem('auth_user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user.id) {
        headers['X-User-Id'] = user.id;
      }
    } catch {
      // Matches the shared helper: a malformed user blob just means the
      // header is omitted, it should not stop the request.
    }
  }

  const businessId = omitBusinessHeader ? null : localStorage.getItem('current_business_id');
  if (businessId) {
    headers['X-Business-Id'] = businessId;
  }

  return headers;
}

/** Turn a failed file request into the same ApiError the rest of the app throws. */
async function failedRequestError(response: Response): Promise<ApiError> {
  const data = await response.json().catch(() => ({} as { error?: string; message?: string }));
  return new ApiError(
    data.message || data.error || response.statusText || 'Request failed',
    response.status,
    data
  );
}

/**
 * Hand a downloaded file to the browser as a save prompt.
 *
 * The bytes arrive over an authenticated request, so they cannot simply be
 * linked to — they are turned into a temporary object URL, clicked, and
 * revoked.
 */
function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadFrom(
  endpoint: string,
  fileName: string,
  omitBusinessHeader = false
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: fileRequestHeaders(omitBusinessHeader),
  });

  if (!response.ok) {
    throw await failedRequestError(response);
  }

  saveBlob(await response.blob(), fileName);
}

export const contractService = {
  /**
   * Every contract held for this employee, newest first. Manager view.
   */
  async getContracts(businessId: string, employeeId: string): Promise<EmployeeContractsList> {
    return api.get<EmployeeContractsList>(
      `/businesses/${businessId}/employees/${employeeId}/contracts`
    );
  },

  async uploadContract(
    businessId: string,
    employeeId: string,
    file: File
  ): Promise<EmployeeContract> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${API_BASE_URL}/businesses/${businessId}/employees/${employeeId}/contracts`,
      {
        method: 'POST',
        headers: fileRequestHeaders(),
        body: formData,
      }
    );

    if (!response.ok) {
      throw await failedRequestError(response);
    }

    return response.json();
  },

  async downloadContract(
    businessId: string,
    employeeId: string,
    contractId: string,
    fileName: string
  ): Promise<void> {
    return downloadFrom(
      `/businesses/${businessId}/employees/${employeeId}/contracts/${contractId}/download`,
      fileName
    );
  },

  async deleteContract(
    businessId: string,
    employeeId: string,
    contractId: string
  ): Promise<void> {
    return api.delete<void>(
      `/businesses/${businessId}/employees/${employeeId}/contracts/${contractId}`
    );
  },

  /**
   * The signed-in employee's own contracts. Read-only, and not business-scoped
   * — the backend resolves the employee from the token, so the caller cannot
   * ask for anyone else's documents.
   */
  async getMyContracts(): Promise<EmployeeContractsList> {
    return api.get<EmployeeContractsList>('/employees/me/contracts', {
      omitBusinessHeader: true,
    });
  },

  async downloadMyContract(contractId: string, fileName: string): Promise<void> {
    // Same reasoning as getMyContracts: not business-scoped, so a stale id
    // from a previous session should not travel with the request.
    return downloadFrom(`/employees/me/contracts/${contractId}/download`, fileName, true);
  },
};
