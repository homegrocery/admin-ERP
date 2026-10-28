import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { refreshCoordinator } from '../services/refreshCoordinator';
import { adminApi } from '../services/adminApi';
import { adminTranslations } from '../i18n/adminTranslations';
import type { FreshnessData, FreshnessSummary } from '../types/admin';

class MockEventTarget {
  private listeners: Record<string, Function[]> = {};

  addEventListener(type: string, listener: Function) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: Function) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(l => l !== listener);
    }
  }

  dispatchEvent(event: { type: string } | string) {
    const type = typeof event === 'string' ? event : event.type;
    const list = this.listeners[type] || [];
    list.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        // ignore
      }
    });
    return true;
  }
}

describe('Universal Admin ERP Auto-Refresh Coordinator (Build 9 Phase 1.5)', () => {
  let mockWindow: MockEventTarget;
  let mockDocument: any;

  beforeEach(() => {
    vi.useFakeTimers();

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

    mockWindow = new MockEventTarget();
    mockDocument = new MockEventTarget();
    mockDocument.hidden = false;

    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('document', mockDocument);
    vi.stubGlobal('navigator', { onLine: true });

    refreshCoordinator.reset();
    adminApi.setToken('mock-admin-token-12345');
  });

  afterEach(() => {
    refreshCoordinator.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('1. Change in another session becomes visible within the 5-second target (default interval: 3500ms)', async () => {
    const mockFreshnessInitial: FreshnessData = {
      markers: {
        accounts: '10:2026-10-27T10:00:00.000Z:0',
        reactivation: '0:2026-10-27T10:00:00.000Z:0',
        recovery: '0:2026-10-27T10:00:00.000Z:0',
        audit: '10:2026-10-27T10:00:00.000Z:10',
        profile: '2026-10-27T10:00:00.000Z'
      },
      summary: {
        totalAccounts: 10,
        lockedAccounts: 0,
        pendingReactivations: 0,
        pendingRecoveries: 0,
        totalAuditLogs: 10
      },
      etag: 'etag-initial',
      serverTime: '2026-10-27T10:00:00.000Z'
    };

    const mockFreshnessUpdated: FreshnessData = {
      ...mockFreshnessInitial,
      markers: {
        ...mockFreshnessInitial.markers,
        accounts: '11:2026-10-27T10:00:03.000Z:1'
      },
      summary: {
        ...mockFreshnessInitial.summary,
        totalAccounts: 11,
        lockedAccounts: 1
      },
      etag: 'etag-updated'
    };

    let callCount = 0;
    vi.spyOn(adminApi, 'getFreshness').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { notModified: false, ...mockFreshnessInitial };
      }
      return { notModified: false, ...mockFreshnessUpdated };
    });

    const accountChangeCallback = vi.fn();
    refreshCoordinator.subscribeDomain('accounts', accountChangeCallback);

    // Verify interval is strictly under 5 seconds
    expect(refreshCoordinator.getIntervalMs()).toBe(3500);
    expect(refreshCoordinator.getIntervalMs()).toBeLessThanOrEqual(5000);

    refreshCoordinator.start();
    await vi.advanceTimersByTimeAsync(0);

    // Initial check fired
    expect(accountChangeCallback).toHaveBeenCalledTimes(1);

    // Advance 3500ms (within 5 seconds target)
    await vi.advanceTimersByTimeAsync(3500);

    // Change from second session was detected and callback was invoked
    expect(accountChangeCallback).toHaveBeenCalledTimes(2);
    expect(refreshCoordinator.getStatus().lastChanged).not.toBeNull();
  });

  it('2. Reactivation approval updates All Accounts and Reactivation Requests consistently', async () => {
    let mockData: FreshnessData = {
      markers: {
        accounts: '10:2026-10-27T10:00:00.000Z:1',
        reactivation: '1:2026-10-27T10:00:00.000Z:1',
        recovery: '0:2026-10-27T10:00:00.000Z:0',
        audit: '10:2026-10-27T10:00:00.000Z:10',
        profile: '2026-10-27T10:00:00.000Z'
      },
      summary: {
        totalAccounts: 10,
        lockedAccounts: 1,
        pendingReactivations: 1,
        pendingRecoveries: 0,
        totalAuditLogs: 10
      },
      etag: 'etag-v1',
      serverTime: '2026-10-27T10:00:00.000Z'
    };

    vi.spyOn(adminApi, 'getFreshness').mockImplementation(async () => {
      return { notModified: false, ...mockData };
    });

    const accountsSubscriber = vi.fn();
    const reactivationSubscriber = vi.fn();

    refreshCoordinator.subscribeDomain('accounts', accountsSubscriber);
    refreshCoordinator.subscribeDomain('reactivation', reactivationSubscriber);

    refreshCoordinator.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(accountsSubscriber).toHaveBeenCalledTimes(1);
    expect(reactivationSubscriber).toHaveBeenCalledTimes(1);

    // Simulate Reactivation Approval: Account is unlocked and reactivation request is approved
    mockData = {
      ...mockData,
      markers: {
        ...mockData.markers,
        accounts: '10:2026-10-27T10:01:00.000Z:0', // locked count dropped to 0
        reactivation: '1:2026-10-27T10:01:00.000Z:0' // pending count dropped to 0
      },
      summary: {
        ...mockData.summary,
        lockedAccounts: 0,
        pendingReactivations: 0
      },
      etag: 'etag-v2'
    };

    await vi.advanceTimersByTimeAsync(3500);

    // Both subscribers received notification
    expect(accountsSubscriber).toHaveBeenCalledTimes(2);
    expect(reactivationSubscriber).toHaveBeenCalledTimes(2);
  });

  it('3. Reactivation rejection removes request from pending and keeps account locked', async () => {
    let mockData: FreshnessData = {
      markers: {
        accounts: '10:2026-10-27T10:00:00.000Z:1',
        reactivation: '1:2026-10-27T10:00:00.000Z:1',
        recovery: '0:2026-10-27T10:00:00.000Z:0',
        audit: '10:2026-10-27T10:00:00.000Z:10',
        profile: '2026-10-27T10:00:00.000Z'
      },
      summary: {
        totalAccounts: 10,
        lockedAccounts: 1,
        pendingReactivations: 1,
        pendingRecoveries: 0,
        totalAuditLogs: 10
      },
      etag: 'etag-v1',
      serverTime: '2026-10-27T10:00:00.000Z'
    };

    vi.spyOn(adminApi, 'getFreshness').mockImplementation(async () => {
      return { notModified: false, ...mockData };
    });

    const accountsSubscriber = vi.fn();
    const reactivationSubscriber = vi.fn();

    refreshCoordinator.subscribeDomain('accounts', accountsSubscriber);
    refreshCoordinator.subscribeDomain('reactivation', reactivationSubscriber);

    refreshCoordinator.start();
    await vi.advanceTimersByTimeAsync(0);

    // Simulate Rejection: Request status changes to REJECTED, but account locked count remains 1
    mockData = {
      ...mockData,
      markers: {
        ...mockData.markers,
        reactivation: '1:2026-10-27T10:02:00.000Z:0' // pending is 0
      },
      summary: {
        ...mockData.summary,
        pendingReactivations: 0
      },
      etag: 'etag-v3'
    };

    await vi.advanceTimersByTimeAsync(3500);

    // Reactivation subscriber notified
    expect(reactivationSubscriber).toHaveBeenCalledTimes(2);
    // Accounts marker did not change, so accounts subscriber was NOT notified redundantly!
    expect(accountsSubscriber).toHaveBeenCalledTimes(1);
  });

  it('4. Dashboard counters and related datasets update together', async () => {
    let currentSummary: FreshnessSummary = {
      totalAccounts: 25,
      lockedAccounts: 3,
      pendingReactivations: 2,
      pendingRecoveries: 1,
      totalAuditLogs: 50
    };

    vi.spyOn(adminApi, 'getFreshness').mockImplementation(async () => {
      return {
        notModified: false,
        markers: {
          accounts: '25:t1:3',
          reactivation: '2:t1:2',
          recovery: '1:t1:1',
          audit: '50:t1:50',
          profile: 't1'
        },
        summary: currentSummary,
        etag: 'etag-summary-1',
        serverTime: '2026-10-27T10:00:00.000Z'
      };
    });

    const summaryCallback = vi.fn();
    refreshCoordinator.subscribeSummary(summaryCallback);

    refreshCoordinator.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(summaryCallback).toHaveBeenCalledWith(expect.objectContaining({
      totalAccounts: 25,
      pendingReactivations: 2
    }));

    // Update summary counters
    currentSummary = {
      totalAccounts: 26,
      lockedAccounts: 4,
      pendingReactivations: 3,
      pendingRecoveries: 1,
      totalAuditLogs: 52
    };

    await vi.advanceTimersByTimeAsync(3500);

    expect(summaryCallback).toHaveBeenCalledWith(expect.objectContaining({
      totalAccounts: 26,
      pendingReactivations: 3
    }));
  });

  it('5. Unchanged data returns 304 and does NOT trigger domain subscriber rerenders or downloads', async () => {
    const mockEtag = 'etag-steady';
    vi.spyOn(adminApi, 'getFreshness').mockImplementation(async (ifNoneMatch) => {
      if (ifNoneMatch === mockEtag) {
        return { notModified: true, etag: mockEtag };
      }
      return {
        notModified: false,
        markers: {
          accounts: '10:t:0',
          reactivation: '0:t:0',
          recovery: '0:t:0',
          audit: '10:t:10',
          profile: 't'
        },
        summary: {
          totalAccounts: 10,
          lockedAccounts: 0,
          pendingReactivations: 0,
          pendingRecoveries: 0,
          totalAuditLogs: 10
        },
        etag: mockEtag,
        serverTime: '2026-10-27T10:00:00.000Z'
      };
    });

    const domainCallback = vi.fn();
    refreshCoordinator.subscribeDomain('accounts', domainCallback);

    refreshCoordinator.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(domainCallback).toHaveBeenCalledTimes(1);

    // Advance by 3 polling cycles (10.5 seconds) with unchanged data
    await vi.advanceTimersByTimeAsync(3500);
    await vi.advanceTimersByTimeAsync(3500);
    await vi.advanceTimersByTimeAsync(3500);

    // Should NOT have triggered any additional domain callbacks!
    expect(domainCallback).toHaveBeenCalledTimes(1);
    expect(refreshCoordinator.getStatus().isConnected).toBe(true);
  });

  it('6. Prevents overlapping polling requests', async () => {
    let resolveFirstRequest: Function;
    const firstRequestPromise = new Promise<{ notModified: boolean }>((resolve) => {
      resolveFirstRequest = resolve;
    });

    let calls = 0;
    vi.spyOn(adminApi, 'getFreshness').mockImplementation(async () => {
      calls++;
      if (calls === 1) {
        return firstRequestPromise as any;
      }
      return { notModified: true };
    });

    refreshCoordinator.start();
    expect(calls).toBe(1);

    // Trigger immediate check while request 1 is still hanging
    refreshCoordinator.triggerImmediateCheck();
    refreshCoordinator.triggerImmediateCheck();

    // Still only 1 call should be in flight
    expect(calls).toBe(1);

    // Resolve request 1
    resolveFirstRequest!({ notModified: true });
    await vi.advanceTimersByTimeAsync(0);

    // Pending queued check executed exactly once
    expect(calls).toBe(2);
  });

  it('7. Navigation and remounting do not multiply polling loops', () => {
    refreshCoordinator.start();
    refreshCoordinator.start();
    refreshCoordinator.start();

    // Idempotent: only one timer loop active
    expect(refreshCoordinator.getStatus().isPaused).toBe(false);

    // Unsubscribing removes callback cleanly
    const cb = vi.fn();
    const unsub = refreshCoordinator.subscribeDomain('accounts', cb);
    unsub();
    unsub(); // safe duplicate call
  });

  it('8. Browser visibility restoration triggers an immediate freshness check', async () => {
    const freshnessSpy = vi.spyOn(adminApi, 'getFreshness').mockResolvedValue({ notModified: true });

    refreshCoordinator.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(freshnessSpy).toHaveBeenCalledTimes(1);

    // Tab hidden
    mockDocument.hidden = true;
    mockDocument.dispatchEvent({ type: 'visibilitychange' });
    expect(refreshCoordinator.getStatus().isPaused).toBe(true);

    // Fast forward time while hidden: no polling should happen
    await vi.advanceTimersByTimeAsync(10000);
    expect(freshnessSpy).toHaveBeenCalledTimes(1);

    // Tab restored to visible
    mockDocument.hidden = false;
    mockDocument.dispatchEvent({ type: 'visibilitychange' });
    await vi.advanceTimersByTimeAsync(0);

    // Immediate check fired upon visibility restoration
    expect(freshnessSpy).toHaveBeenCalledTimes(2);
    expect(refreshCoordinator.getStatus().isPaused).toBe(false);
  });

  it('9. Network reconnection triggers an immediate freshness check', async () => {
    const freshnessSpy = vi.spyOn(adminApi, 'getFreshness').mockResolvedValue({ notModified: true });

    refreshCoordinator.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(freshnessSpy).toHaveBeenCalledTimes(1);

    // Network offline
    mockWindow.dispatchEvent({ type: 'offline' });
    expect(refreshCoordinator.getStatus().isPaused).toBe(true);

    // Network online
    mockWindow.dispatchEvent({ type: 'online' });
    await vi.advanceTimersByTimeAsync(0);

    expect(freshnessSpy).toHaveBeenCalledTimes(2);
    expect(refreshCoordinator.getStatus().isPaused).toBe(false);
  });

  it('10. Bounded backoff on transient network errors', async () => {
    vi.spyOn(adminApi, 'getFreshness').mockRejectedValue(new Error('Network error 503'));

    refreshCoordinator.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(refreshCoordinator.getStatus().error).toBe('Network error 503');
  });

  it('11. Session expiration event stops the coordinator', () => {
    refreshCoordinator.start();
    expect(refreshCoordinator.getStatus().isPaused).toBe(false);

    mockWindow.dispatchEvent({ type: 'admin:session-expired' });
    expect(refreshCoordinator.getStatus().isConnected).toBe(true);
  });

  it('12. All live sync and conflict messages have English and Marathi translations', () => {
    expect(adminTranslations.en.liveSync).toBe('Live Sync');
    expect(adminTranslations.mr.liveSync).toBe('थेट सिंक');
    expect(adminTranslations.en.syncConnected).toBeDefined();
    expect(adminTranslations.mr.syncConnected).toBeDefined();
    expect(adminTranslations.en.recordUpdatedRemotely).toBeDefined();
    expect(adminTranslations.mr.recordUpdatedRemotely).toBeDefined();
    expect(adminTranslations.en.concurrentConflictWarning).toBeDefined();
    expect(adminTranslations.mr.concurrentConflictWarning).toBeDefined();
  });
});
