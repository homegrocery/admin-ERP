import { useState, useEffect, useRef } from 'react';
import { refreshCoordinator } from '../services/refreshCoordinator';
import type { RefreshDomain, FreshnessSummary, RefreshStatus } from '../types/admin';

/**
 * Hook to subscribe a component to automatic data refresh for a specific administrative domain.
 * When backend data changes in this domain, onRefresh is executed.
 */
export function useAutoRefresh(
  domain: RefreshDomain | RefreshDomain[],
  onRefresh: () => void | Promise<void>,
  enabled: boolean = true
): void {
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const domainKey = Array.isArray(domain) ? domain.join(',') : domain;

  useEffect(() => {
    if (!enabled) return;

    const domains = Array.isArray(domain) ? domain : [domain];
    const unsubscribes = domains.map((d) =>
      refreshCoordinator.subscribeDomain(d, () => {
        onRefreshRef.current();
      })
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [domainKey, enabled]);
}

/**
 * Hook to subscribe to live system-wide freshness summary counters.
 */
export function useFreshnessSummary(): FreshnessSummary | null {
  const [summary, setSummary] = useState<FreshnessSummary | null>(() => refreshCoordinator.getSummary());

  useEffect(() => {
    const unsubscribe = refreshCoordinator.subscribeSummary((newSummary) => {
      setSummary(newSummary);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return summary;
}

/**
 * Hook to subscribe to live sync connectivity and polling status.
 */
export function useAutoRefreshStatus(): RefreshStatus {
  const [status, setStatus] = useState<RefreshStatus>(() => refreshCoordinator.getStatus());

  useEffect(() => {
    const unsubscribe = refreshCoordinator.subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}
