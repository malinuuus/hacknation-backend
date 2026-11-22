import type { KnowledgeIndexStatus } from '../../generated/prisma/enums.js';
import type { IndexedChunk } from './indexed-chunk.interface.js';

export interface IndexingResult {
  status: KnowledgeIndexStatus;
  chunks: IndexedChunk[];
}
