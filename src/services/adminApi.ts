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

const TOKEN_KEY = 'homegrocery_admin_token';
const ADMIN_KEY = 'homegrocery_admin_user';

export const adminApi = {
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
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = json?.error || json?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    return json?.data ?? json;
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
