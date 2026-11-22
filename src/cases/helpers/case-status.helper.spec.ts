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
    // act
    const result = canTransition(from, to);

    // assert
    expect(result).toBe(true);
  });

  it.each([
    [CaseStatus.NEW, CaseStatus.RESPONSE_SENT],
    [CaseStatus.NEW, CaseStatus.NEW],
    [CaseStatus.SENT_TO_DEPARTMENTS, CaseStatus.RESPONSE_SENT],
    [CaseStatus.RESPONSE_SENT, CaseStatus.NEW],
  ])('rejects %s → %s', (from, to) => {
    // act
    const result = canTransition(from, to);

    // assert
    expect(result).toBe(false);
  });

  it.each([CaseStatus.NEW, CaseStatus.SENT_TO_DEPARTMENTS])('lets %s reach RESPONSE_PREPARED', (status) => {
    // act
    const result = allowedTransitions(status);

    // assert
    expect(result).toContain(CaseStatus.RESPONSE_PREPARED);
  });

  it.each([
    [CaseStatus.RESPONSE_PREPARED, true],
    [CaseStatus.RESPONSE_SENT, false],
  ])('allows deadline changes only before the response is sent (%s)', (status, expected) => {
    // act
    const result = canChangeDeadline(status);

    // assert
    expect(result).toBe(expected);
  });
});
