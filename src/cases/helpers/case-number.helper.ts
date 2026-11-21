/** Case signs end with `.<sequence>.<year>`, e.g. BKS.IV.1431.590.2026. */
const SEQUENCE_AND_YEAR = /\.(\d{1,9})\.(\d{4})$/;

export function formatCaseNumber(prefix: string, sequenceNumber: number, year: number): string {
  return `${prefix}.${sequenceNumber}.${year}`;
}

/** Reads the sequence number and year from a case sign ending with `.<sequence>.<year>`. */
export function parseSequenceAndYear(caseNumber: string): { sequenceNumber: number; year: number } | undefined {
  const match = SEQUENCE_AND_YEAR.exec(caseNumber);
  if (!match) {
    return undefined;
  }
  const sequenceNumber = Number(match[1]);
  return sequenceNumber > 0 ? { sequenceNumber, year: Number(match[2]) } : undefined;
}

/**
 * Reads the sequence number from a case sign, if it ends with
 * `.<sequence>.<year>` for the given year. Returns `undefined` otherwise.
 */
export function sequenceNumberFromCaseNumber(caseNumber: string, year: number): number | undefined {
  const parsed = parseSequenceAndYear(caseNumber);
  return parsed?.year === year ? parsed.sequenceNumber : undefined;
}
