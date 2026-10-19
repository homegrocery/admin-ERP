/**
 * Safe, robust timestamp formatter for Security & Audit Logs.
 * Handles:
 * - ISO-8601 strings (e.g., "2026-10-18T16:36:40.495Z")
 * - SQLite space-delimited timestamps (e.g., "2026-10-18 16:36:40")
 * - PostgreSQL Timestamps
 * - Epoch milliseconds / numbers
 * - Graceful fallback to localized "Date unavailable" / "तारीख अनुपलब्ध" on null, undefined, or invalid input.
 * - Eliminates the "Invalid Date" bug across browsers.
 */
export function formatAuditTimestamp(
  rawDate: string | number | Date | null | undefined,
  lang: 'en' | 'mr' = 'en'
): string {
  if (!rawDate) {
    return lang === 'mr' ? 'तारीख अनुपलब्ध' : 'Date unavailable';
  }

  let dateObj: Date;

  if (typeof rawDate === 'string') {
    let cleanStr = rawDate.trim();
    if (!cleanStr) {
      return lang === 'mr' ? 'तारीख अनुपलब्ध' : 'Date unavailable';
    }

    // Convert SQLite space-separated "YYYY-MM-DD HH:MM:SS" to ISO-8601 "YYYY-MM-DDTHH:MM:SS"
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(cleanStr)) {
      cleanStr = cleanStr.replace(' ', 'T');
      if (!cleanStr.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(cleanStr)) {
        cleanStr += 'Z';
      }
    }

    dateObj = new Date(cleanStr);
  } else if (rawDate instanceof Date) {
    dateObj = rawDate;
  } else if (typeof rawDate === 'number') {
    dateObj = new Date(rawDate);
  } else {
    return lang === 'mr' ? 'तारीख अनुपलब्ध' : 'Date unavailable';
  }

  if (isNaN(dateObj.getTime())) {
    return lang === 'mr' ? 'तारीख अनुपलब्ध' : 'Date unavailable';
  }

  try {
    return dateObj.toLocaleString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return dateObj.toISOString();
  }
}
