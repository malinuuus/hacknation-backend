import type { KnowledgeDocumentDetailDto, KnowledgeDocumentDto } from '../dto/knowledge-document-response.dto.js';
import type { KnowledgeDocumentDetailRecord, KnowledgeDocumentRecord } from '../knowledge.repository.js';

export function toKnowledgeDocumentDto(record: KnowledgeDocumentRecord): KnowledgeDocumentDto {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    description: record.description,
    originalName: record.originalName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    textExtractionStatus: record.textExtractionStatus,
    indexStatus: record.indexStatus,
    chunkCount: record.chunkCount,
    uploadedBy: record.uploadedBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toKnowledgeDocumentDetailDto(record: KnowledgeDocumentDetailRecord): KnowledgeDocumentDetailDto {
  return { ...toKnowledgeDocumentDto(record), extractedText: record.extractedText };
}
