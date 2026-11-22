import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiNotConfiguredError } from '../ai/errors/ai-not-configured.error.js';
import { LlmService } from '../ai/llm.service.js';
import type { EnvironmentVariables } from '../config/environment/environment-variables.validation.js';
import { KnowledgeIndexStatus } from '../generated/prisma/enums.js';
import type { IndexingResult } from './interfaces/indexing-result.interface.js';

/** Paragraphs first, then lines, sentences and words, so fragments keep whole thoughts. */
const SEPARATORS = ['\n\n', '\n', '. ', '; ', ', ', ' ', ''];

/**
 * Splits a document's text into overlapping fragments and embeds them.
 * Never throws: problems end up in the returned status, so the uploaded
 * file is kept and can be reindexed later.
 */
@Injectable()
export class KnowledgeIndexer {
  private readonly logger = new Logger(KnowledgeIndexer.name);
  private readonly splitter: RecursiveCharacterTextSplitter;

  constructor(
    private readonly llm: LlmService,
    config: ConfigService,
  ) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.getOrThrow<EnvironmentVariables['RAG_CHUNK_SIZE']>('RAG_CHUNK_SIZE'),
      chunkOverlap: config.getOrThrow<EnvironmentVariables['RAG_CHUNK_OVERLAP']>('RAG_CHUNK_OVERLAP'),
      separators: SEPARATORS,
    });
  }

  async index(text: string | null): Promise<IndexingResult> {
    if (!text?.trim()) {
      return { status: KnowledgeIndexStatus.NO_TEXT, chunks: [] };
    }
    if (!this.llm.isConfigured()) {
      return { status: KnowledgeIndexStatus.PENDING, chunks: [] };
    }

    try {
      const contents = (await this.splitter.splitText(text)).map((chunk) => chunk.trim()).filter(Boolean);
      const embeddings = await this.llm.embedDocuments(contents);
      return {
        status: KnowledgeIndexStatus.INDEXED,
        chunks: contents.map((content, index) => ({ content, embedding: embeddings[index] })),
      };
    } catch (error) {
      if (error instanceof AiNotConfiguredError) {
        return { status: KnowledgeIndexStatus.PENDING, chunks: [] };
      }
      this.logger.warn(`Indexing failed: ${String(error)}`);
      return { status: KnowledgeIndexStatus.FAILED, chunks: [] };
    }
  }
}
