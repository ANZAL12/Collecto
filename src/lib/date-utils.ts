/**
 * Month parsing and formatting utilities for invoice dates.
 */

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

export interface InvoiceMonthOption {
  key: string;      // e.g. "2026-09"
  label: string;    // e.g. "Sep 2026"
  year: number;
  month: number;    // 1-12
  count?: number;
}

/**
 * Normalizes an invoice date string into a month key ("YYYY-MM") and label ("MMM YYYY").
 * Handles formats:
 * - "01-Sep-26" or "1-September-2026"
 * - "2026-09-01" or "2026/09/01"
 * - "01/09/2026" or "01-09-2026"
 * - ISO strings and standard date representations
 */
export function parseInvoiceMonth(dateStr?: string): InvoiceMonthOption | null {
  if (!dateStr || !dateStr.trim()) return null;
  const s = dateStr.trim();

  // Pattern 1: DD-MMM-YY or DD-MMM-YYYY (e.g. 01-Sep-26, 1-September-2026)
  const ddMmmMatch = s.match(/^(\d{1,2})[-/ ]([a-zA-Z]+)[-/ ](\d{2,4})$/);
  if (ddMmmMatch) {
    const monthStr = ddMmmMatch[2].toLowerCase();
    let year = parseInt(ddMmmMatch[3], 10);
    if (year < 100) year += 2000;
    if (monthStr in MONTH_MAP) {
      const monthIdx = MONTH_MAP[monthStr];
      const monthNum = String(monthIdx + 1).padStart(2, "0");
      const label = `${MONTH_NAMES[monthIdx]} ${year}`;
      return { key: `${year}-${monthNum}`, label, year, month: monthIdx + 1 };
    }
  }

  // Pattern 2: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    if (month >= 1 && month <= 12) {
      const monthNum = String(month).padStart(2, "0");
      const label = `${MONTH_NAMES[month - 1]} ${year}`;
      return { key: `${year}-${monthNum}`, label, year, month };
    }
  }

  // Pattern 3: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (month >= 1 && month <= 12) {
      const monthNum = String(month).padStart(2, "0");
      const label = `${MONTH_NAMES[month - 1]} ${year}`;
      return { key: `${year}-${monthNum}`, label, year, month };
    }
  }

  // Pattern 4: MMM YYYY or Month YYYY (e.g. "Sep 2026")
  const mmmYyyyMatch = s.match(/^([a-zA-Z]+)[-/ ](\d{4})$/);
  if (mmmYyyyMatch) {
    const monthStr = mmmYyyyMatch[1].toLowerCase();
    const year = parseInt(mmmYyyyMatch[2], 10);
    if (monthStr in MONTH_MAP) {
      const monthIdx = MONTH_MAP[monthStr];
      const monthNum = String(monthIdx + 1).padStart(2, "0");
      const label = `${MONTH_NAMES[monthIdx]} ${year}`;
      return { key: `${year}-${monthNum}`, label, year, month: monthIdx + 1 };
    }
  }

  // Fallback to JS Date
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const monthIdx = parsed.getMonth();
    const monthNum = String(monthIdx + 1).padStart(2, "0");
    const label = `${MONTH_NAMES[monthIdx]} ${year}`;
    return { key: `${year}-${monthNum}`, label, year, month: monthIdx + 1 };
  }

  return null;
}

/**
 * Extract sorted unique months from a list of invoice records with counts.
 * Returns sorted in reverse chronological order (most recent first).
 */
export function getAvailableInvoiceMonths(invoices: { invoiceDate?: string; date?: string }[]): InvoiceMonthOption[] {
  const map = new Map<string, InvoiceMonthOption>();

  for (const inv of invoices) {
    const monthOpt = parseInvoiceMonth(inv.invoiceDate || inv.date);
    if (monthOpt) {
      const existing = map.get(monthOpt.key);
      if (existing) {
        existing.count = (existing.count || 0) + 1;
      } else {
        map.set(monthOpt.key, { ...monthOpt, count: 1 });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

/**
 * Checks whether an invoice date string corresponds to today's calendar date.
 * Strictly matches the invoice date (e.g. 14-Sep-26, 14-Sep-2026, 2026-09-14).
 * Does not fall back to database upload timestamp (created_at).
 */
export function isInvoiceDateToday(invoiceDate?: string): boolean {
  if (!invoiceDate || !invoiceDate.trim()) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-11
  const currentDay = now.getDate(); // 1-31

  const s = invoiceDate.trim();

  // Pattern 1: DD-MMM-YY or DD-MMM-YYYY (e.g. 14-Sep-26, 14-Sep-2026, 1-Sep-26)
  const ddMmmMatch = s.match(/^(\d{1,2})[-/ ]([a-zA-Z]+)[-/ ](\d{2,4})$/);
  if (ddMmmMatch) {
    const day = parseInt(ddMmmMatch[1], 10);
    const monthStr = ddMmmMatch[2].toLowerCase();
    let year = parseInt(ddMmmMatch[3], 10);
    if (year < 100) year += 2000;
    if (monthStr in MONTH_MAP) {
      return day === currentDay && MONTH_MAP[monthStr] === currentMonthIdx && year === currentYear;
    }
    return false;
  }

  // Pattern 2: YYYY-MM-DD
  const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    return year === currentYear && month === currentMonthIdx + 1 && day === currentDay;
  }

  // Pattern 3: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    return year === currentYear && month === currentMonthIdx + 1 && day === currentDay;
  }

  // Fallback standard Date parsing
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return (
      parsed.getFullYear() === currentYear &&
      parsed.getMonth() === currentMonthIdx &&
      parsed.getDate() === currentDay
    );
  }

  return false;
}

