import { addDays, addMonths } from './date-only.js';
import { isPolishPublicHoliday } from './polish-holidays.js';

/** Art. 13 ust. 1 UDIP: respond no later than 14 days from receipt. */
export const STATUTORY_RESPONSE_DAYS = 14;

/** Art. 13 ust. 2 UDIP: an extended deadline may not exceed 2 months from receipt. */
export const MAX_EXTENSION_MONTHS = 2;

export function isWorkingDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6 && !isPolishPublicHoliday(date);
}

/**
 * Art. 57 § 4 KPA: a deadline ending on a Saturday or a public holiday ends on
 * the next working day. Sundays are public holidays too.
 */
export function shiftToWorkingDay(date: Date): Date {
  let result = date;
  while (!isWorkingDay(result)) {
    result = addDays(result, 1);
  }
  return result;
}

/**
 * The day of receipt is not counted (art. 57 § 1 KPA), so the deadline is
 * `receivedAt + 14 days`, shifted to a working day.
 */
export function computeDueDate(receivedAt: Date): Date {
  return shiftToWorkingDay(addDays(receivedAt, STATUTORY_RESPONSE_DAYS));
}

/** The latest date an extended deadline may be set to. */
export function maxExtendedDueDate(receivedAt: Date): Date {
  return shiftToWorkingDay(addMonths(receivedAt, MAX_EXTENSION_MONTHS));
}
