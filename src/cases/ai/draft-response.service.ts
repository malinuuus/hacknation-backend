import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AiNotConfiguredError } from '../../ai/errors/ai-not-configured.error.js';
import { formatKnowledgeContext } from '../../ai/helpers/knowledge-context.helper.js';
import { dataBlock, truncateForPrompt } from '../../ai/helpers/prompt.helper.js';
import { LlmService } from '../../ai/llm.service.js';
import { buildDraftResponsePrompt, draftResponseSchema } from '../../ai/prompts/draft-response.prompt.js';
import { CaseDocumentKind } from '../../generated/prisma/enums.js';
import { KnowledgeRetriever } from '../../knowledge/knowledge-retriever.service.js';
import { type CaseDocumentDetailRecord, CaseDocumentsRepository } from '../case-documents.repository.js';
import { CasesRepository } from '../cases.repository.js';
import type { DraftResponseDto, DraftSourceDto, GenerateDraftResponseDto } from '../dto/draft-response.dto.js';
import { DraftSourceKind } from '../enums/draft-source-kind.enum.js';
import { formatDateOnly, todayInOfficeTimeZone } from '../helpers/date-only.helper.js';

const MAX_REQUEST_TEXT_LENGTH = 20_000;
const MAX_DEPARTMENT_RESPONSE_LENGTH = 15_000;
const RETRIEVAL_QUERY_LENGTH = 2_000;
const EXCERPT_LENGTH = 300;

/**
 * Drafts the response to a request from the department replies attached to
 * the case and the official's notes, with the knowledge base (law, past
 * responses) for the legal basis and wording. Nothing is stored.
 */
@Injectable()
export class DraftResponseService {
  constructor(
    private readonly llm: LlmService,
    private readonly retriever: KnowledgeRetriever,
    private readonly casesRepository: CasesRepository,
    private readonly documentsRepository: CaseDocumentsRepository,
  ) {}

  /**
   * @throws {AiNotConfiguredError}
   * @throws {AiRequestFailedError}
   */
  async generate(caseId: string, dto: GenerateDraftResponseDto): Promise<DraftResponseDto> {
    if (!this.llm.isConfigured()) {
      throw new AiNotConfiguredError();
    }
    const found = await this.casesRepository.findById(caseId);
    if (!found) {
      throw new NotFoundException(`Case "${caseId}" not found`);
    }

    let questions = found.questions;
    if (dto.questionIds) {
      const unknown = dto.questionIds.filter((id) => !questions.some((question) => question.id === id));
      if (unknown.length > 0) {
        throw new BadRequestException(`Questions not found in this case: ${unknown.join(', ')}`);
      }
      questions = questions.filter((question) => dto.questionIds?.includes(question.id));
    }
    if (questions.length === 0 && !found.requestText) {
      throw new BadRequestException(
        'The case has no questions or request text to answer; set them with PUT /cases/:id/questions',
      );
    }

    const departmentDocuments = await this.documentsRepository.findWithTextByCase(
      caseId,
      CaseDocumentKind.DEPARTMENT_RESPONSE,
    );
    const questionList = questions.length
      ? questions.map((question, index) => `${index + 1}. ${question.text}`).join('\n')
      : '(pytania nie zostały wyodrębnione — odpowiedz na wszystkie prośby z treści wniosku)';
    const knowledge = await this.retriever.search(
      (questions.length ? questionList : (found.requestText ?? '')).slice(0, RETRIEVAL_QUERY_LENGTH),
    );

    // Department replies are numbered first, then knowledge fragments continue the numbering.
    const sources: DraftSourceDto[] = [
      ...departmentDocuments.map((document) => departmentSource(document)),
      ...knowledge.map((match): DraftSourceDto => ({
        kind: DraftSourceKind.Knowledge,
        documentId: match.documentId,
        documentName: match.documentName,
        category: match.category,
        departmentSymbol: null,
        excerpt: excerpt(match.content),
      })),
    ];

    const output = await this.llm.structured(
      'draft_response',
      draftResponseSchema,
      buildDraftResponsePrompt({
        today: formatDateOnly(todayInOfficeTimeZone()),
        caseNumber: found.caseNumber,
        subject: found.subject,
        requesterName: found.requesterName,
        writtenAt: found.writtenAt ? formatDateOnly(found.writtenAt) : null,
        receivedAt: formatDateOnly(found.receivedAt),
        questions: questionList,
        requestText: found.requestText ? truncateForPrompt(found.requestText, MAX_REQUEST_TEXT_LENGTH) : null,
        departmentResponses: formatDepartmentResponses(departmentDocuments),
        notes: dto.notes ?? null,
        knowledge: formatKnowledgeContext(knowledge, departmentDocuments.length + 1),
      }),
    );

    return { text: output.text.trim(), sources: pickSources(sources, output.usedSources) };
  }
}

/** Sources cited by 1-based number, each once, in citation order; unknown numbers are ignored. Exported for tests. */
export function pickSources<T>(sources: T[], cited: number[]): T[] {
  const picked = new Set<number>();
  for (const number of cited) {
    if (Number.isInteger(number) && number >= 1 && number <= sources.length) {
      picked.add(number - 1);
    }
  }
  return [...picked].map((index) => sources[index]);
}

function departmentSource(document: CaseDocumentDetailRecord): DraftSourceDto {
  return {
    kind: DraftSourceKind.CaseDocument,
    documentId: document.id,
    documentName: document.originalName,
    category: null,
    departmentSymbol: document.department?.symbol ?? null,
    excerpt: excerpt(document.extractedText ?? ''),
  };
}

function formatDepartmentResponses(documents: CaseDocumentDetailRecord[]): string {
  if (documents.length === 0) {
    return '(brak odpowiedzi wydziałów)';
  }
  return documents
    .map((document, index) => {
      const unit = document.department ? `${document.department.name} (${document.department.symbol})` : 'Jednostka';
      return `[${index + 1}] ${unit}, plik ${document.originalName}:\n${dataBlock(
        'dokument',
        truncateForPrompt(document.extractedText ?? '', MAX_DEPARTMENT_RESPONSE_LENGTH),
      )}`;
    })
    .join('\n\n');
}

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= EXCERPT_LENGTH ? flat : `${flat.slice(0, EXCERPT_LENGTH)}…`;
}
