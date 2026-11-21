import { addDays, dateOnly, formatDateOnly } from './date-only.helper.js';

/** Easter Sunday (Gregorian calendar), anonymous Gregorian algorithm. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dateOnly(year, month, day);
}

/**
 * Statutory public holidays in Poland (ustawa o dniach wolnych od pracy),
 * as `YYYY-MM-DD` strings. Christmas Eve is a holiday since 2025.
 */
export function polishPublicHolidays(year: number): Set<string> {
  const easter = easterSunday(year);
  const holidays = [
    dateOnly(year, 1, 1), // Nowy Rok
    dateOnly(year, 1, 6), // Trzech Króli
    easter, // Wielkanoc
    addDays(easter, 1), // Poniedziałek Wielkanocny
    dateOnly(year, 5, 1), // Święto Pracy
    dateOnly(year, 5, 3), // Święto Konstytucji 3 Maja
    addDays(easter, 49), // Zielone Świątki
    addDays(easter, 60), // Boże Ciało
    dateOnly(year, 8, 15), // Wniebowzięcie NMP
    dateOnly(year, 11, 1), // Wszystkich Świętych
    dateOnly(year, 11, 11), // Narodowe Święto Niepodległości
    dateOnly(year, 12, 25), // Boże Narodzenie (1. dzień)
    dateOnly(year, 12, 26), // Boże Narodzenie (2. dzień)
  ];
  if (year >= 2025) {
    holidays.push(dateOnly(year, 12, 24)); // Wigilia
  }
  return new Set(holidays.map(formatDateOnly));
}

const cache = new Map<number, Set<string>>();

export function isPolishPublicHoliday(date: Date): boolean {
  const year = date.getUTCFullYear();
  let holidays = cache.get(year);
  if (!holidays) {
    holidays = polishPublicHolidays(year);
    cache.set(year, holidays);
  }
  return holidays.has(formatDateOnly(date));
}
