import { CaseStatus } from '../../generated/prisma/enums.js';
import { formatDateOnly, parseDateOnly } from './date-only.js';
import { CaseUrgency, computeUrgency } from './urgency.js';

const today = parseDateOnly('2026-11-21');

const caseDue = (dueAt: string, extras: { status?: CaseStatus; extendedDueAt?: string } = {}) => ({
  status: extras.status ?? CaseStatus.NEW,
  dueAt: parseDateOnly(dueAt),
  extendedDueAt: extras.extendedDueAt ? parseDateOnly(extras.extendedDueAt) : null,
});

describe('computeUrgency', () => {
  it.each([
    ['2026-11-20', CaseUrgency.Overdue, -1],
    ['2026-11-21', CaseUrgency.DueToday, 0],
    ['2026-11-22', CaseUrgency.DueTomorrow, 1],
    ['2026-11-30', CaseUrgency.Upcoming, 9],
  ])('due %s → %s', (dueAt, urgency, daysLeft) => {
    expect(computeUrgency(caseDue(dueAt), today)).toMatchObject({ urgency, daysLeft });
  });

  it('uses the extended deadline when set', () => {
    const result = computeUrgency(caseDue('2026-11-10', { extendedDueAt: '2026-11-22' }), today);
    expect(formatDateOnly(result.effectiveDueAt)).toBe('2026-11-22');
    expect(result.urgency).toBe(CaseUrgency.DueTomorrow);
  });

  it('marks answered cases as done even past the deadline', () => {
    const result = computeUrgency(caseDue('2026-11-01', { status: CaseStatus.RESPONSE_SENT }), today);
    expect(result.urgency).toBe(CaseUrgency.Done);
  });
});
