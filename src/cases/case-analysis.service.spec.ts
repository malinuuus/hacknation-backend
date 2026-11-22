import type { Mocked } from 'vitest';
import { AiRequestFailedError } from '../ai/errors/ai-request-failed.error.js';
import { TextExtractionStatus } from '../generated/prisma/enums.js';
import type { RequestExtractionService } from './ai/request-extraction.service.js';
import { CaseAnalysisService } from './case-analysis.service.js';
import type { CaseDocumentsService } from './case-documents.service.js';
import type { CasesRepository } from './cases.repository.js';
import { AiAnalysisStatus } from './enums/ai-analysis-status.enum.js';
import { AnalysisWarning } from './enums/analysis-warning.enum.js';
import { ExtractionMethod } from './enums/extraction-method.enum.js';
import type { RequestExtraction } from './interfaces/request-extraction.interface.js';

const text = 'Bydgoszcz, 17.08.2026 r.\nWnoszę o udostępnienie informacji dotyczącej kosztów remontu basenu.';
const file = { originalname: 'wniosek.pdf' } as Express.Multer.File;

function extraction(fields: Partial<RequestExtraction['fields']> = {}): RequestExtraction {
  return {
    fields: {
      caseNumber: null,
      receivedAt: null,
      subject: 'Koszty remontu basenu',
      writtenAt: null,
      requesterName: 'Jan Kowalski',
      requesterEmail: null,
      requesterAddress: null,
      ...fields,
    },
    questions: [{ text: 'Ile kosztował remont basenu?', departmentIds: ['dep-1'] }],
    departments: [{ departmentId: 'dep-1', symbol: 'WIM', name: 'Wydział Inwestycji Miasta', reason: 'Inwestycje.' }],
  };
}

describe('CaseAnalysisService', () => {
  let documentsService: Mocked<CaseDocumentsService>;
  let casesRepository: Mocked<CasesRepository>;
  let requestExtraction: Mocked<RequestExtractionService>;
  let service: CaseAnalysisService;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-21T11:00:00Z'), toFake: ['Date'] });
    documentsService = {
      readUpload: vi.fn().mockResolvedValue({
        originalName: 'wniosek.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(''),
        extraction: { status: TextExtractionStatus.EXTRACTED, text },
      }),
    } as unknown as Mocked<CaseDocumentsService>;
    casesRepository = {
      caseNumberExists: vi.fn().mockResolvedValue(false),
    } as unknown as Mocked<CasesRepository>;
    requestExtraction = {
      isAvailable: vi.fn().mockReturnValue(true),
      extract: vi.fn().mockResolvedValue(extraction()),
    } as unknown as Mocked<RequestExtractionService>;
    service = new CaseAnalysisService(documentsService, casesRepository, requestExtraction);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('combines the AI reading with pattern matches', async () => {
    const result = await service.analyze(file);

    expect(result.ai.status).toBe(AiAnalysisStatus.Used);
    expect(result.suggestions.requesterName).toMatchObject({ value: 'Jan Kowalski', method: ExtractionMethod.Ai });
    expect(result.suggestions.writtenAt).toMatchObject({ value: '2026-08-17', method: ExtractionMethod.Pattern });
    expect(result.questions).toHaveLength(1);
    expect(result.departments[0].symbol).toBe('WIM');
  });

  it('falls back to pattern matching when the AI is not configured', async () => {
    requestExtraction.isAvailable.mockReturnValue(false);

    const result = await service.analyze(file);

    expect(requestExtraction.extract.mock.calls).toHaveLength(0);
    expect(result.ai.status).toBe(AiAnalysisStatus.NotConfigured);
    expect(result.suggestions.subject?.method).toBe(ExtractionMethod.Pattern);
    expect(result.questions).toEqual([]);
    expect(result.departments).toEqual([]);
  });

  it('falls back to pattern matching when the AI fails', async () => {
    requestExtraction.extract.mockRejectedValue(new AiRequestFailedError('request_extraction', new Error('timeout')));

    const result = await service.analyze(file);

    expect(result.ai.status).toBe(AiAnalysisStatus.Failed);
    expect(result.suggestions.writtenAt?.value).toBe('2026-08-17');
  });

  it('skips the AI when the file has no text', async () => {
    documentsService.readUpload.mockResolvedValue({
      originalName: 'skan.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(''),
      extraction: { status: TextExtractionStatus.NO_TEXT, text: null },
    });

    const result = await service.analyze(file);

    expect(result.ai.status).toBe(AiAnalysisStatus.SkippedNoText);
    expect(result.warnings).toEqual([AnalysisWarning.TextNotFound]);
  });

  it('applies the date checks to AI values', async () => {
    requestExtraction.extract.mockResolvedValue(extraction({ receivedAt: '2026-12-01', writtenAt: '2026-11-30' }));

    const result = await service.analyze(file);

    expect(result.suggestions.receivedAt).toBeNull();
    expect(result.warnings).toContain(AnalysisWarning.ReceivedAtInFutureIgnored);
    // Written after today: dropped (receipt unknown, so today is the limit).
    expect(result.suggestions.writtenAt).toBeNull();
  });

  it('warns when the case number from the AI is taken', async () => {
    requestExtraction.extract.mockResolvedValue(extraction({ caseNumber: 'BKS.IV.1431.590.2026' }));
    casesRepository.caseNumberExists.mockResolvedValue(true);

    const result = await service.analyze(file);

    expect(result.warnings).toContain(AnalysisWarning.CaseNumberTaken);
  });
});
