import type { CaseStatus } from '../../generated/prisma/enums.js';

/**
 * A history entry, applied atomically with the case fields. `fromStatus` and
 * `toStatus` are equal for events that keep the status, such as an extension.
 */
export interface CaseStatusChangeData {
  /** Status the caller saw; the change fails if another user changed it meanwhile. */
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  changedById: string;
  comment?: string;
  /** Case fields updated together with the status. */
  fields?: {
    extendedDueAt?: Date | null;
    extensionReason?: string | null;
    effectiveDueAt?: Date;
    respondedAt?: Date | null;
  };
}
