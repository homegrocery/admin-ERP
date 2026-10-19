import { describe, it, expect } from 'vitest';
import { adminTranslations } from '../i18n/adminTranslations';

describe('Admin ERP — Accounts Table Last Login Display & Timezone Formatting', () => {
  const formatDate = (isoStr: string | null | undefined, lang: 'mr' | 'en' = 'en', fallback?: string) => {
    const t = adminTranslations[lang];
    if (!isoStr) return fallback !== undefined ? fallback : t.neverLoggedIn;
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return fallback !== undefined ? fallback : t.neverLoggedIn;
      return d.toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fallback !== undefined ? fallback : t.neverLoggedIn;
    }
  };

  it('displays "Never" in English when last_login_at is null or undefined', () => {
    expect(formatDate(null, 'en')).toBe('Never');
    expect(formatDate(undefined, 'en')).toBe('Never');
    expect(formatDate('', 'en')).toBe('Never');
  });

  it('displays "कधीही नाही" in Marathi when last_login_at is null or undefined', () => {
    expect(formatDate(null, 'mr')).toBe('कधीही नाही');
    expect(formatDate(undefined, 'mr')).toBe('कधीही नाही');
    expect(formatDate('', 'mr')).toBe('कधीही नाही');
  });

  it('formats verified ISO timestamp into Asia/Kolkata local time in English', () => {
    // 2026-10-19T14:30:00.000Z -> 20:00 IST (+05:30)
    const formatted = formatDate('2026-10-19T14:30:00.000Z', 'en');
    expect(formatted).not.toBe('Never');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('8:00');
    expect(formatted).toMatch(/pm/i);
  });

  it('formats verified ISO timestamp into Asia/Kolkata local time in Marathi', () => {
    const formatted = formatDate('2026-10-19T14:30:00.000Z', 'mr');
    expect(formatted).not.toBe('कधीही नाही');
    expect(formatted).toMatch(/२०२६|2026/);
  });

  it('safely handles corrupted or invalid date strings by returning Never', () => {
    expect(formatDate('invalid-date-string', 'en')).toBe('Never');
    expect(formatDate('invalid-date-string', 'mr')).toBe('कधीही नाही');
  });
});
