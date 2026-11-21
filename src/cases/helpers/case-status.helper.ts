import { CaseStatus } from '../../generated/prisma/enums.js';

/**
 * Workflow of a request (brief, step 11): no action → queries sent to
 * departments → response prepared → sent. An extended deadline (kwerenda) is
 * not a status: it can be set at any open stage. Backward moves cover
 * corrections, e.g. a department reply turned out to be incomplete, or a
 * response marked as sent by mistake.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<CaseStatus, readonly CaseStatus[]>> = {
  [CaseStatus.NEW]: [CaseStatus.SENT_TO_DEPARTMENTS, CaseStatus.RESPONSE_PREPARED],
  [CaseStatus.SENT_TO_DEPARTMENTS]: [CaseStatus.NEW, CaseStatus.RESPONSE_PREPARED],
  [CaseStatus.RESPONSE_PREPARED]: [CaseStatus.SENT_TO_DEPARTMENTS, CaseStatus.RESPONSE_SENT],
  [CaseStatus.RESPONSE_SENT]: [CaseStatus.RESPONSE_PREPARED],
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: CaseStatus): readonly CaseStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

/** The deadline can be extended (or the extension withdrawn) until the response is sent. */
export function canChangeDeadline(status: CaseStatus): boolean {
  return status !== CaseStatus.RESPONSE_SENT;
}
