import { describe, it, expect } from 'vitest';
import { formatAuditTimestamp } from '../utils/dateUtils';

describe('formatAuditTimestamp Utility', () => {
  it('formats standard ISO-8601 UTC timestamp correctly in English and Marathi', () => {
    const iso = '2026-10-18T16:36:40.495Z';
    const enResult = formatAuditTimestamp(iso, 'en');
    const mrResult = formatAuditTimestamp(iso, 'mr');

    expect(enResult).not.toBe('Invalid Date');
    expect(enResult).not.toBe('Date unavailable');
    expect(enResult).toContain('2026');

    expect(mrResult).not.toBe('Invalid Date');
    expect(mrResult).not.toBe('तारीख अनुपलब्ध');
    expect(mrResult).toContain('२०२६');
  });

  it('formats space-delimited SQLite timestamp correctly without producing Invalid Date', () => {
    const sqliteDate = '2026-10-18 16:36:40';
    const result = formatAuditTimestamp(sqliteDate, 'en');

    expect(result).not.toBe('Invalid Date');
    expect(result).not.toBe('Date unavailable');
    expect(result).toContain('2026');
  });

  it('handles null, undefined, and empty string gracefully with localized fallback', () => {
    expect(formatAuditTimestamp(null, 'en')).toBe('Date unavailable');
    expect(formatAuditTimestamp(undefined, 'en')).toBe('Date unavailable');
    expect(formatAuditTimestamp('', 'en')).toBe('Date unavailable');
    expect(formatAuditTimestamp('   ', 'en')).toBe('Date unavailable');

    expect(formatAuditTimestamp(null, 'mr')).toBe('तारीख अनुपलब्ध');
    expect(formatAuditTimestamp(undefined, 'mr')).toBe('तारीख अनुपलब्ध');
    expect(formatAuditTimestamp('', 'mr')).toBe('तारीख अनुपलब्ध');
  });

  it('handles garbage/malformed dates gracefully without crashing or returning "Invalid Date"', () => {
    expect(formatAuditTimestamp('not-a-date', 'en')).toBe('Date unavailable');
    expect(formatAuditTimestamp('12345-67-89', 'en')).toBe('Date unavailable');
    expect(formatAuditTimestamp('not-a-date', 'mr')).toBe('तारीख अनुपलब्ध');
  });

  it('formats Date instances and epoch timestamps', () => {
    const now = new Date('2026-10-19T10:00:00.000Z');
    const resFromDate = formatAuditTimestamp(now, 'en');
    const resFromEpoch = formatAuditTimestamp(now.getTime(), 'en');

    expect(resFromDate).toContain('2026');
    expect(resFromEpoch).toContain('2026');
  });
});
