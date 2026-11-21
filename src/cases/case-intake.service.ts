import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { CaseDocumentKind, TextExtractionStatus } from '../generated/prisma/enums.js';
import { CaseDocumentsService } from './case-documents.service.js';
import { CasesService } from './cases.service.js';
import type { CaseIntakeResponseDto } from './dto/case-intake-response.dto.js';
import type { CaseIntakeDto } from './dto/case-intake.dto.js';
import { IntakeWarning } from './enums/intake-warning.enum.js';
import { formatDateOnly, parseDateOnly, todayInOfficeTimeZone } from './helpers/date-only.helper.js';
import { parseRequestMetadata } from './helpers/request-metadata.helper.js';

const EXTRACTION_WARNINGS: Partial<Record<TextExtractionStatus, IntakeWarning>> = {
  [TextExtractionStatus.NO_TEXT]: IntakeWarning.TextNotFound,
  [TextExtractionStatus.UNSUPPORTED]: IntakeWarning.TextExtractionUnsupported,
  [TextExtractionStatus.FAILED]: IntakeWarning.TextExtractionFailed,
};

/**
 * Registers a request from its file (brief, steps 2 and 5): reads the text,
 * suggests the case number, receipt date and subject, and creates the case
 * with the file attached. Values sent by the official take precedence; the
 * response lists what was guessed so it can be confirmed or corrected.
 */
@Injectable()
export class CaseIntakeService {
  constructor(
    private readonly casesService: CasesService,
    private readonly documentsService: CaseDocumentsService,
  ) {}

  async intake(
    file: Express.Multer.File | undefined,
    dto: CaseIntakeDto,
    user: AuthUser,
  ): Promise<CaseIntakeResponseDto> {
    const upload = await this.documentsService.processUpload(file);
    const suggestions = parseRequestMetadata({ fileName: upload.originalName, text: upload.extraction.text });

    const warnings: IntakeWarning[] = [];
    const extractionWarning = EXTRACTION_WARNINGS[upload.extraction.status];
    if (extractionWarning) {
      warnings.push(extractionWarning);
    }

    let receivedAt = dto.receivedAt;
    if (!receivedAt) {
      const today = todayInOfficeTimeZone();
      const stamped = suggestions.receivedAt ? parseDateOnly(suggestions.receivedAt.value) : null;
      if (stamped && stamped > today) {
        warnings.push(IntakeWarning.ReceivedAtInFutureIgnored);
      } else if (!stamped) {
        warnings.push(IntakeWarning.ReceivedAtDefaultedToToday);
      }
      receivedAt = formatDateOnly(stamped && stamped <= today ? stamped : today);
    }

    let subject = dto.subject ?? suggestions.subject?.value;
    if (!subject) {
      subject = upload.originalName.replace(/\.[^.]+$/, '');
      warnings.push(IntakeWarning.SubjectFromFileName);
    }

    const caseNumber = dto.caseNumber ?? suggestions.caseNumber?.value;
    if (!caseNumber) {
      warnings.push(IntakeWarning.CaseNumberGenerated);
    }

    try {
      const created = await this.casesService.create(
        {
          subject,
          receivedAt,
          caseNumber,
          handlerInitials: dto.handlerInitials,
          assigneeId: dto.assigneeId,
          requesterName: dto.requesterName,
          requesterEmail: dto.requesterEmail,
          requesterAddress: dto.requesterAddress,
          notes: dto.notes,
        },
        user,
        this.documentsService.toDocumentData(upload, CaseDocumentKind.REQUEST, user),
      );
      return { case: created, suggestions, warnings };
    } catch (error) {
      await this.documentsService.discard(upload);
      throw error;
    }
  }
}
