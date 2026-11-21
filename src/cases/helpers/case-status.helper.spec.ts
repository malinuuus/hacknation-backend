import { CaseStatus } from '../../generated/prisma/enums.js';
import { allowedTransitions, canTransition } from './case-status.helper.js';

describe('case status transitions', () => {
  it.each([
    [CaseStatus.NEW, CaseStatus.SENT_TO_DEPARTMENTS],
    [CaseStatus.SENT_TO_DEPARTMENTS, CaseStatus.EXTENDED],
    [CaseStatus.EXTENDED, CaseStatus.EXTENDED],
    [CaseStatus.EXTENDED, CaseStatus.RESPONSE_PREPARED],
    [CaseStatus.RESPONSE_PREPARED, CaseStatus.RESPONSE_SENT],
    [CaseStatus.RESPONSE_SENT, CaseStatus.RESPONSE_PREPARED],
  ])('allows %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    [CaseStatus.NEW, CaseStatus.RESPONSE_SENT],
    [CaseStatus.NEW, CaseStatus.NEW],
    [CaseStatus.RESPONSE_SENT, CaseStatus.NEW],
    [CaseStatus.RESPONSE_SENT, CaseStatus.EXTENDED],
  ])('rejects %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it('lets every non-final status reach RESPONSE_PREPARED', () => {
    for (const status of [CaseStatus.NEW, CaseStatus.SENT_TO_DEPARTMENTS, CaseStatus.EXTENDED]) {
      expect(allowedTransitions(status)).toContain(CaseStatus.RESPONSE_PREPARED);
    }
  });
});
