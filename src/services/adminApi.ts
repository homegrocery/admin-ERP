import type {
  AdminUser,
  AccountMetadata,
  RecoveryRequestItem,
  AuditLogItem,
  ApprovedRecoveryResult,
  DeletionResult,
  VerificationMethod,
  RecoveryRequestStatus
} from '../types/admin';

export const ADMIN_ERP_CANONICAL_URL = 'https://admin-erp-7ze5.onrender.com';

const TOKEN_KEY = 'homegrocery_admin_token';
const ADMIN_KEY = 'homegrocery_admin_user';

/**
 * Resolves the backend API base URL:
 * 1. Checks VITE_API_BASE_URL environment variable (configured in Render for production)
 * 2. In local development on localhost/127.0.0.1, returns empty string (leveraging Vite dev proxy)
 * 3. In production without VITE_API_BASE_URL, returns empty string and warns
 */
export function getApiBaseUrl(): string {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const envBase = (
    env?.VITE_API_BASE_URL ||
    env?.VITE_BACKEND_URL ||
    env?.VITE_API_URL ||
    ''
  ).trim();
  if (envBase) {
    return envBase.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
      return ''; // Vite proxy to local backend
    }
  }

  return '';
}

/**
 * Checks if the backend API has been configured for the current environment.
 */
export function isBackendConfigured(): boolean {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
    return true;
  }
  return Boolean(getApiBaseUrl());
}

export const adminApi = {
  getCanonicalUrl(): string {
    return ADMIN_ERP_CANONICAL_URL;
  },

  getBaseUrl(): string {
    return getApiBaseUrl();
  },

  isBackendConfigured(): boolean {
    return isBackendConfigured();
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  getAdminUser(): AdminUser | null {
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setAdminUser(user: AdminUser): void {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(user));
  },

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const fullUrl = endpoint.startsWith('http')
      ? endpoint
      : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = json?.error || json?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      return json?.data ?? json;
    } catch (err: any) {
      // Helpful diagnostic if running in production without configured backend
      if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com') && !baseUrl) {
        throw new Error(
          'BACKEND_API_NOT_CONFIGURED: The backend API URL is not configured. Please set the VITE_API_BASE_URL environment variable in the Render Dashboard for admin-erp-7ze5.'
        );
      }
      throw err;
    }
  },

  async login(mobileNumber: string, pin: string): Promise<{ token: string; admin: AdminUser }> {
    const res = await this.request<{ token: string; admin?: AdminUser; user?: AdminUser }>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        mobileNumber,
        pin,
        deviceInfo: 'Owner-Admin Web Console'
      })
    });

    const admin = res.admin || res.user;
    if (res.token) {
      this.setToken(res.token);
    }
    if (admin) {
      this.setAdminUser(admin);
    }
    return { token: res.token, admin: admin! };
  },

  async logout(): Promise<void> {
    try {
      await this.request('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      this.clearSession();
    }
  },

  async checkSession(): Promise<{ admin: AdminUser } | null> {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await this.request<{ admin?: AdminUser; user?: AdminUser }>('/api/admin/auth/me');
      const admin = res?.admin || res?.user;
      if (admin) {
        return { admin };
      }
      return null;
    } catch {
      this.clearSession();
      return null;
    }
  },

  async updateProfile(data: { fullName?: string; preferredLanguage?: 'en' | 'mr' }): Promise<{ admin: AdminUser }> {
    const res = await this.request<{ admin?: AdminUser; user?: AdminUser }>('/api/admin/profile', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    const admin = res.admin || res.user;
    if (admin) {
      this.setAdminUser(admin);
    }
    return { admin: admin! };
  },

  async changePin(currentPin: string, newPin: string, confirmPin: string): Promise<{ success: boolean; message: string; messageMr: string; token?: string; admin?: AdminUser }> {
    const res = await this.request<{ success: boolean; message: string; messageMr: string; token?: string; admin?: AdminUser; user?: AdminUser }>('/api/admin/auth/change-pin', {
      method: 'POST',
      body: JSON.stringify({ currentPin, newPin, confirmPin })
    });
    if (res.token) {
      this.setToken(res.token);
    }
    const admin = res.admin || res.user;
    if (admin) {
      this.setAdminUser(admin);
    }
    return {
      success: true,
      message: res.message,
      messageMr: res.messageMr,
      token: res.token,
      admin
    };
  },

  async getAccounts(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}): Promise<{
    accounts: AccountMetadata[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);

    return this.request(`/api/admin/accounts?${query.toString()}`);
  },

  async getRecoveryRequests(params: {
    page?: number;
    limit?: number;
    status?: RecoveryRequestStatus | '';
  } = {}): Promise<{
    requests: RecoveryRequestItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);

    return this.request(`/api/admin/recovery-requests?${query.toString()}`);
  },

  async approveRecoveryRequest(
    requestId: string,
    verificationMethod: VerificationMethod,
    notes?: string
  ): Promise<ApprovedRecoveryResult> {
    return this.request<ApprovedRecoveryResult>(`/api/admin/recovery-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        verificationMethod,
        notes: notes || undefined
      })
    });
  },

  async rejectRecoveryRequest(requestId: string, reason: string): Promise<void> {
    await this.request(`/api/admin/recovery-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  async deleteAccount(
    targetAccountId: string,
    confirmMobileNumber: string,
    confirmationPhrase: string
  ): Promise<DeletionResult> {
    return this.request<DeletionResult>(`/api/admin/accounts/${targetAccountId}/delete`, {
      method: 'POST',
      body: JSON.stringify({
        confirmMobileNumber,
        confirmationPhrase
      })
    });
  },

  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    search?: string;
  } = {}): Promise<{
    logs: AuditLogItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.action) query.append('action', params.action);
    if (params.search) query.append('search', params.search);

    return this.request(`/api/admin/audit-logs?${query.toString()}`);
  }
};
