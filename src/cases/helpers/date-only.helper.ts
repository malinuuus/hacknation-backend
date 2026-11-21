/**
 * Calendar dates without a time of day, represented as `Date` objects at UTC
 * midnight. This matches how Prisma reads and writes `@db.Date` columns, and
 * doing all arithmetic in UTC avoids daylight-saving drift.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const OFFICE_TIME_ZONE = 'Europe/Warsaw';

export function dateOnly(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** Parses `YYYY-MM-DD`, rejecting impossible dates such as 2026-02-30. */
export function parseDateOnly(value: string): Date {
  const match = ISO_DATE.exec(value);
  if (!match) {
    throw new RangeError(`Invalid date "${value}", expected YYYY-MM-DD`);
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = dateOnly(year, month, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError(`Invalid date "${value}"`);
  }
  return date;
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Adds calendar months. When the target month is shorter, the result is its
 * last day (art. 57 § 3 KPA), e.g. 31 Dec + 2 months = 28/29 Feb.
 */
export function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDayOfTarget = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDayOfTarget)));
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** Today's date in the office's time zone (Poland), regardless of server TZ. */
export function todayInOfficeTimeZone(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: OFFICE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parseDateOnly(parts);
}
