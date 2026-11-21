import type { NewCaseDocumentData } from './new-case-document-data.interface.js';

export interface CreateCaseDocumentData extends NewCaseDocumentData {
  caseId: string;
  /** Records the department's reply date, if not set yet, in the same transaction. */
  departmentAnsweredAt?: Date;
}
