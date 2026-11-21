export class CaseNotFoundError extends Error {
  constructor(id: string) {
    super(`Case "${id}" not found`);
    this.name = 'CaseNotFoundError';
  }
}
