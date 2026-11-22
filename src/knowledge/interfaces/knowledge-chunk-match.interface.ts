import type { KnowledgeCategory } from '../../generated/prisma/enums.js';

/** A knowledge base fragment found for a query, most similar first. */
export interface KnowledgeChunkMatch {
  chunkId: string;
  documentId: string;
  documentName: string;
  category: KnowledgeCategory;
  position: number;
  content: string;
  /** Cosine similarity, 1 = identical. */
  score: number;
}
