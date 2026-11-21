import type { NewCaseDocumentData } from './new-case-document-data.interface.js';

export interface CreateCaseData {
  year: number;
  /** Explicit sequence number; the next free one of the year when omitted. */
  sequenceNumber?: number;
  /** Explicit case number, or a function building one from the assigned sequence number. */
  caseNumber: string | ((sequenceNumber: number) => string);
  subject: string;
  receivedAt: Date;
  dueAt: Date;
  handlerInitials?: string;
  assigneeId?: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterAddress?: string;
  notes?: string;
  createdById: string;
  /** The request file, stored together with the case. */
  document?: NewCaseDocumentData;
}
