export class CaseStatusChangedError extends Error {
  constructor(id: string) {
    super(`Case "${id}" was changed by someone else; reload and try again`);
    this.name = 'CaseStatusChangedError';
  }
}
