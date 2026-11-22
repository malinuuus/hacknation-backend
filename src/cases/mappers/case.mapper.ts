import { toDepartmentDto } from '../../departments/mappers/department.mapper.js';
import type { CaseDetailRecord, CaseSummaryRecord } from '../cases.repository.js';
import { allowedTransitions } from '../helpers/case-status.helper.js';
import { formatDateOnly } from '../helpers/date-only.helper.js';
import { maxExtendedDueDate } from '../helpers/deadline.helper.js';
import { computeUrgency } from '../helpers/urgency.helper.js';
import { toCaseDocumentDto } from './case-document.mapper.js';
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
    isExtended: record.extendedDueAt !== null,
    effectiveDueAt: formatDateOnly(effectiveDueAt),
    daysLeft,
    urgency,
    respondedAt: formatOptional(record.respondedAt),
    handlerInitials: record.handlerInitials,
    assignee: record.assignee,
    departments: record.departments.map((link) => ({
      symbol: link.department.symbol,
      answered: link.answeredAt !== null,
    })),
  };
}

export function toCaseDetailDto(record: CaseDetailRecord, today: Date): CaseDetailDto {
  return {
    ...toCaseSummaryDto(record, today),
    requestText: record.requestText,
    writtenAt: formatOptional(record.writtenAt),
    extensionReason: record.extensionReason,
    requesterName: record.requesterName,
    requesterEmail: record.requesterEmail,
    requesterAddress: record.requesterAddress,
    notes: record.notes,
    departmentRequests: record.departments.map((link) => ({
      department: toDepartmentDto(link.department),
      requestedAt: formatDateOnly(link.requestedAt),
      answeredAt: formatOptional(link.answeredAt),
    })),
    questions: record.questions.map((question) => ({
      id: question.id,
      position: question.position,
      text: question.text,
      departmentId: question.departmentId,
    })),
    documents: record.documents.map(toCaseDocumentDto),
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
    allowedStatuses: [...allowedTransitions(record.status)],
    maxExtendedDueAt: formatDateOnly(maxExtendedDueDate(record.receivedAt)),
  };
}
