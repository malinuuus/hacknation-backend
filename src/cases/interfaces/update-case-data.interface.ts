/** Fields to change; `undefined` leaves a field as is, `null` clears it. */
export interface UpdateCaseData {
  sequenceNumber?: number;
  caseNumber?: string;
  subject?: string;
  requestText?: string | null;
  receivedAt?: Date;
  dueAt?: Date;
  effectiveDueAt?: Date;
  handlerInitials?: string | null;
  assigneeId?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterAddress?: string | null;
  notes?: string | null;
}
