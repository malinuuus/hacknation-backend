import type { CaseStatusChangeData } from './case-status-change-data.interface.js';

export interface SetCaseDepartmentsData {
  departmentIds: string[];
  /** Date stored for departments newly added to the case. */
  requestedAt: Date;
  /** Status change applied in the same transaction, e.g. NEW → SENT_TO_DEPARTMENTS. */
  statusChange?: CaseStatusChangeData;
}
