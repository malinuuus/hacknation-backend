export class SequenceNumberTakenError extends Error {
  constructor(sequenceNumber: number, year: number) {
    super(`Sequence number ${sequenceNumber} is already used in ${year}`);
    this.name = 'SequenceNumberTakenError';
  }
}
