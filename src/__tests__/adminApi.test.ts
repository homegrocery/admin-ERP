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
    expect(callArgs[0]).toBe('/api/admin/test');
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
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/profile', expect.objectContaining({
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
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/auth/change-pin', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ currentPin: '654321', newPin: '987654', confirmPin: '987654' })
    }));
  });
});
