import type {
  AdminUser,
  AccountMetadata,
  RecoveryRequestItem,
  AuditLogItem,
  ApprovedRecoveryResult,
  DeletionResult,
  BulkDeletionResult,
  AuditArchiveResult,
  RecoveryDeletionResult,
  BulkRecoveryDeletionResult,
  ArchivedLogDeletionResult,
  BulkArchivedLogDeletionResult,
  VerificationMethod,
  RecoveryRequestStatus,
  AccountLockResult,
  LoginAttemptItem,
  ReactivationRequestItem,
  FreshnessMarkers,
  FreshnessSummary,
  WebsiteContentData,
  PublicAnnouncementItem,
  ReleaseRecordItem,
  WebsiteOverviewData
} from '../types/admin';

export const ADMIN_ERP_CANONICAL_URL = 'https://homegrocery.github.io/admin-ERP/';
export const PRODUCTION_API_URL = 'https://home-grocery-api.onrender.com';

const TOKEN_KEY = 'homegrocery_admin_token';
const ADMIN_KEY = 'homegrocery_admin_user';

/**
 * Resolves the backend API base URL:
 * 1. Checks VITE_API_BASE_URL environment variable (configured in Render for production)
 * 2. In local development on localhost/127.0.0.1, returns empty string (leveraging Vite dev proxy)
 * 3. In production, falls back to canonical PRODUCTION_API_URL (https://home-grocery-api.onrender.com)
 * 4. Normalizes any trailing slashes or duplicate /api suffixes
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
    return envBase.replace(/\/+$/, '').replace(/\/api$/, '');
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
      return ''; // Vite proxy to local backend
    }
  }

  return PRODUCTION_API_URL;
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

export function normalizePhoneNumber(input: string): string {
  if (!input) return '';
  const digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
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
    const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
    let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (!path.startsWith('/api') && !path.startsWith('http')) {
      path = `/api${path}`;
    }
    const fullUrl = endpoint.startsWith('http')
      ? endpoint
      : `${baseUrl}${path}`;

    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutMs = 25000;
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        signal: options.signal || controller.signal
      });
      clearTimeout(timeoutId);

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          this.clearSession();
          if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('admin:session-expired'));
          }
        }
        const errorMsg = json?.error || json?.message || `HTTP ${response.status}: ${response.statusText}`;
        const err: any = new Error(errorMsg);
        err.status = response.status;
        throw err;
      }

      return json?.data ?? json;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('REQUEST_TIMEOUT: Request timed out. The backend server may be waking up, please retry.');
      }
      // Helpful diagnostic if running in production without configured backend
      if (typeof window !== 'undefined' && !baseUrl && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new Error(
          'BACKEND_API_NOT_CONFIGURED: The backend API URL is not configured.'
        );
      }
      throw err;
    }
  },

  async login(mobileOrPin: string, maybePin?: string): Promise<{ token: string; admin: AdminUser }> {
    const payload: { pin: string; deviceInfo: string; mobileNumber?: string } = {
      pin: maybePin !== undefined ? maybePin : mobileOrPin,
      deviceInfo: 'Owner-Admin Web Console'
    };
    if (maybePin !== undefined) {
      payload.mobileNumber = mobileOrPin;
    }

    const res = await this.request<{ token: string; admin?: AdminUser; user?: AdminUser }>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
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

  async deleteRecoveryRequest(requestId: string): Promise<RecoveryDeletionResult> {
    return this.request<RecoveryDeletionResult>(`/api/admin/recovery-requests/${requestId}/delete`, {
      method: 'POST'
    });
  },

  async bulkDeleteRecoveryRequests(confirmationPhrase: string): Promise<BulkRecoveryDeletionResult> {
    return this.request<BulkRecoveryDeletionResult>('/api/admin/recovery-requests/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ confirmationPhrase })
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

  async bulkDeleteAccounts(
    confirmationPhrase: string,
    expectedCount?: number
  ): Promise<BulkDeletionResult> {
    return this.request<BulkDeletionResult>('/api/admin/accounts/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({
        confirmationPhrase,
        expectedCount
      })
    });
  },

  async lockAccount(targetAccountId: string, reason?: string): Promise<AccountLockResult> {
    return this.request<AccountLockResult>(`/api/admin/accounts/${targetAccountId}/lock`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  async activateAccount(targetAccountId: string, reason?: string): Promise<AccountLockResult> {
    return this.request<AccountLockResult>(`/api/admin/accounts/${targetAccountId}/activate`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  async getLoginAttempts(params: {
    page?: number;
    limit?: number;
    userId?: string;
    mobileNumber?: string;
  } = {}): Promise<{
    attempts: LoginAttemptItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.userId) query.append('userId', params.userId);
    if (params.mobileNumber) query.append('mobileNumber', params.mobileNumber);

    return this.request(`/api/admin/login-attempts?${query.toString()}`);
  },

  async getAccountLoginAttempts(
    accountId: string,
    page?: number,
    limit?: number
  ): Promise<{
    attempts: LoginAttemptItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (page) query.append('page', String(page));
    if (limit) query.append('limit', String(limit));

    return this.request(`/api/admin/accounts/${accountId}/login-attempts?${query.toString()}`);
  },

  async getReactivationRequests(params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{
    requests: ReactivationRequestItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status && params.status !== 'ALL') query.append('status', params.status);

    return this.request(`/api/admin/reactivation-requests?${query.toString()}`);
  },

  async approveReactivationRequest(requestId: string, notes?: string): Promise<{ success: boolean; message: string; messageMr: string }> {
    return this.request(`/api/admin/reactivation-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  },

  async rejectReactivationRequest(requestId: string, reason?: string): Promise<{ success: boolean; message: string; messageMr: string }> {
    return this.request(`/api/admin/reactivation-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  async archiveAuditLog(id: string): Promise<AuditArchiveResult> {
    return this.request<AuditArchiveResult>(`/api/admin/audit-logs/${id}/archive`, {
      method: 'POST'
    });
  },

  async bulkArchiveAuditLogs(confirmationPhrase: string): Promise<AuditArchiveResult> {
    return this.request<AuditArchiveResult>('/api/admin/audit-logs/archive-all', {
      method: 'POST',
      body: JSON.stringify({
        confirmationPhrase
      })
    });
  },

  async deleteArchivedAuditLog(id: string): Promise<ArchivedLogDeletionResult> {
    return this.request<ArchivedLogDeletionResult>(`/api/admin/audit-logs/${id}/delete`, {
      method: 'POST'
    });
  },

  async bulkDeleteArchivedAuditLogs(confirmationPhrase: string): Promise<BulkArchivedLogDeletionResult> {
    return this.request<BulkArchivedLogDeletionResult>('/api/admin/audit-logs/bulk-delete-archived', {
      method: 'POST',
      body: JSON.stringify({ confirmationPhrase })
    });
  },

  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    search?: string;
    showArchived?: boolean;
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
    if (params.showArchived) query.append('showArchived', 'true');

    const res = await this.request<{
      logs: AuditLogItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/admin/audit-logs?${query.toString()}`);

    // Normalize each log item to ensure both created_at and timestamp are populated
    const normalizedLogs = (res.logs || []).map(log => ({
      ...log,
      created_at: log.created_at || log.timestamp || '',
      timestamp: log.timestamp || log.created_at || ''
    }));

    return {
      ...res,
      logs: normalizedLogs
    };
  },

  /**
   * Universal Change-Detection / Freshness Polling (Build 9 Phase 1.5)
   * Fetches lightweight state markers and summary counts from /api/admin/system/freshness.
   * If server responds with HTTP 304, returns { notModified: true } without payload.
   */
  async getFreshness(ifNoneMatch?: string | null): Promise<{
    notModified: boolean;
    etag?: string;
    markers?: FreshnessMarkers;
    summary?: FreshnessSummary;
    serverTime?: string;
  }> {
    const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
    const fullUrl = `${baseUrl}/api/admin/system/freshness`;
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (ifNoneMatch) {
      headers['If-None-Match'] = `"${ifNoneMatch.replace(/W\/|"|'/g, '')}"`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.status === 304) {
        return { notModified: true, etag: ifNoneMatch || undefined };
      }

      if (response.status === 401) {
        this.clearSession();
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('admin:session-expired'));
        }
        throw new Error('UNAUTHORIZED: Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawEtag = response.headers.get('ETag');
      const cleanEtag = rawEtag ? rawEtag.replace(/W\/|"|'/g, '').trim() : undefined;
      const json = await response.json();
      const payload = json?.data ?? json;

      return {
        notModified: false,
        etag: payload?.etag || cleanEtag,
        markers: payload?.markers,
        summary: payload?.summary,
        serverTime: payload?.serverTime
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  },

  // Build 9 Phase 2.5: Website & Release Control API Methods
  async getWebsiteOverview(): Promise<WebsiteOverviewData> {
    const res = await this.request<any>('/api/admin/website-control/overview');
    return res?.data ?? res;
  },

  async getWebsiteContent(): Promise<{ published: { content: WebsiteContentData; revision: number; publishedAt: string | null }; draft: { content: WebsiteContentData; revision: number } }> {
    const res = await this.request<any>('/api/admin/website-control/content');
    return res?.data ?? res;
  },

  async saveWebsiteDraft(content: Partial<WebsiteContentData>): Promise<any> {
    const res = await this.request<any>('/api/admin/website-control/content/draft', {
      method: 'PUT',
      body: JSON.stringify(content)
    });
    return res?.data ?? res;
  },

  async publishWebsiteContent(publishNotes?: string): Promise<any> {
    const res = await this.request<any>('/api/admin/website-control/content/publish', {
      method: 'POST',
      body: JSON.stringify({ publishNotes })
    });
    return res?.data ?? res;
  },

  async getAdminAnnouncements(status?: string, category?: string): Promise<PublicAnnouncementItem[]> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<any>(`/api/admin/website-control/announcements${qs}`);
    const data = res?.data ?? res;
    return Array.isArray(data) ? data : data?.announcements ?? [];
  },

  async createAnnouncement(data: {
    titleEn?: string;
    titleMr?: string;
    title?: string;
    contentEn?: string;
    contentMr?: string;
    content?: string;
    category?: string;
    status?: string;
    expiresAt?: string | null;
    safeLinks?: Array<{ label: string; url: string }>;
  }): Promise<PublicAnnouncementItem> {
    const res = await this.request<any>('/api/admin/website-control/announcements', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const dataObj = res?.data ?? res;
    return dataObj?.announcement ?? dataObj;
  },

  async updateAnnouncement(id: string, data: Partial<{
    titleEn?: string;
    titleMr?: string;
    title?: string;
    contentEn?: string;
    contentMr?: string;
    content?: string;
    category?: string;
    status?: string;
    expiresAt?: string | null;
    safeLinks?: Array<{ label: string; url: string }>;
  }>): Promise<PublicAnnouncementItem> {
    const res = await this.request<any>(`/api/admin/website-control/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    const dataObj = res?.data ?? res;
    return dataObj?.announcement ?? dataObj;
  },

  async publishAnnouncement(id: string): Promise<PublicAnnouncementItem> {
    const res = await this.request<any>(`/api/admin/website-control/announcements/${id}/publish`, {
      method: 'POST'
    });
    const dataObj = res?.data ?? res;
    return dataObj?.announcement ?? dataObj;
  },

  async unpublishAnnouncement(id: string): Promise<PublicAnnouncementItem> {
    const res = await this.request<any>(`/api/admin/website-control/announcements/${id}/unpublish`, {
      method: 'POST'
    });
    const dataObj = res?.data ?? res;
    return dataObj?.announcement ?? dataObj;
  },

  async archiveAnnouncement(id: string): Promise<PublicAnnouncementItem> {
    const res = await this.request<any>(`/api/admin/website-control/announcements/${id}/archive`, {
      method: 'POST'
    });
    const dataObj = res?.data ?? res;
    return dataObj?.announcement ?? dataObj;
  },

  async deleteAnnouncement(id: string): Promise<{ success: boolean }> {
    const res = await this.request<any>(`/api/admin/website-control/announcements/${id}`, {
      method: 'DELETE'
    });
    return res?.data ?? res;
  },

  async getReleases(): Promise<{ releases: ReleaseRecordItem[]; activeRelease: ReleaseRecordItem | null }> {
    const res = await this.request<any>('/api/admin/website-control/releases');
    return res?.data ?? res;
  },

  async createReleaseDraft(data: {
    versionName: string;
    buildNumber: number;
    versionCode: number;
    channel?: 'STABLE' | 'BETA';
    releaseNotes?: string;
    releaseNotesEn?: string;
    releaseNotesMr?: string;
    isMandatory?: boolean;
    minSupportedBuild?: number;
    apkFilename?: string;
  }): Promise<ReleaseRecordItem> {
    const res = await this.request<any>('/api/admin/website-control/releases', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const dataObj = res?.data ?? res;
    return dataObj?.release ?? dataObj;
  },

  async triggerReleaseBuild(id: string, buildMode?: string): Promise<any> {
    const res = await this.request<any>(`/api/admin/website-control/releases/${id}/build`, {
      method: 'POST',
      body: JSON.stringify({ buildMode })
    });
    return res?.data ?? res;
  },

  async getReleaseLogs(id: string): Promise<any> {
    const res = await this.request<any>(`/api/admin/website-control/releases/${id}/logs`);
    return res?.data ?? res;
  },

  async verifyReleaseArtifact(id: string, sha256?: string, sizeBytes?: number, downloadUrl?: string): Promise<any> {
    const res = await this.request<any>(`/api/admin/website-control/releases/${id}/verify-artifact`, {
      method: 'POST',
      body: JSON.stringify({ sha256, sizeBytes, downloadUrl })
    });
    return res?.data ?? res;
  },

  getReleaseDownloadUrl(id: string): string {
    const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
    const token = this.getToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${baseUrl}/api/admin/website-control/releases/${id}/download${tokenParam}`;
  },

  async publishRelease(id: string): Promise<any> {
    const res = await this.request<any>(`/api/admin/website-control/releases/${id}/publish`, {
      method: 'POST'
    });
    return res?.data ?? res;
  },

  async rollbackRelease(id: string, targetReleaseId?: string): Promise<any> {
    const res = await this.request<any>(`/api/admin/website-control/releases/${id}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ targetReleaseId })
    });
    return res?.data ?? res;
  }
};
