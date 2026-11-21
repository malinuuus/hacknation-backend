import type { CaseStatus } from '../../generated/prisma/enums.js';
import type { CaseSort } from '../enums/case-sort.enum.js';

export interface CaseListFilter {
  year: number;
  /** Any of these statuses; all when empty or omitted. */
  statuses?: CaseStatus[];
  /** true: only cases with an extended deadline; false: only without. */
  extended?: boolean;
  assigneeId?: string;
  search?: string;
  sort: CaseSort;
  limit: number;
  offset: number;
}
