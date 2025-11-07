const API_BASE_URL = "/api";
const TOKEN_KEY = "auth_token";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || `HTTP ${response.status}: ${response.statusText}`,
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
}

export const api = {
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
    });
    return handleResponse<T>(response);
  },

  async post<T, D = any>(endpoint: string, data: D, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },

  async put<T, D = any>(endpoint: string, data: D, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
    });
    return handleResponse<T>(response);
  },
};