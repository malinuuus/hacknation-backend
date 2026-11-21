export class CaseDepartmentNotFoundError extends Error {
  constructor(caseId: string, departmentId: string) {
    super(`Department "${departmentId}" was not asked about case "${caseId}"`);
    this.name = 'CaseDepartmentNotFoundError';
  }
}
