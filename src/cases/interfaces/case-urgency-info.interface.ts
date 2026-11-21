import type { CaseUrgency } from '../enums/case-urgency.enum.js';

export interface CaseUrgencyInfo {
  effectiveDueAt: Date;
  /** Days until the effective deadline; negative when overdue. */
  daysLeft: number;
  urgency: CaseUrgency;
}
