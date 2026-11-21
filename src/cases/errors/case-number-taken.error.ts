export class CaseNumberTakenError extends Error {
  constructor(caseNumber: string) {
    super(`Case number "${caseNumber}" is already used`);
    this.name = 'CaseNumberTakenError';
  }
}
