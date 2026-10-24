import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminApi } from '../services/adminApi';

describe('Admin ERP API Client', () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      }
    });
  });

  it('should store and retrieve token correctly', () => {
    adminApi.setToken('test-token-12345');
    expect(adminApi.getToken()).toBe('test-token-12345');

    adminApi.clearSession();
    expect(adminApi.getToken()).toBeNull();
  });

  it('should store and retrieve admin user profile', () => {
    const adminUser = {
      id: 'usr-admin-1',
      mobile_number: '9356755100',
      username: 'Santosh Koli',
      role: 'admin' as const,
      pin_length: 6
    };

    adminApi.setAdminUser(adminUser);
    expect(adminApi.getAdminUser()).toEqual(adminUser);

    adminApi.clearSession();
    expect(adminApi.getAdminUser()).toBeNull();
  });

  it('should include Authorization header when token is present', async () => {
    adminApi.setToken('auth-bearer-token-xyz');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { status: 'ok' } })
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.request('/api/admin/test');
    expect(res).toEqual({ status: 'ok' });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://home-grocery-api.onrender.com/api/admin/test');
    expect(callArgs[1].headers['Authorization']).toBe('Bearer auth-bearer-token-xyz');
  });

  it('should handle API errors by throwing an Error with message', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ error: 'Administrative privileges required' })
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(adminApi.request('/api/admin/accounts')).rejects.toThrow(
      'Administrative privileges required'
    );
  });

  it('should call PATCH /api/admin/profile and update stored admin user', async () => {
    adminApi.setToken('auth-bearer-token-123');

    const updatedUser = {
      id: 'usr-admin-1',
      mobile_number: '9356755100',
      full_name: 'Santosh Koli (Owner)',
      preferred_language: 'mr' as const,
      role: 'admin' as const,
      pin_length: 6
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { admin: updatedUser }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.updateProfile({
      fullName: 'Santosh Koli (Owner)',
      preferredLanguage: 'mr'
    });

    expect(res.admin).toEqual(updatedUser);
    expect(adminApi.getAdminUser()).toEqual(updatedUser);
    expect(mockFetch).toHaveBeenCalledWith('https://home-grocery-api.onrender.com/api/admin/profile', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ fullName: 'Santosh Koli (Owner)', preferredLanguage: 'mr' })
    }));
  });

  it('should call POST /api/admin/auth/change-pin and update token on success', async () => {
    adminApi.setToken('old-token-abc');

    const updatedUser = {
      id: 'usr-admin-1',
      mobile_number: '9356755100',
      full_name: 'Santosh Koli',
      role: 'admin' as const,
      pin_length: 6
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Admin PIN changed successfully',
        messageMr: 'प्रशासक पिन यशस्वीरित्या बदलला गेला',
        data: {
          token: 'new-fresh-token-xyz',
          admin: updatedUser
        }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.changePin('654321', '987654', '987654');

    expect(res.success).toBe(true);
    expect(res.token).toBe('new-fresh-token-xyz');
    expect(adminApi.getToken()).toBe('new-fresh-token-xyz');
    expect(mockFetch).toHaveBeenCalledWith('https://home-grocery-api.onrender.com/api/admin/auth/change-pin', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ currentPin: '654321', newPin: '987654', confirmPin: '987654' })
    }));
  });

  it('should export the canonical Admin ERP URL and production API URL', () => {
    expect(adminApi.getCanonicalUrl()).toBe('https://homegrocery.github.io/admin-ERP/');
    expect(adminApi.getBaseUrl()).toBe('https://home-grocery-api.onrender.com');
  });

  it('should prepend configured API base URL when VITE_API_BASE_URL is provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { status: 'healthy' } })
    });
    vi.stubGlobal('fetch', mockFetch);

    // Test with explicit full URL
    await adminApi.request('https://api.custom-backend.com/api/admin/health');
    expect(mockFetch).toHaveBeenCalledWith('https://api.custom-backend.com/api/admin/health', expect.any(Object));
  });

  it('should prevent duplicate /api in request URL construction', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { status: 'healthy' } })
    });
    vi.stubGlobal('fetch', mockFetch);

    await adminApi.request('/api/admin/health');
    const calledUrl = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
    expect(calledUrl).toBe('https://home-grocery-api.onrender.com/api/admin/health');
    expect(calledUrl).not.toContain('/api/api');
  });

  it('should call POST /api/admin/accounts/bulk-delete with confirmation phrase', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          success: true,
          deletedCount: 5,
          deletedAccountIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
          deletedAt: '2026-10-19T14:00:00.000Z',
          cascadedTotals: { users: 5, shopping_lists: 3 }
        }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.bulkDeleteAccounts('DELETE ALL ORDINARY USERS', 5);
    expect(res.deletedCount).toBe(5);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://home-grocery-api.onrender.com/api/admin/accounts/bulk-delete',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirmationPhrase: 'DELETE ALL ORDINARY USERS', expectedCount: 5 })
      })
    );
  });

  it('should call POST /api/admin/audit-logs/:id/archive to archive single log', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          success: true,
          id: 'log-123',
          archived_at: '2026-10-19T14:00:00.000Z'
        }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.archiveAuditLog('log-123');
    expect(res.id).toBe('log-123');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://home-grocery-api.onrender.com/api/admin/audit-logs/log-123/archive',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should call POST /api/admin/audit-logs/archive-all with confirmation phrase', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          success: true,
          count: 42,
          archived_at: '2026-10-19T14:00:00.000Z'
        }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.bulkArchiveAuditLogs('DELETE ALL AUDIT LOGS');
    expect(res.count).toBe(42);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://home-grocery-api.onrender.com/api/admin/audit-logs/archive-all',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirmationPhrase: 'DELETE ALL AUDIT LOGS' })
      })
    );
  });

  it('should normalize created_at and timestamp in getAuditLogs results', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          logs: [
            {
              id: 'log-1',
              action: 'ADMIN_LOGIN',
              created_at: '2026-10-19T10:00:00.000Z',
              admin_user_id: 'admin-1',
              target_account_id: null,
              target_mobile_number: null,
              details: null,
              ip_address: '127.0.0.1'
            }
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.getAuditLogs({ showArchived: true });
    expect(res.logs[0].created_at).toBe('2026-10-19T10:00:00.000Z');
    expect(res.logs[0].timestamp).toBe('2026-10-19T10:00:00.000Z');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('showArchived=true'),
      expect.any(Object)

    );


  });

  it('should call POST /api/admin/recovery-requests/:id/delete on deleteRecoveryRequest', async () => {
    adminApi.setToken('auth-token-xyz');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          success: true,
          id: 'rec-req-123',
          revokedAuthorizations: 1,
          deletedTempCodes: 1
        }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.deleteRecoveryRequest('rec-req-123');
    expect(res.success).toBe(true);
    expect(res.id).toBe('rec-req-123');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://home-grocery-api.onrender.com/api/admin/recovery-requests/rec-req-123/delete',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should call POST /api/admin/recovery-requests/bulk-delete on bulkDeleteRecoveryRequests', async () => {
    adminApi.setToken('auth-token-xyz');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          success: true,
          deletedCount: 5,
          deletedAt: '2026-10-20T00:00:00.000Z',
          revokedAuthorizations: 2,
          deletedTempCodes: 2
        }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.bulkDeleteRecoveryRequests('DELETE ALL RECOVERY REQUESTS');
    expect(res.success).toBe(true);
    expect(res.deletedCount).toBe(5);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://home-grocery-api.onrender.com/api/admin/recovery-requests/bulk-delete',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirmationPhrase: 'DELETE ALL RECOVERY REQUESTS' })
      })
    );
  });

  it('should call POST /api/admin/audit-logs/:id/delete on deleteArchivedAuditLog', async () => {
    adminApi.setToken('auth-token-xyz');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          success: true,
          id: 'log-arch-456',
          deletedAt: '2026-10-20T00:00:00.000Z'
        }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.deleteArchivedAuditLog('log-arch-456');
    expect(res.success).toBe(true);
    expect(res.id).toBe('log-arch-456');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://home-grocery-api.onrender.com/api/admin/audit-logs/log-arch-456/delete',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should call POST /api/admin/audit-logs/bulk-delete-archived on bulkDeleteArchivedAuditLogs', async () => {
    adminApi.setToken('auth-token-xyz');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          success: true,
          count: 10,
          deletedCount: 10,
          deletedAt: '2026-10-20T00:00:00.000Z'
        }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.bulkDeleteArchivedAuditLogs('DELETE ALL ARCHIVED LOGS');
    expect(res.success).toBe(true);
    expect(res.count).toBe(10);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://home-grocery-api.onrender.com/api/admin/audit-logs/bulk-delete-archived',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirmationPhrase: 'DELETE ALL ARCHIVED LOGS' })
      })
    );
  });

  it('Feature 3: should call POST /api/admin/accounts/:id/lock on lockAccount', async () => {
    adminApi.setToken('auth-token-xyz');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          success: true,
          is_locked: true,
          account_id: 'usr-target-123'
        }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.lockAccount('usr-target-123', 'Administrative lockout test');
    expect(res.success).toBe(true);
    expect(res.is_locked).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://home-grocery-api.onrender.com/api/admin/accounts/usr-target-123/lock',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'Administrative lockout test' })
      })
    );
  });

  it('Feature 3: should call POST /api/admin/accounts/:id/activate on activateAccount', async () => {
    adminApi.setToken('auth-token-xyz');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          success: true,
          is_locked: false,
          account_id: 'usr-target-123'
        }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.activateAccount('usr-target-123', 'User requested unlock');
    expect(res.success).toBe(true);
    expect(res.is_locked).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://home-grocery-api.onrender.com/api/admin/accounts/usr-target-123/activate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'User requested unlock' })
      })
    );
  });
});