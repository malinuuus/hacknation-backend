import type { KnowledgeCategory, KnowledgeIndexStatus, TextExtractionStatus } from '../../generated/prisma/enums.js';
import type { IndexedChunk } from './indexed-chunk.interface.js';

export interface NewKnowledgeDocumentData {
  name: string;
  category: KnowledgeCategory;
  description?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storageKey: string;
  extractedText: string | null;
  textExtractionStatus: TextExtractionStatus;
  indexStatus: KnowledgeIndexStatus;
  chunks: IndexedChunk[];
  uploadedById: string;
}
