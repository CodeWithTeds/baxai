import { getApiBaseUrls } from './api';

export interface AuthUser {
  id: number | string;
  name: string;
  username?: string;
  email: string;
  avatar?: string | null;
  email_verified_at?: string | null;
}

export interface AuthResponse {
  status: 'success' | 'error' | 'unverified';
  message?: string;
  needs_verification?: boolean;
  email?: string;
  access_token?: string;
  token_type?: string;
  user?: AuthUser;
  data?: any;
}

function sanitizeOrigin(url?: string | null): string {
  if (!url) return '';
  return url.replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '');
}

/**
 * Helper to make API requests with fallback URLs and clear error reporting.
 */
async function postToAuthEndpoint(endpoint: string, payload: Record<string, any>, token?: string | null): Promise<AuthResponse> {
  const baseUrls = getApiBaseUrls();
  let lastError: Error | null = null;

  for (const origin of baseUrls) {
    const baseUrl = sanitizeOrigin(origin);
    const url = `${baseUrl}/api/v1/${endpoint.replace(/^\/+/, '')}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await res.json().catch(() => null);

      if (res.ok) {
        return {
          status: 'success',
          message: json?.message,
          needs_verification: json?.data?.needs_verification ?? false,
          email: json?.data?.email,
          access_token: json?.data?.access_token,
          token_type: json?.data?.token_type,
          user: json?.data?.user,
          data: json?.data,
        };
      }

      // Handle 403 Unverified Email
      if (res.status === 403 && (json?.needs_verification || json?.status === 'unverified')) {
        return {
          status: 'unverified',
          needs_verification: true,
          email: json?.email || payload.email || payload.identifier,
          message: json?.message || 'Your email is not verified yet. A 4-digit code has been sent.',
        };
      }

      // Handle 422 Validation Error
      if (res.status === 422) {
        let msg = json?.message || 'Validation failed.';
        if (json?.data && typeof json.data === 'object') {
          // Flatten first validation error
          const firstKey = Object.keys(json.data)[0];
          if (firstKey && Array.isArray(json.data[firstKey]) && json.data[firstKey].length > 0) {
            msg = json.data[firstKey][0];
          }
        }
        return {
          status: 'error',
          message: msg,
          data: json?.data,
        };
      }

      // Handle 429 Cooldown
      if (res.status === 429) {
        return {
          status: 'error',
          message: json?.message || 'Please wait before requesting another code.',
          data: json?.data,
        };
      }

      // Other HTTP errors (e.g. 404, 500)
      return {
        status: 'error',
        message: json?.message || `Server error (${res.status}). Please try again.`,
      };
    } catch (e: any) {
      lastError = e;
      // Continue to next origin fallback
    }
  }

  return {
    status: 'error',
    message: lastError?.message || 'Network connection failed. Please check your internet connection.',
  };
}

// ─── Exported Auth API Methods ───────────────────────────────────────────────

export async function apiRegister(payload: {
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
  name?: string;
}): Promise<AuthResponse> {
  return postToAuthEndpoint('register', {
    ...payload,
    name: payload.name || payload.username,
  });
}

export async function apiLogin(payload: {
  identifier: string;
  password: string;
}): Promise<AuthResponse> {
  return postToAuthEndpoint('login', payload);
}

export async function apiVerifyEmail(payload: {
  email: string;
  code: string;
}): Promise<AuthResponse> {
  return postToAuthEndpoint('auth/verify-email', payload);
}

export async function apiResendCode(payload: {
  email: string;
  type: 'email_verification' | 'password_reset';
}): Promise<AuthResponse> {
  return postToAuthEndpoint('auth/resend-code', payload);
}

export async function apiForgotPassword(payload: {
  email: string;
}): Promise<AuthResponse> {
  return postToAuthEndpoint('auth/forgot-password', payload);
}

export async function apiVerifyResetCode(payload: {
  email: string;
  code: string;
}): Promise<AuthResponse> {
  return postToAuthEndpoint('auth/verify-reset-code', payload);
}

export async function apiResetPassword(payload: {
  email: string;
  code: string;
  password: string;
  password_confirmation: string;
}): Promise<AuthResponse> {
  return postToAuthEndpoint('auth/reset-password', payload);
}

export async function apiLogout(token: string | null): Promise<AuthResponse> {
  return postToAuthEndpoint('logout', {}, token);
}
