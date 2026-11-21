import type { CaseStatus } from '../../generated/prisma/enums.js';

export interface CaseListFilter {
  year: number;
  status?: CaseStatus;
  assigneeId?: string;
  search?: string;
  limit: number;
  offset: number;
}
