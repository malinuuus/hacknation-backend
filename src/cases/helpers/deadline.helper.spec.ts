import { addMonths, formatDateOnly, parseDateOnly, todayInOfficeTimeZone } from './date-only.helper.js';
import { computeDueDate, maxExtendedDueDate } from './deadline.helper.js';
import { easterSunday, isPolishPublicHoliday } from './polish-holidays.helper.js';

const d = parseDateOnly;
const fmt = formatDateOnly;

describe('polish holidays', () => {
  it.each([
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
  ])('computes Easter Sunday %i', (year, expected) => {
    // act
    const result = easterSunday(year);

    // assert
    expect(fmt(result)).toBe(expected);
  });

  it.each(['2026-04-06', '2026-06-04', '2026-11-11', '2026-12-24', '2027-03-29'])('%s is a holiday', (date) => {
    // act
    const result = isPolishPublicHoliday(d(date));

    // assert
    expect(result).toBe(true);
  });

  it('does not treat Christmas Eve before 2025 as a holiday', () => {
    // arrange
    const christmasEve2024 = d('2024-12-24');

    // act
    const result = isPolishPublicHoliday(christmasEve2024);

    // assert
    expect(result).toBe(false);
  });
});

describe('computeDueDate', () => {
  it.each([
    ['plain working day', '2026-08-19', '2026-09-02'],
    ['falls on 11 November', '2026-10-28', '2026-11-12'],
    ['falls on Saturday', '2026-11-07', '2026-11-23'],
    ['falls on Sunday', '2026-11-08', '2026-11-23'],
    ['falls on Easter Monday', '2026-03-23', '2026-04-07'],
    ['falls on Christmas Eve, then holidays and a weekend', '2026-12-10', '2026-12-28'],
  ])('%s', (_, receivedAt, expected) => {
    // act
    const result = computeDueDate(d(receivedAt));

    // assert
    expect(fmt(result)).toBe(expected);
  });
});

describe('maxExtendedDueDate', () => {
  it('is two months from receipt', () => {
    // arrange
    const receivedAt = d('2026-08-19');

    // act
    const result = maxExtendedDueDate(receivedAt);

    // assert
    expect(fmt(result)).toBe('2026-10-19');
  });

  it('clamps to the end of a shorter month and shifts to a working day', () => {
    // arrange
    // Two months later is 2027-02-28, a Sunday.
    const receivedAt = d('2026-12-31');

    // act
    const result = maxExtendedDueDate(receivedAt);

    // assert
    expect(fmt(result)).toBe('2027-03-01');
  });
});

describe('date helpers', () => {
  it.each(['2026-02-30', '19.08.2026'])('rejects the impossible date %s', (value) => {
    // act
    const act = () => parseDateOnly(value);

    // assert
    expect(act).toThrow(RangeError);
  });

  it('adds months across a year boundary', () => {
    // arrange
    const date = d('2026-11-30');

    // act
    const result = addMonths(date, 3);

    // assert
    expect(fmt(result)).toBe('2027-02-28');
  });

  it('uses the Polish date, not the UTC date, for today', () => {
    // arrange
    const now = new Date('2026-11-21T23:30:00Z');

    // act
    const result = todayInOfficeTimeZone(now);

    // assert
    expect(fmt(result)).toBe('2026-11-22');
  });
});
