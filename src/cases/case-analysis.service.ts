import { Injectable } from '@nestjs/common';
import { TextExtractionStatus } from '../generated/prisma/enums.js';
import { CaseDocumentsService } from './case-documents.service.js';
import { CasesRepository } from './cases.repository.js';
import type { CaseAnalysisResponseDto } from './dto/case-analysis-response.dto.js';
import { AnalysisWarning } from './enums/analysis-warning.enum.js';
import { parseDateOnly, todayInOfficeTimeZone } from './helpers/date-only.helper.js';
import { parseRequestMetadata } from './helpers/request-metadata.helper.js';

const EXTRACTION_WARNINGS: Partial<Record<TextExtractionStatus, AnalysisWarning>> = {
  [TextExtractionStatus.NO_TEXT]: AnalysisWarning.TextNotFound,
  [TextExtractionStatus.UNSUPPORTED]: AnalysisWarning.TextExtractionUnsupported,
  [TextExtractionStatus.FAILED]: AnalysisWarning.TextExtractionFailed,
};

/**
 * Reads a request file before it is registered (brief, steps 2–3): returns its
 * text and the case number, receipt date and subject found in it, so the form
 * can be prefilled. Nothing is stored; the official confirms the data and
 * registers the case with `POST /cases`.
 */
@Injectable()
export class CaseAnalysisService {
  constructor(
    private readonly documentsService: CaseDocumentsService,
    private readonly casesRepository: CasesRepository,
  ) {}

  async analyze(file: Express.Multer.File | undefined): Promise<CaseAnalysisResponseDto> {
    const upload = await this.documentsService.readUpload(file);
    const suggestions = parseRequestMetadata({ fileName: upload.originalName, text: upload.extraction.text });

    const warnings: AnalysisWarning[] = [];
    const extractionWarning = EXTRACTION_WARNINGS[upload.extraction.status];
    if (extractionWarning) {
      warnings.push(extractionWarning);
    }

    if (suggestions.receivedAt && parseDateOnly(suggestions.receivedAt.value) > todayInOfficeTimeZone()) {
      suggestions.receivedAt = null;
      warnings.push(AnalysisWarning.ReceivedAtInFutureIgnored);
    }

    if (suggestions.caseNumber && (await this.casesRepository.caseNumberExists(suggestions.caseNumber.value))) {
      warnings.push(AnalysisWarning.CaseNumberTaken);
    }

    return {
      fileName: upload.originalName,
      textExtractionStatus: upload.extraction.status,
      extractedText: upload.extraction.text,
      suggestions,
      warnings,
    };
  }
}
