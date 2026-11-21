import type { CaseStatus } from '../../generated/prisma/enums.js';

export interface CaseStatusChangeData {
  /** Status the caller saw; the change fails if another user changed it meanwhile. */
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  changedById: string;
  comment?: string;
  /** Case fields updated together with the status. */
  fields?: {
    extendedDueAt?: Date;
    extensionReason?: string;
    respondedAt?: Date | null;
  };
}
