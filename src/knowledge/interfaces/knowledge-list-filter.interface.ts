import type { KnowledgeCategory } from '../../generated/prisma/enums.js';

export interface KnowledgeListFilter {
  search?: string;
  category?: KnowledgeCategory;
  limit: number;
  offset: number;
}
