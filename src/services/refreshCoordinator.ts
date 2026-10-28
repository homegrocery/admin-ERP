import { adminApi } from './adminApi';
import type {
  RefreshDomain,
  FreshnessMarkers,
  FreshnessSummary,
  RefreshStatus
} from '../types/admin';

type DomainCallback = () => void;
type SummaryCallback = (summary: FreshnessSummary) => void;
type StatusCallback = (status: RefreshStatus) => void;

class AutoRefreshCoordinator {
  private intervalMs = 3500;
  private currentEtag: string | null = null;
  private lastMarkers: Partial<FreshnessMarkers> = {};
  private lastSummary: FreshnessSummary | null = null;

  private isRunning = false;
  private isPolling = false;
  private isPaused = false;
  private hasPendingCheck = false;
  private timerId: any = null;
  private backoffMultiplier = 1;

  private lastChecked: Date | null = null;
  private lastChanged: Date | null = null;
  private error: string | null = null;

  private domainSubscribers: Map<RefreshDomain, Set<DomainCallback>> = new Map([
    ['accounts', new Set()],
    ['reactivation', new Set()],
    ['recovery', new Set()],
    ['audit', new Set()],
    ['profile', new Set()],
    ['website', new Set()],
    ['releases', new Set()]
  ]);

  private summarySubscribers: Set<SummaryCallback> = new Set();
  private statusSubscribers: Set<StatusCallback> = new Set();

  private boundOnVisibilityChange = this.onVisibilityChange.bind(this);
  private boundOnOnline = this.onOnline.bind(this);
  private boundOnOffline = this.onOffline.bind(this);
  private boundOnSessionExpired = this.onSessionExpired.bind(this);

  /**
   * Set detection interval (milliseconds). Default is 3500ms (< 5000ms target).
   */
  public setIntervalMs(ms: number): void {
    this.intervalMs = Math.max(500, ms);
  }

  public getIntervalMs(): number {
    return this.intervalMs;
  }

  public getStatus(): RefreshStatus {
    return {
      isConnected: !this.error && navigator?.onLine !== false,
      isPaused: this.isPaused,
      lastChecked: this.lastChecked,
      lastChanged: this.lastChanged,
      error: this.error
    };
  }

  public getSummary(): FreshnessSummary | null {
    return this.lastSummary;
  }

  public getMarkers(): Partial<FreshnessMarkers> {
    return { ...this.lastMarkers };
  }

  /**
   * Starts the centralized polling coordinator. Safe to call multiple times.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.backoffMultiplier = 1;

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.boundOnVisibilityChange);
      window.addEventListener('online', this.boundOnOnline);
      window.addEventListener('offline', this.boundOnOffline);
      window.addEventListener('admin:session-expired', this.boundOnSessionExpired);
    }

    // Trigger initial check immediately
    this.triggerImmediateCheck();
  }

  /**
   * Stops the coordinator and clears all active timers and listeners.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.boundOnVisibilityChange);
      window.removeEventListener('online', this.boundOnOnline);
      window.removeEventListener('offline', this.boundOnOffline);
      window.removeEventListener('admin:session-expired', this.boundOnSessionExpired);
    }

    this.notifyStatus();
  }

  /**
   * Clear state & subscribers. Primarily used in test isolation.
   */
  public reset(): void {
    this.stop();
    this.currentEtag = null;
    this.lastMarkers = {};
    this.lastSummary = null;
    this.lastChecked = null;
    this.lastChanged = null;
    this.error = null;
    this.backoffMultiplier = 1;
    this.domainSubscribers.forEach(set => set.clear());
    this.summarySubscribers.clear();
    this.statusSubscribers.clear();
  }

  /**
   * Register a subscriber for a domain dataset. Returns an unsubscribe function.
   */
  public subscribeDomain(domain: RefreshDomain, callback: DomainCallback): () => void {
    const set = this.domainSubscribers.get(domain);
    if (set) {
      set.add(callback);
    }
    return () => {
      set?.delete(callback);
    };
  }

  /**
   * Register a subscriber for real-time summary counter updates.
   */
  public subscribeSummary(callback: SummaryCallback): () => void {
    this.summarySubscribers.add(callback);
    if (this.lastSummary) {
      try {
        callback(this.lastSummary);
      } catch (err) {
        console.error('[AutoRefreshCoordinator] Error in initial summary callback:', err);
      }
    }
    return () => {
      this.summarySubscribers.delete(callback);
    };
  }

