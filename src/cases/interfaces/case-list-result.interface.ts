import type { CaseSummaryRecord } from '../cases.repository.js';

export interface CaseListResult {
  items: CaseSummaryRecord[];
  total: number;
}
