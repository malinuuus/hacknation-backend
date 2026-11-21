import type { CaseDetailRecord, CaseSummaryRecord } from '../cases.repository.js';
import { formatDateOnly } from '../helpers/date-only.helper.js';
import { computeUrgency } from '../helpers/urgency.helper.js';
import type { CaseDetailDto, CaseSummaryDto } from '../dto/case-response.dto.js';

const formatOptional = (date: Date | null): string | null => (date ? formatDateOnly(date) : null);

export function toCaseSummaryDto(record: CaseSummaryRecord, today: Date): CaseSummaryDto {
  const { effectiveDueAt, daysLeft, urgency } = computeUrgency(record, today);

  return {
    id: record.id,
    year: record.year,
    sequenceNumber: record.sequenceNumber,
    caseNumber: record.caseNumber,
    subject: record.subject,
    status: record.status,
    receivedAt: formatDateOnly(record.receivedAt),
    dueAt: formatDateOnly(record.dueAt),
    extendedDueAt: formatOptional(record.extendedDueAt),
    effectiveDueAt: formatDateOnly(effectiveDueAt),
    daysLeft,
    urgency,
    respondedAt: formatOptional(record.respondedAt),
    handlerInitials: record.handlerInitials,
    assignee: record.assignee,
  };
}

export function toCaseDetailDto(record: CaseDetailRecord, today: Date): CaseDetailDto {
  return {
    ...toCaseSummaryDto(record, today),
    extensionReason: record.extensionReason,
    requesterName: record.requesterName,
    requesterEmail: record.requesterEmail,
    requesterAddress: record.requesterAddress,
    notes: record.notes,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    statusHistory: record.statusChanges.map((change) => ({
      fromStatus: change.fromStatus,
      toStatus: change.toStatus,
      comment: change.comment,
      changedBy: change.changedBy,
      createdAt: change.createdAt,
    })),
  };
}
