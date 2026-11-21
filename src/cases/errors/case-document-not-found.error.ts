export class CaseDocumentNotFoundError extends Error {
  constructor(caseId: string, documentId: string) {
    super(`Document "${documentId}" not found in case "${caseId}"`);
    this.name = 'CaseDocumentNotFoundError';
  }
}
