import { BadRequestException } from '@nestjs/common';
import type { Mocked } from 'vitest';
import { AiNotConfiguredError } from '../../ai/errors/ai-not-configured.error.js';
import type { LlmService } from '../../ai/llm.service.js';
import { KnowledgeCategory } from '../../generated/prisma/enums.js';
import type { KnowledgeRetriever } from '../../knowledge/knowledge-retriever.service.js';
import type { CaseDocumentsRepository } from '../case-documents.repository.js';
import type { CasesRepository } from '../cases.repository.js';
import { DraftSourceKind } from '../enums/draft-source-kind.enum.js';
import { DraftResponseService, pickSources } from './draft-response.service.js';

describe('pickSources', () => {
  it('maps 1-based citations to sources, once each, ignoring unknown numbers', () => {
    expect(pickSources(['a', 'b', 'c'], [3, 1, 3, 0, 4, 1.5])).toEqual(['c', 'a']);
  });
});

describe('DraftResponseService', () => {
  let llm: Mocked<LlmService>;
  let retriever: Mocked<KnowledgeRetriever>;
  let casesRepository: Mocked<CasesRepository>;
  let documentsRepository: Mocked<CaseDocumentsRepository>;
  let service: DraftResponseService;

  beforeEach(() => {
    llm = {
      isConfigured: vi.fn().mockReturnValue(true),
      structured: vi.fn().mockResolvedValue({ text: ' Odpowiedź ', usedSources: [1, 2] }),
    } as unknown as Mocked<LlmService>;
    retriever = {
      search: vi.fn().mockResolvedValue([
        {
          chunkId: 'chunk-1',
          documentId: 'kb-1',
          documentName: 'Ustawa o dostępie do informacji publicznej',
          category: KnowledgeCategory.LAW,
          position: 0,
          content: 'Art. 13. Udostępnianie informacji publicznej następuje bez zbędnej zwłoki.',
          score: 0.9,
        },
      ]),
    } as unknown as Mocked<KnowledgeRetriever>;
    casesRepository = {
      findById: vi.fn().mockResolvedValue({
        id: 'case-1',
        caseNumber: 'BKS.IV.1431.590.2026',
        subject: 'Basen',
        requesterName: 'Jan Kowalski',
        requestText: 'Wniosek',
        receivedAt: new Date('2026-11-08T00:00:00Z'),
        writtenAt: null,
        questions: [
          { id: 'q-1', position: 0, text: 'Ile kosztował remont?', departmentId: null },
          { id: 'q-2', position: 1, text: 'Kto wykonał remont?', departmentId: null },
        ],
      }),
    } as unknown as Mocked<CasesRepository>;
    documentsRepository = {
      findWithTextByCase: vi.fn().mockResolvedValue([
        {
          id: 'doc-1',
          originalName: 'odpowiedz-wim.pdf',
          extractedText: 'Koszt remontu wyniósł 1 200 000 zł.',
          department: { id: 'dep-1', symbol: 'WIM', name: 'Wydział Inwestycji Miasta' },
        },
      ]),
    } as unknown as Mocked<CaseDocumentsRepository>;
    service = new DraftResponseService(llm, retriever, casesRepository, documentsRepository);
  });

  it('numbers department replies before knowledge fragments and returns the cited sources', async () => {
    const result = await service.generate('case-1', {});

    expect(result.text).toBe('Odpowiedź');
    expect(result.sources).toEqual([
      expect.objectContaining({ kind: DraftSourceKind.CaseDocument, documentId: 'doc-1', departmentSymbol: 'WIM' }),
      expect.objectContaining({ kind: DraftSourceKind.Knowledge, documentId: 'kb-1', category: KnowledgeCategory.LAW }),
    ]);
    const prompt = llm.structured.mock.calls[0][2];
    expect(prompt.user).toContain('[1] Wydział Inwestycji Miasta (WIM)');
    expect(prompt.user).toContain('[2] (przepis prawa) Ustawa o dostępie do informacji publicznej');
  });

  it('answers only the chosen questions', async () => {
    await service.generate('case-1', { questionIds: ['q-2'] });

    const prompt = llm.structured.mock.calls[0][2];
    expect(prompt.user).toContain('1. Kto wykonał remont?');
    expect(prompt.user).not.toContain('Ile kosztował remont?');
  });

  it('rejects question ids from another case', async () => {
    await expect(service.generate('case-1', { questionIds: ['q-9'] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires the AI', async () => {
    llm.isConfigured.mockReturnValue(false);
    await expect(service.generate('case-1', {})).rejects.toBeInstanceOf(AiNotConfiguredError);
  });
});
