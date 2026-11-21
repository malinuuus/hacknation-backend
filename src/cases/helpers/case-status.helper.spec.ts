import { CaseStatus } from '../../generated/prisma/enums.js';
import { allowedTransitions, canChangeDeadline, canTransition } from './case-status.helper.js';

describe('case status transitions', () => {
  it.each([
    [CaseStatus.NEW, CaseStatus.SENT_TO_DEPARTMENTS],
    [CaseStatus.SENT_TO_DEPARTMENTS, CaseStatus.RESPONSE_PREPARED],
    [CaseStatus.RESPONSE_PREPARED, CaseStatus.SENT_TO_DEPARTMENTS],
    [CaseStatus.RESPONSE_PREPARED, CaseStatus.RESPONSE_SENT],
    [CaseStatus.RESPONSE_SENT, CaseStatus.RESPONSE_PREPARED],
  ])('allows %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    [CaseStatus.NEW, CaseStatus.RESPONSE_SENT],
    [CaseStatus.NEW, CaseStatus.NEW],
    [CaseStatus.SENT_TO_DEPARTMENTS, CaseStatus.RESPONSE_SENT],
    [CaseStatus.RESPONSE_SENT, CaseStatus.NEW],
  ])('rejects %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it('lets every open status reach RESPONSE_PREPARED', () => {
    for (const status of [CaseStatus.NEW, CaseStatus.SENT_TO_DEPARTMENTS]) {
      expect(allowedTransitions(status)).toContain(CaseStatus.RESPONSE_PREPARED);
    }
  });

  it('allows deadline changes only before the response is sent', () => {
    expect(canChangeDeadline(CaseStatus.RESPONSE_PREPARED)).toBe(true);
    expect(canChangeDeadline(CaseStatus.RESPONSE_SENT)).toBe(false);
  });
});
