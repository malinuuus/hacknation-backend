import { CaseStatus } from '../../generated/prisma/enums.js';
import { daysBetween } from './date-only.js';

export enum CaseUrgency {
  Done = 'DONE',
  Overdue = 'OVERDUE',
  DueToday = 'DUE_TODAY',
  DueTomorrow = 'DUE_TOMORROW',
  Upcoming = 'UPCOMING',
}

export interface CaseDeadlineFields {
  status: CaseStatus;
  dueAt: Date;
  extendedDueAt: Date | null;
}

export interface CaseUrgencyInfo {
  effectiveDueAt: Date;
  /** Days until the effective deadline; negative when overdue. */
  daysLeft: number;
  urgency: CaseUrgency;
}

export function effectiveDueDate(fields: Pick<CaseDeadlineFields, 'dueAt' | 'extendedDueAt'>): Date {
  return fields.extendedDueAt ?? fields.dueAt;
}

/** Classifies a case for highlighting in the register; `today` is a date-only value. */
export function computeUrgency(fields: CaseDeadlineFields, today: Date): CaseUrgencyInfo {
  const effectiveDueAt = effectiveDueDate(fields);
  const daysLeft = daysBetween(today, effectiveDueAt);

  let urgency: CaseUrgency;
  if (fields.status === CaseStatus.RESPONSE_SENT) {
    urgency = CaseUrgency.Done;
  } else if (daysLeft < 0) {
    urgency = CaseUrgency.Overdue;
  } else if (daysLeft === 0) {
    urgency = CaseUrgency.DueToday;
  } else if (daysLeft === 1) {
    urgency = CaseUrgency.DueTomorrow;
  } else {
    urgency = CaseUrgency.Upcoming;
  }

  return { effectiveDueAt, daysLeft, urgency };
}
