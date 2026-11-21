import type { CaseStatus } from '../../generated/prisma/enums.js';

export interface CaseDeadlineFields {
  status: CaseStatus;
  dueAt: Date;
  extendedDueAt: Date | null;
}
