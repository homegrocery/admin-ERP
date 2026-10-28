import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminApi } from '../services/adminApi';
import { adminTranslations } from '../i18n/adminTranslations';
import { LoginView } from '../components/LoginView';

describe('Build 9 Phase 2: Default Admin Login & Mobile Privacy Verification', () => {
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

  it('adminApi.login(pin) transmits PIN only with NO mobile number in the payload', async () => {
    let capturedBody: any = null;

    const mockFetch = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
      capturedBody = JSON.parse(options.body as string);
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            token: 'default-admin-token-test',
            admin: {
              id: 'owner-uuid-1',
              mobile_number: '9356755100',
              role: 'admin',
              username: 'Default Admin',
              pin_length: 6
            }
          }
        })
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.login('654321');

    expect(res.token).toBe('default-admin-token-test');
    expect(res.admin.role).toBe('admin');
    expect(capturedBody).toBeDefined();
    expect(capturedBody.pin).toBe('654321');
    expect(capturedBody.deviceInfo).toBe('Owner-Admin Web Console');
    // Crucial privacy guarantee: no mobileNumber in payload
    expect(capturedBody.mobileNumber).toBeUndefined();
    expect(Object.keys(capturedBody)).toEqual(['pin', 'deviceInfo']);
  });

  it('adminApi.login(mobileNumber, pin) continues to support explicit mobile number authentication', async () => {
    let capturedBody: any = null;

    const mockFetch = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
      capturedBody = JSON.parse(options.body as string);
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            token: 'custom-admin-token',
            admin: {
              id: 'admin-uuid-2',
              mobile_number: '9876543210',
              role: 'admin',
              pin_length: 4
            }
          }
        })
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await adminApi.login('9876543210', '1234');
    expect(res.token).toBe('custom-admin-token');
    expect(capturedBody.mobileNumber).toBe('9876543210');
    expect(capturedBody.pin).toBe('1234');
  });

  it('LoginView exports properly and renders component function', () => {
    expect(typeof LoginView).toBe('function');
    expect(LoginView.name).toBe('LoginView');
  });

  it('bilingual translations support Default Admin login in English and Marathi', () => {
    expect(adminTranslations.en.defaultAdmin).toBe('Default Admin');
    expect(adminTranslations.mr.defaultAdmin).toBe('Default Admin');
    expect(adminTranslations.en.adminIdentity).toBe('Administrator Identity');
    expect(adminTranslations.mr.adminIdentity).toBe('प्रशासक ओळख');
    expect(adminTranslations.en.showPin).toBe('Show PIN');
    expect(adminTranslations.mr.showPin).toBe('पिन दाखवा');
    expect(adminTranslations.en.hidePin).toBe('Hide PIN');
    expect(adminTranslations.mr.hidePin).toBe('पिन लपवा');
  });
});
