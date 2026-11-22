import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '../ai/llm.service.js';
import type { EnvironmentVariables } from '../config/environment/environment-variables.validation.js';
import type { KnowledgeChunkMatch } from './interfaces/knowledge-chunk-match.interface.js';
import type { KnowledgeSearchOptions } from './interfaces/knowledge-search-options.interface.js';
import { KnowledgeRepository } from './knowledge.repository.js';

/** Finds the knowledge base fragments most relevant to a question (the "R" of RAG). */
@Injectable()
export class KnowledgeRetriever {
  private readonly defaultK: number;

  constructor(
    private readonly llm: LlmService,
    private readonly repository: KnowledgeRepository,
    config: ConfigService,
  ) {
    this.defaultK = config.getOrThrow<EnvironmentVariables['RAG_TOP_K']>('RAG_TOP_K');
  }

  /**
   * @throws {AiNotConfiguredError}
   * @throws {AiRequestFailedError}
   */
  async search(query: string, options: KnowledgeSearchOptions = {}): Promise<KnowledgeChunkMatch[]> {
    const text = query.trim();
    if (!text) {
      return [];
    }
    const embedding = await this.llm.embedQuery(text);
    return this.repository.searchChunks(embedding, options.k ?? this.defaultK, options.categories);
  }
}
