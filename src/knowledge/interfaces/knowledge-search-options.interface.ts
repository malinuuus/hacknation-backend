import type { KnowledgeCategory } from '../../generated/prisma/enums.js';

export interface KnowledgeSearchOptions {
  /** Number of fragments; defaults to RAG_TOP_K. */
  k?: number;
  /** Only fragments of documents in these categories; all when empty. */
  categories?: KnowledgeCategory[];
}
