import { formatCaseNumber, parseSequenceAndYear, sequenceNumberFromCaseNumber } from './case-number.helper.js';

describe('case numbers', () => {
  it('formats prefix, sequence and year', () => {
    expect(formatCaseNumber('BKS.IV.1431', 590, 2026)).toBe('BKS.IV.1431.590.2026');
  });

  it.each([
    ['BKS.IV.1431.590.2026', 2026, 590],
    ['BKS.IV.1431.543.2026', 2026, 543],
    ['BKS.IV.1431.543.2025', 2026, undefined], // year differs from receipt year
    ['WNIOSEK-17', 2026, undefined],
    ['BKS.IV.1431.0.2026', 2026, undefined],
  ])('reads the sequence from %s (year %i)', (caseNumber, year, expected) => {
    expect(sequenceNumberFromCaseNumber(caseNumber, year)).toBe(expected);
  });

  it('reads the sequence and year of any year', () => {
    expect(parseSequenceAndYear('BKS.IV.1431.543.2025')).toEqual({ sequenceNumber: 543, year: 2025 });
    expect(parseSequenceAndYear('WNIOSEK-17')).toBeUndefined();
  });
});
