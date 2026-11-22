import type { ConfigService } from '@nestjs/config';
import type { Mocked } from 'vitest';
import { AiRequestFailedError } from '../ai/errors/ai-request-failed.error.js';
import type { LlmService } from '../ai/llm.service.js';
import { KnowledgeIndexStatus } from '../generated/prisma/enums.js';
import { KnowledgeIndexer } from './knowledge-indexer.service.js';

const config = {
  getOrThrow: (key: string) => ({ RAG_CHUNK_SIZE: 200, RAG_CHUNK_OVERLAP: 20 })[key],
} as unknown as ConfigService;

describe('KnowledgeIndexer', () => {
  let llm: Mocked<LlmService>;
  let indexer: KnowledgeIndexer;

  beforeEach(() => {
    llm = {
      isConfigured: vi.fn().mockReturnValue(true),
      embedDocuments: vi.fn((texts: string[]) => Promise.resolve(texts.map(() => [0.1, 0.2]))),
    } as unknown as Mocked<LlmService>;
    indexer = new KnowledgeIndexer(llm, config);
  });

  it('splits the text into overlapping chunks and embeds each', async () => {
    const paragraph = 'Informacja publiczna jest udostępniana na wniosek bez zbędnej zwłoki. ';
    const result = await indexer.index(`${paragraph.repeat(4)}\n\n${paragraph.repeat(4)}`);

    expect(result.status).toBe(KnowledgeIndexStatus.INDEXED);
    expect(result.chunks.length).toBeGreaterThan(1);
    expect(result.chunks.every((chunk) => chunk.content.length <= 200)).toBe(true);
    expect(result.chunks[0].embedding).toEqual([0.1, 0.2]);
  });

  it('reports NO_TEXT, PENDING and FAILED without throwing', async () => {
    expect((await indexer.index(null)).status).toBe(KnowledgeIndexStatus.NO_TEXT);

    llm.isConfigured.mockReturnValue(false);
    expect((await indexer.index('Tekst')).status).toBe(KnowledgeIndexStatus.PENDING);

    llm.isConfigured.mockReturnValue(true);
    llm.embedDocuments.mockRejectedValue(new AiRequestFailedError('embedDocuments', new Error('429')));
    expect(await indexer.index('Tekst')).toEqual({ status: KnowledgeIndexStatus.FAILED, chunks: [] });
  });
});
