// frontend/src/lib/api.ts
/**
 * API service for making HTTP requests to the backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiErrorResponse {
  error: string;
  code: string;
  detail?: string;
}

export class ApiException extends Error {
  public readonly status: number;
  public readonly error: ApiErrorResponse;

  constructor(status: number, error: ApiErrorResponse) {
    super(error.error);
    this.name = "ApiException";
    this.status = status;
    this.error = error;
  }
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: Omit<RequestInit, "body"> & { body?: unknown } = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const { body, ...requestOptions } = options;

    const config: RequestInit = { ...requestOptions };

    if (body !== undefined) {
      config.headers = {
        "Content-Type": "application/json",
        ...options.headers,
      };
      config.body = JSON.stringify(body);
    } else {
      config.headers = { ...options.headers };
    }

    try {
      console.log("🌐 Making API request:", {
        method: config.method || "GET",
        url,
        headers: config.headers,
        body: config.body,
      });

      const response = await fetch(url, config);

      // ── 204 / 205 — no body, return early ──────────────────────────────
      if (response.status === 204 || response.status === 205) {
        return undefined as T;
      }

      // Handle different content types
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        let errorData: ApiErrorResponse;
        if (typeof data === "object" && data !== null) {
          if (data.error) {
            errorData = data;
          } else if (data.detail) {
            const detail = data.detail;
            if (typeof detail === "object" && detail !== null && "error" in detail) {
              const detailObj = detail as { error: string; code?: string };
              errorData = { error: detailObj.error, code: detailObj.code ?? "HTTP_ERROR" };
            } else {
              errorData = {
                error: typeof detail === "string" ? detail : JSON.stringify(detail),
                code: "VALIDATION_ERROR",
              };
            }
          } else {
            errorData = { error: JSON.stringify(data), code: "HTTP_ERROR" };
          }
        } else {
          errorData = {
            error: data || "Unknown error occurred",
            code: "HTTP_ERROR",
          };
        }
        throw new ApiException(response.status, errorData);
      }

      return data;
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw new ApiException(0, {
        error: error instanceof Error ? error.message : "Network error",
        code: "NETWORK_ERROR",
      });
    }
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", headers });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data,
      headers,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data,
      headers,
    });
  }

  async delete<T>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", headers });
  }

  async patch<T>(endpoint: string, data?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data,
      headers,
    });
  }
}

export const api = new ApiService();