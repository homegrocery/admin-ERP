import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminApi, normalizePhoneNumber } from '../services/adminApi';
import { isOwnerAccount } from '../components/DeleteAccountModule';
import type { AccountMetadata } from '../types/admin';

describe('Admin ERP — Delete Account Module & API Services', () => {
  beforeEach(() => {
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

  describe('normalizePhoneNumber utility', () => {
    it('normalizes standard 10-digit mobile number', () => {
      expect(normalizePhoneNumber('9876543210')).toBe('9876543210');
    });

    it('strips +91 international prefix from mobile number', () => {
      expect(normalizePhoneNumber('+919876543210')).toBe('9876543210');
    });

    it('strips 91 prefix from 12-digit mobile number', () => {
      expect(normalizePhoneNumber('919876543210')).toBe('9876543210');
    });

    it('strips leading 0 from 11-digit mobile number', () => {
      expect(normalizePhoneNumber('09876543210')).toBe('9876543210');
    });

    it('handles formatted mobile number with spaces, parentheses and hyphens', () => {
      expect(normalizePhoneNumber('+91 (98765) 43-210')).toBe('9876543210');
    });

    it('handles empty input gracefully', () => {
      expect(normalizePhoneNumber('')).toBe('');
    });
  });

  describe('isOwnerAccount and eligibleOrdinaryAccounts filtering', () => {
    const ownerAccount: AccountMetadata = {
      id: 'acc-owner-1',
      mobile_number: '9356755100',
      role: 'admin',
      pin_length: 6,
      is_locked: false,
      failed_login_attempts: 0,
      has_active_recovery_code: false,
      has_pending_recovery_request: false,
      created_at: '2026-10-17T10:00:00Z',
      last_login_at: '2026-10-19T10:00:00Z'
    };

    const regularAccount1: AccountMetadata = {
      id: 'acc-user-1',
      mobile_number: '9820027118',
      role: 'user',
      pin_length: 4,
      is_locked: false,
      failed_login_attempts: 0,
      has_active_recovery_code: true,
      has_pending_recovery_request: false,
      created_at: '2026-10-18T10:00:00Z',
      last_login_at: null
    };

    const regularAccount2: AccountMetadata = {
      id: 'acc-user-2',
      mobile_number: '9876543210',
      role: 'user',
      pin_length: 4,
      is_locked: true,
      failed_login_attempts: 5,
      has_active_recovery_code: false,
      has_pending_recovery_request: true,
      created_at: '2026-10-19T10:00:00Z',
      last_login_at: '2026-10-19T11:00:00Z'
    };

    it('identifies owner account by role and mobile number', () => {
      expect(isOwnerAccount(ownerAccount)).toBe(true);
      expect(isOwnerAccount({ ...regularAccount1, role: 'admin' })).toBe(true);
      expect(isOwnerAccount({ ...regularAccount1, mobile_number: '9356755100' })).toBe(true);
    });

    it('returns false for ordinary users and null/undefined', () => {
      expect(isOwnerAccount(regularAccount1)).toBe(false);
      expect(isOwnerAccount(regularAccount2)).toBe(false);
      expect(isOwnerAccount(null)).toBe(false);
      expect(isOwnerAccount(undefined)).toBe(false);
    });

    it('correctly filters ordinary accounts without throwing TDZ ReferenceError', () => {
      const allAccounts = [ownerAccount, regularAccount1, regularAccount2];
      const eligible = allAccounts.filter(a => !isOwnerAccount(a));
      expect(eligible).toHaveLength(2);
      expect(eligible.map(a => a.id)).toEqual(['acc-user-1', 'acc-user-2']);
    });
  });

  describe('adminApi.deleteAccount', () => {
    it('sends correct deletion payload and returns confirmationId with cascaded counts', async () => {
      adminApi.setToken('test-admin-token');

      const mockResponseData = {
        deletedAccountId: 'usr-target-uuid-999',
        confirmationId: 'DEL-ABCD1234-USR999',
        cascadedTables: {
          shopping_items: 5,
          shopping_lists: 2,
          authentication_sessions: 1,
          users: 1
        },
        deletedAt: '2026-10-19T18:00:00.000Z',
        sqliteDeleted: true,
        firestoreDeleted: false
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Account deleted permanently',
          data: mockResponseData
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await adminApi.deleteAccount(
        'usr-target-uuid-999',
        '9876543210',
        'DELETE'
      );

      expect(result).toEqual(mockResponseData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/accounts/usr-target-uuid-999/delete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            confirmMobileNumber: '9876543210',
            confirmationPhrase: 'DELETE'
          })
        })
      );
    });
  });

  describe('Session Expiry and 401 handling', () => {
    it('clears session and dispatches admin:session-expired on 401 response', async () => {
      adminApi.setToken('expired-token');
      adminApi.setAdminUser({
        id: 'usr-admin-1',
        mobile_number: '9356755100',
        role: 'admin',
        pin_length: 6
      });

      let eventFired = false;
      const mockWindow = {
        location: { hostname: 'localhost' },
        dispatchEvent: vi.fn((event: any) => {
          if (event?.type === 'admin:session-expired') {
            eventFired = true;
          }
          return true;
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };
      vi.stubGlobal('window', mockWindow);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Session expired or invalid token' })
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(
        adminApi.deleteAccount('target-id', '9876543210', 'DELETE')
      ).rejects.toThrow('Session expired or invalid token');

      expect(adminApi.getToken()).toBeNull();
      expect(adminApi.getAdminUser()).toBeNull();
      expect(eventFired).toBe(true);
      expect(mockWindow.dispatchEvent).toHaveBeenCalled();
    });
  });
});
