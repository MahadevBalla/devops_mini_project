// frontend/src/lib/auth.ts
/**
 * Authentication service for handling user authentication
 */

import { api } from "./api";

// Types matching the backend schemas
export interface UserCreate {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserResponse;
}

export interface SignupResponse {
  message: string;
  email: string;
  verification_required: boolean;
  email_sent: boolean;
  dev_otp?: string; // Only in debug mode
}

export interface EmailVerificationRequest {
  email: string;
}

export interface EmailVerificationConfirm {
  email: string;
  token: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LogoutResponse {
  message: string;
  scope: string;
  tokens_revoked?: number;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage on initialization
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("access_token");
      this.refreshToken = localStorage.getItem("refresh_token");
    }
  }

  /**
   * Set authentication tokens
   */
  private setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
    }
  }

  /**
   * Clear authentication tokens
   */
  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;

    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    }
  }

  /**
   * Get authorization headers
   */
  private getAuthHeaders(): Record<string, string> {
    return this.accessToken
      ? { Authorization: `Bearer ${this.accessToken}` }
      : {};
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Sign up a new user
   */
  async signup(userData: UserCreate): Promise<SignupResponse> {
    const response = await api.post<SignupResponse>("/api/auth/signup", userData);
    return response;
  }

  /**
   * Verify email with OTP
   */
  async verifyEmail(verificationData: EmailVerificationConfirm): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>("/api/auth/verify-email", verificationData);

    // Store tokens and user data
    this.setTokens(response.access_token, response.refresh_token);
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(response.user));
    }

    return response;
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<SignupResponse> {
    const response = await api.post<SignupResponse>("/api/auth/resend-verification", { email });
    return response;
  }

  /**
   * Sign in user
   */
  async login(credentials: UserLogin): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>("/api/auth/login", credentials);

    // Store tokens and user data
    this.setTokens(response.access_token, response.refresh_token);
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(response.user));
    }

    return response;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<TokenResponse> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await api.post<TokenResponse>("/api/auth/refresh", {
      refresh_token: this.refreshToken,
    });

    // Update tokens
    this.setTokens(response.access_token, response.refresh_token);
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(response.user));
    }

    return response;
  }

  /**
   * Get current user profile with automatic token refresh
   */
  async getMe(): Promise<UserResponse> {
    return this.authenticatedRequest(async () => {
      const response = await api.get<UserResponse>("/api/auth/me", this.getAuthHeaders());

      // Update user data in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(response));
      }

      return response;
    });
  }

  /**
   * Logout from current device
   */
  async logout(): Promise<LogoutResponse> {
    if (!this.refreshToken) {
      this.clearTokens();
      return { message: "Already logged out", scope: "local" };
    }

    try {
      const response = await api.post<LogoutResponse>("/api/auth/logout", {
        refresh_token: this.refreshToken,
      });

      this.clearTokens();
      return response;
    } catch (error) {
      // Clear local tokens even if API call fails
      this.clearTokens();
      throw error;
    }
  }

  /**
   * Logout from all devices with automatic token refresh
   */
  async logoutAll(): Promise<LogoutResponse> {
    return this.authenticatedRequest(async () => {
      const response = await api.post<LogoutResponse>("/api/auth/logout-all", {}, this.getAuthHeaders());

      this.clearTokens();
      return response;
    });
  }

  /**
   * Get stored user data
   */
  getStoredUser(): UserResponse | null {
    if (typeof window === "undefined") return null;

    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Make authenticated API request with automatic token refresh
   */
  async authenticatedRequest<T>(
    request: () => Promise<T>
  ): Promise<T> {
    try {
      return await request();
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        (error as { status?: number }).status === 401 &&
        this.refreshToken
      ) {
        try {
          await this.refreshAccessToken();
          return await request();
        } catch {
          this.clearTokens();
          throw error;
        }
      }
      throw error;
    }
  }
}

export const authService = new AuthService();