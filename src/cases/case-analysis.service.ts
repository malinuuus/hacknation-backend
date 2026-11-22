import { Injectable, Logger } from '@nestjs/common';
import { TextExtractionStatus } from '../generated/prisma/enums.js';
import { RequestExtractionService } from './ai/request-extraction.service.js';
import { CaseDocumentsService } from './case-documents.service.js';
import { CasesRepository } from './cases.repository.js';
import type { CaseAnalysisResponseDto } from './dto/case-analysis-response.dto.js';
import { AiAnalysisStatus } from './enums/ai-analysis-status.enum.js';
import { AnalysisWarning } from './enums/analysis-warning.enum.js';
import { parseDateOnly, todayInOfficeTimeZone } from './helpers/date-only.helper.js';
import { mergeSuggestions } from './helpers/merge-suggestions.helper.js';
import { parseRequestMetadata } from './helpers/request-metadata.helper.js';
import type { RequestExtraction } from './interfaces/request-extraction.interface.js';

const EXTRACTION_WARNINGS: Partial<Record<TextExtractionStatus, AnalysisWarning>> = {
  [TextExtractionStatus.NO_TEXT]: AnalysisWarning.TextNotFound,
  [TextExtractionStatus.UNSUPPORTED]: AnalysisWarning.TextExtractionUnsupported,
  [TextExtractionStatus.FAILED]: AnalysisWarning.TextExtractionFailed,
};

/**
 * Reads a request file before it is registered (brief, steps 2–3): returns its
 * text, the case number, dates, requester and subject found in it, and — with
 * AI configured — its questions and the departments to ask, so the form can be
 * prefilled. Nothing is stored; the official confirms the data and registers
 * the case with `POST /cases`.
 */
@Injectable()
export class CaseAnalysisService {
  private readonly logger = new Logger(CaseAnalysisService.name);

  constructor(
    private readonly documentsService: CaseDocumentsService,
    private readonly casesRepository: CasesRepository,
    private readonly requestExtraction: RequestExtractionService,
  ) {}

  async analyze(file: Express.Multer.File | undefined): Promise<CaseAnalysisResponseDto> {
    const upload = await this.documentsService.readUpload(file);
    const text = upload.extraction.text;
    const patterns = parseRequestMetadata({ fileName: upload.originalName, text });

    const { status: aiStatus, extraction } = await this.extractWithAi(upload.originalName, text);
    const suggestions = mergeSuggestions(patterns, extraction?.fields ?? null);

    const warnings: AnalysisWarning[] = [];
    const extractionWarning = EXTRACTION_WARNINGS[upload.extraction.status];
    if (extractionWarning) {
      warnings.push(extractionWarning);
    }

    const today = todayInOfficeTimeZone();
    if (suggestions.receivedAt && parseDateOnly(suggestions.receivedAt.value) > today) {
      suggestions.receivedAt = null;
      warnings.push(AnalysisWarning.ReceivedAtInFutureIgnored);
    }

    // A letter is written before it is received; a later date is a misread, not worth a warning.
    const latestWrittenAt = suggestions.receivedAt ? parseDateOnly(suggestions.receivedAt.value) : today;
    if (suggestions.writtenAt && parseDateOnly(suggestions.writtenAt.value) > latestWrittenAt) {
      suggestions.writtenAt = null;
    }

    if (suggestions.caseNumber && (await this.casesRepository.caseNumberExists(suggestions.caseNumber.value))) {
      warnings.push(AnalysisWarning.CaseNumberTaken);
    }

    return {
      fileName: upload.originalName,
      textExtractionStatus: upload.extraction.status,
      extractedText: text,
      suggestions,
      questions: extraction?.questions ?? [],
      departments: extraction?.departments ?? [],
      ai: { status: aiStatus },
      warnings,
    };
  }

  /** The AI is an addition: without it, or when it fails, the pattern matches are still returned. */
  private async extractWithAi(
    fileName: string,
    text: string | null,
  ): Promise<{ status: AiAnalysisStatus; extraction: RequestExtraction | null }> {
    if (!text) {
      return { status: AiAnalysisStatus.SkippedNoText, extraction: null };
    }
    if (!this.requestExtraction.isAvailable()) {
      return { status: AiAnalysisStatus.NotConfigured, extraction: null };
    }
    try {
      return { status: AiAnalysisStatus.Used, extraction: await this.requestExtraction.extract({ fileName, text }) };
    } catch (error) {
      this.logger.warn(`AI extraction failed, using pattern matching only: ${String(error)}`);
      return { status: AiAnalysisStatus.Failed, extraction: null };
    }
  }
}
