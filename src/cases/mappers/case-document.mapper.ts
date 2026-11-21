import type { CaseDocumentDetailRecord, CaseDocumentRecord } from '../case-documents.repository.js';
import type { CaseDocumentDetailDto, CaseDocumentDto } from '../dto/case-document-response.dto.js';

export function toCaseDocumentDto(record: CaseDocumentRecord): CaseDocumentDto {
  return {
    id: record.id,
    kind: record.kind,
    department: record.department,
    originalName: record.originalName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    textExtractionStatus: record.textExtractionStatus,
    uploadedBy: record.uploadedBy,
    createdAt: record.createdAt,
  };
}

export function toCaseDocumentDetailDto(record: CaseDocumentDetailRecord): CaseDocumentDetailDto {
  return { ...toCaseDocumentDto(record), extractedText: record.extractedText };
}
