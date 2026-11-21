import { CaseStatus } from '../../generated/prisma/enums.js';

/**
 * Workflow of a request (brief, step 11): no action → queries sent to
 * departments → (optional) extension/kwerenda → response prepared → sent.
 * Backward moves cover corrections, e.g. a department reply turned out to be
 * incomplete, or a response marked as sent by mistake.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<CaseStatus, readonly CaseStatus[]>> = {
  [CaseStatus.NEW]: [CaseStatus.SENT_TO_DEPARTMENTS, CaseStatus.EXTENDED, CaseStatus.RESPONSE_PREPARED],
  [CaseStatus.SENT_TO_DEPARTMENTS]: [CaseStatus.NEW, CaseStatus.EXTENDED, CaseStatus.RESPONSE_PREPARED],
  [CaseStatus.EXTENDED]: [CaseStatus.EXTENDED, CaseStatus.SENT_TO_DEPARTMENTS, CaseStatus.RESPONSE_PREPARED],
  [CaseStatus.RESPONSE_PREPARED]: [CaseStatus.RESPONSE_SENT, CaseStatus.SENT_TO_DEPARTMENTS, CaseStatus.EXTENDED],
  [CaseStatus.RESPONSE_SENT]: [CaseStatus.RESPONSE_PREPARED],
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: CaseStatus): readonly CaseStatus[] {
  return ALLOWED_TRANSITIONS[from];
}