  /**
   * Register a subscriber for coordinator connectivity and sync status.
   */
  public subscribeStatus(callback: StatusCallback): () => void {
    this.statusSubscribers.add(callback);
    try {
      callback(this.getStatus());
    } catch (err) {
      console.error('[AutoRefreshCoordinator] Error in initial status callback:', err);
    }
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  /**
   * Forces an immediate check (e.g. after network restore, visibility change, or manual action).
   */
  public triggerImmediateCheck(): void {
    if (!adminApi.getToken()) return;

    if (this.isPolling) {
      this.hasPendingCheck = true;
      return;
    }

    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.checkFreshness();
  }

  private scheduleNextTick(): void {
    if (!this.isRunning || this.isPaused) return;

    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    const delay = this.intervalMs * this.backoffMultiplier;
    this.timerId = setTimeout(() => {
      this.checkFreshness();
    }, delay);
  }

  private async checkFreshness(): Promise<void> {
    if (!this.isRunning || this.isPaused || this.isPolling) return;
    if (!adminApi.getToken()) {
      this.stop();
      return;
    }

    this.isPolling = true;

    try {
      const res = await adminApi.getFreshness(this.currentEtag);
      this.lastChecked = new Date();
      this.error = null;
      this.backoffMultiplier = 1;

      if (!res.notModified && res.markers) {
        // Change detected!
        const prevMarkers = this.lastMarkers;
        const newMarkers = res.markers;
        this.currentEtag = res.etag || null;
        this.lastMarkers = newMarkers;
        this.lastChanged = new Date();

        // 1. Check which domains changed and notify relevant subscribers
        const domains: RefreshDomain[] = ['accounts', 'reactivation', 'recovery', 'audit', 'profile', 'website', 'releases'];
        domains.forEach(domain => {
          if (!prevMarkers[domain] || prevMarkers[domain] !== newMarkers[domain]) {
            this.notifyDomain(domain);
          }
        });

        // 2. Notify summary subscribers
        if (res.summary) {
          this.lastSummary = res.summary;
          this.notifySummary(res.summary);
        }
      }

      this.notifyStatus();
    } catch (err: any) {
      this.error = err?.message || 'Sync error';
      // Bounded backoff up to 4x base interval (e.g. 3.5s -> 7s -> 14s max)
      this.backoffMultiplier = Math.min(this.backoffMultiplier * 2, 4);
      this.notifyStatus();
    } finally {
      this.isPolling = false;

      if (this.hasPendingCheck) {
        this.hasPendingCheck = false;
        this.triggerImmediateCheck();
      } else {
        this.scheduleNextTick();
      }
    }
  }

  private notifyDomain(domain: RefreshDomain): void {
    const subs = this.domainSubscribers.get(domain);
    if (!subs) return;
    subs.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error(`[AutoRefreshCoordinator] Error invoking subscriber for domain "${domain}":`, err);
      }
    });
  }

  private notifySummary(summary: FreshnessSummary): void {
    this.summarySubscribers.forEach(cb => {
      try {
        cb(summary);
      } catch (err) {
        console.error('[AutoRefreshCoordinator] Error in summary subscriber:', err);
      }
    });
  }

  private notifyStatus(): void {
    const status = this.getStatus();
    this.statusSubscribers.forEach(cb => {
      try {
        cb(status);
      } catch (err) {
        console.error('[AutoRefreshCoordinator] Error in status subscriber:', err);
      }
    });
  }

  private onVisibilityChange(): void {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      this.isPaused = true;
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
      this.notifyStatus();
    } else {
      this.isPaused = false;
      this.notifyStatus();
      this.triggerImmediateCheck();
    }
  }

  private onOnline(): void {
    this.isPaused = false;
    this.error = null;
    this.backoffMultiplier = 1;
    this.notifyStatus();
    this.triggerImmediateCheck();
  }

  private onOffline(): void {
    this.isPaused = true;
    this.error = 'Network offline';
    this.notifyStatus();
  }

  private onSessionExpired(): void {
    this.stop();
  }
}

export const refreshCoordinator = new AutoRefreshCoordinator();
