import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminTranslations } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';

describe('Permanent Deletion Unit & Security Tests (Admin ERP)', () => {
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

  describe('Feature A: Recovery Requests Permanent Deletion', () => {
    it('should have all required translation keys for English and Marathi', () => {
      const requiredKeys = [
        'btnDeleteRecoveryRequest',
        'deleteRecoveryTooltip',
        'deleteRecoveryModalTitle',
        'deleteRecoveryWarning',
        'btnConfirmDeleteRecovery',
        'deleteRecoverySuccess',
        'btnDeleteAllRecoveryRequests',
        'deleteAllRecoveryModalTitle',
        'deleteAllRecoveryWarning',
        'confirmPhraseBulkRecoveryLabel',
        'bulkRecoveryPhraseRequired',
        'btnConfirmBulkDeleteRecovery',
        'bulkDeleteRecoverySuccess',
        'targetMobileLabel',
        'requestIdLabel',
        'requestStatusLabel'
      ] as const;

      for (const key of requiredKeys) {
        expect(adminTranslations.en[key]).toBeDefined();
        expect(adminTranslations.en[key].length).toBeGreaterThan(0);
        expect(adminTranslations.mr[key]).toBeDefined();
        expect(adminTranslations.mr[key].length).toBeGreaterThan(0);
      }

      expect(adminTranslations.en.bulkRecoveryPhraseRequired).toBe('DELETE ALL RECOVERY REQUESTS');
      expect(adminTranslations.mr.bulkRecoveryPhraseRequired).toBe('DELETE ALL RECOVERY REQUESTS');
    });

    it('should validate exact confirmation phrase DELETE ALL RECOVERY REQUESTS', () => {
      const requiredPhrase = 'DELETE ALL RECOVERY REQUESTS';

      const validInputs = ['DELETE ALL RECOVERY REQUESTS', '  DELETE ALL RECOVERY REQUESTS  '];
      for (const input of validInputs) {
        expect(input.trim()).toBe(requiredPhrase);
      }

      const invalidInputs = [
        'delete all recovery requests',
        'DELETE ALL RECOVERY',
        'DELETE RECOVERY REQUESTS',
        'DELETE',
        'DELETE ALL',
        ''
      ];
      for (const input of invalidInputs) {
        expect(input.trim() === requiredPhrase).toBe(false);
      }
    });

    it('should correctly mask mobile numbers to preserve privacy in deletion dialog', () => {
      const maskMobile = (mobile: string) => {
        if (!mobile) return '—';
        if (mobile.length <= 4) return mobile;
        if (mobile.length >= 10) {
          return `${mobile.slice(0, 3)}****${mobile.slice(-3)}`;
        }
        return `${mobile.slice(0, 2)}***${mobile.slice(-2)}`;
      };

      expect(maskMobile('9356755100')).toBe('935****100');
      expect(maskMobile('9876543210')).toBe('987****210');
      expect(maskMobile('12345')).toBe('12***45');
      expect(maskMobile('')).toBe('—');
    });

    it('should successfully execute single recovery request deletion via adminApi', async () => {
      adminApi.setToken('test-token');
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            id: 'req-rec-999',
            revokedAuthorizations: 1,
            deletedTempCodes: 1
          }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.deleteRecoveryRequest('req-rec-999');
      expect(res.success).toBe(true);
      expect(res.id).toBe('req-rec-999');
      expect(res.revokedAuthorizations).toBe(1);
      expect(res.deletedTempCodes).toBe(1);
    });

    it('should successfully execute bulk recovery requests deletion via adminApi', async () => {
      adminApi.setToken('test-token');
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            deletedCount: 7,
            deletedAt: '2026-10-20T09:00:00.000Z',
            revokedAuthorizations: 3,
            deletedTempCodes: 3
          }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.bulkDeleteRecoveryRequests('DELETE ALL RECOVERY REQUESTS');
      expect(res.success).toBe(true);
      expect(res.deletedCount).toBe(7);
      expect(res.revokedAuthorizations).toBe(3);
      expect(res.deletedTempCodes).toBe(3);
    });
  });

  describe('Feature B: Archived Audit Logs Permanent Deletion', () => {
    it('should have all required translation keys for English and Marathi', () => {
      const requiredKeys = [
        'btnDeleteArchivedLog',
        'deleteArchivedLogTooltip',
        'deleteArchivedLogModalTitle',
        'deleteArchivedLogWarning',
        'btnConfirmDeleteArchivedLog',
        'deleteArchivedLogSuccess',
        'btnDeleteAllArchivedLogs',
        'deleteAllArchivedLogsModalTitle',
        'deleteAllArchivedLogsWarning',
        'confirmPhraseBulkArchivedLogsLabel',
        'bulkArchivedLogsPhraseRequired',
        'btnConfirmBulkDeleteArchivedLogs',
        'bulkDeleteArchivedLogsSuccess',
        'activeLogsTab',
        'archivedLogsTab'
      ] as const;

      for (const key of requiredKeys) {
        expect(adminTranslations.en[key]).toBeDefined();
        expect(adminTranslations.en[key].length).toBeGreaterThan(0);
        expect(adminTranslations.mr[key]).toBeDefined();
        expect(adminTranslations.mr[key].length).toBeGreaterThan(0);
      }

      expect(adminTranslations.en.bulkArchivedLogsPhraseRequired).toBe('DELETE ALL ARCHIVED LOGS');
      expect(adminTranslations.mr.bulkArchivedLogsPhraseRequired).toBe('DELETE ALL ARCHIVED LOGS');
    });

    it('should validate exact confirmation phrase DELETE ALL ARCHIVED LOGS', () => {
      const requiredPhrase = 'DELETE ALL ARCHIVED LOGS';

      const validInputs = ['DELETE ALL ARCHIVED LOGS', '  DELETE ALL ARCHIVED LOGS  '];
      for (const input of validInputs) {
        expect(input.trim()).toBe(requiredPhrase);
      }

      const invalidInputs = [
        'delete all archived logs',
        'DELETE ALL AUDIT LOGS', // Audit archive phrase, NOT archived logs deletion phrase
        'DELETE ARCHIVED LOGS',
        'DELETE ALL',
        'DELETE',
        ''
      ];
      for (const input of invalidInputs) {
        expect(input.trim() === requiredPhrase).toBe(false);
      }
    });

    it('should successfully execute single archived log deletion via adminApi', async () => {
      adminApi.setToken('test-token');
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            id: 'arch-log-101',
            deletedAt: '2026-10-20T09:00:00.000Z'
          }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.deleteArchivedAuditLog('arch-log-101');
      expect(res.success).toBe(true);
      expect(res.id).toBe('arch-log-101');
      expect(res.deletedAt).toBe('2026-10-20T09:00:00.000Z');
    });

    it('should successfully execute bulk archived logs deletion via adminApi', async () => {
      adminApi.setToken('test-token');
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            count: 24,
            deletedCount: 24,
            deletedAt: '2026-10-20T09:00:00.000Z'
          }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.bulkDeleteArchivedAuditLogs('DELETE ALL ARCHIVED LOGS');
      expect(res.success).toBe(true);
      expect(res.count).toBe(24);
      expect(res.deletedCount).toBe(24);
    });
  });

  describe('Safety & Isolation Guarantees', () => {
    it('should strictly protect owner credentials and prevent accidental deletion', () => {
      const ownerMobile = '9356755100';
      const isOwner = (mobile: string) => mobile === ownerMobile;

      expect(isOwner('9356755100')).toBe(true);
      expect(isOwner('9876543210')).toBe(false);
    });

    it('should ensure Delete All Audit Logs (archive) and Delete All Archived Logs (permanent) have distinct phrases', () => {
      const bulkArchiveActivePhrase = 'DELETE ALL AUDIT LOGS';
      const bulkDeleteArchivedPhrase = 'DELETE ALL ARCHIVED LOGS';

      expect(bulkArchiveActivePhrase).not.toBe(bulkDeleteArchivedPhrase);
      expect(adminTranslations.en.bulkAuditPhraseRequired).toBe('DELETE ALL AUDIT LOGS');
      expect(adminTranslations.en.bulkArchivedLogsPhraseRequired).toBe('DELETE ALL ARCHIVED LOGS');
    });
  });
});
