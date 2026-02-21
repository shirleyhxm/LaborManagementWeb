import { env } from "../config/env";
import { logApiRequest, logApiError } from "../utils/logger";

export const API_BASE_URL = env.apiBaseUrl;
const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any,
    public isNetworkError: boolean = false
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends ApiError {
  constructor(message: string = "Network request failed") {
    super(message, 0, null, true);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends ApiError {
  constructor(message: string = "Request timeout") {
    super(message, 408, null, true);
    this.name = "TimeoutError";
  }
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Create a fetch request with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = env.apiTimeout
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new TimeoutError(`Request timed out after ${timeout}ms`);
    }

    throw new NetworkError(error.message || 'Network request failed');
  }
}

/**
 * Sleep for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s...
  return Math.min(1000 * Math.pow(2, attempt), 10000);
}

/**
 * Determine if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Retry on network errors and 5xx server errors
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return true;
  }

  if (error instanceof ApiError) {
    // Retry on server errors (5xx) and rate limiting (429)
    return error.status >= 500 || error.status === 429;
  }

  return false;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // Create user-friendly error messages
    let message = errorData.message || response.statusText;

    switch (response.status) {
      case 401:
        message = "Authentication required. Please log in again.";
        break;
      case 403:
        message = "You don't have permission to perform this action.";
        break;
      case 404:
        message = "The requested resource was not found.";
        break;
      case 429:
        message = "Too many requests. Please try again later.";
        break;
      case 500:
        message = "Server error. Please try again later.";
        break;
      case 503:
        message = "Service temporarily unavailable. Please try again later.";
        break;
    }

    throw new ApiError(
      message,
      response.status,
      errorData
    );
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return {} as T;
}

interface RequestOptions {
  headers?: HeadersInit;
  skipRetry?: boolean;
  timeout?: number;
}

/**
 * Make API request with retry logic
 */
async function makeRequest<T>(
  method: string,
  endpoint: string,
  data?: any,
  options?: RequestOptions
): Promise<T> {
  const maxRetries = env.apiMaxRetries;
  let lastError: any;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const requestOptions: RequestInit = {
        method,
        headers: {
          ...getAuthHeaders(),
          ...options?.headers,
        },
      };

      if (data && method !== "GET" && method !== "DELETE") {
        requestOptions.body = JSON.stringify(data);
      }

      const response = await fetchWithTimeout(
        url,
        requestOptions,
        options?.timeout
      );

      const result = await handleResponse<T>(response);

      // Log successful request
      const duration = Date.now() - startTime;
      logApiRequest(method, endpoint, response.status, duration);

      return result;
    } catch (error: any) {
      lastError = error;

      // Log API error
      const status = error instanceof ApiError ? error.status : undefined;
      logApiError(method, endpoint, error, status);

      // Don't retry if explicitly disabled or if error is not retryable
      if (options?.skipRetry || !isRetryableError(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying with exponential backoff
      const delay = getRetryDelay(attempt);

      if (env.isDevelopment) {
        console.warn(
          `Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`,
          error.message
        );
      }

      await sleep(delay);
    }
  }

  // All retries exhausted
  throw lastError;
}

export const api = {
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return makeRequest<T>("GET", endpoint, undefined, options);
  },

  async post<T, D = any>(endpoint: string, data: D, options?: RequestOptions): Promise<T> {
    return makeRequest<T>("POST", endpoint, data, options);
  },

  async put<T, D = any>(endpoint: string, data: D, options?: RequestOptions): Promise<T> {
    return makeRequest<T>("PUT", endpoint, data, options);
  },

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return makeRequest<T>("DELETE", endpoint, undefined, options);
  },

  async patch<T, D = any>(endpoint: string, data: D, options?: RequestOptions): Promise<T> {
    return makeRequest<T>("PATCH", endpoint, data, options);
  },
};