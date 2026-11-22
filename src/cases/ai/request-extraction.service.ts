import { Injectable, Logger } from '@nestjs/common';
import { normalizeForMatch, truncateForPrompt } from '../../ai/helpers/prompt.helper.js';
import { formatKnowledgeContext } from '../../ai/helpers/knowledge-context.helper.js';
import { LlmService } from '../../ai/llm.service.js';
import {
  buildRequestExtractionPrompt,
  type RequestExtractionOutput,
  requestExtractionSchema,
} from '../../ai/prompts/request-extraction.prompt.js';
import { DepartmentsRepository } from '../../departments/departments.repository.js';
import type { Department } from '../../generated/prisma/client.js';
import { KnowledgeCategory } from '../../generated/prisma/enums.js';
import type { KnowledgeChunkMatch } from '../../knowledge/interfaces/knowledge-chunk-match.interface.js';
import { KnowledgeRetriever } from '../../knowledge/knowledge-retriever.service.js';
import { formatDateOnly, parseDateOnly, todayInOfficeTimeZone } from '../helpers/date-only.helper.js';
import type {
  ExtractedDepartment,
  ExtractedQuestion,
  RequestExtraction,
} from '../interfaces/request-extraction.interface.js';

const MAX_REQUEST_TEXT_LENGTH = 30_000;
/** The beginning of a request usually says what it is about; enough to find the relevant regulations. */
const RETRIEVAL_QUERY_LENGTH = 1_500;
const MAX_QUESTIONS = 50;

const FIELD_MAX_LENGTH = {
  caseNumber: 100,
  subject: 500,
  requesterName: 300,
  requesterEmail: 300,
  requesterAddress: 500,
} as const;

const EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}$/i;

const symbolKey = (symbol: string) => symbol.trim().toLocaleUpperCase('pl');

/**
 * Reads a request with the language model: requester, dates, subject,
 * questions and the departments that hold the answers, with the knowledge base
 * (e.g. the organisational regulations) as context. Values that cannot be
 * right (invalid dates, a name or e-mail not in the text, unknown departments)
 * are dropped, so the official only sees plausible suggestions.
 */
@Injectable()
export class RequestExtractionService {
  private readonly logger = new Logger(RequestExtractionService.name);

  constructor(
    private readonly llm: LlmService,
    private readonly retriever: KnowledgeRetriever,
    private readonly departmentsRepository: DepartmentsRepository,
  ) {}

  isAvailable(): boolean {
    return this.llm.isConfigured();
  }

  /**
   * @throws {AiNotConfiguredError}
   * @throws {AiRequestFailedError}
   */
  async extract(input: { fileName: string; text: string }): Promise<RequestExtraction> {
    const departments = await this.departmentsRepository.findMany({ includeInactive: false });
    const knowledge = await this.findContext(input.text);

    const output = await this.llm.structured(
      'request_extraction',
      requestExtractionSchema,
      buildRequestExtractionPrompt({
        today: formatDateOnly(todayInOfficeTimeZone()),
        fileName: input.fileName,
        text: truncateForPrompt(input.text, MAX_REQUEST_TEXT_LENGTH),
        departments: departments.map((department) => `${department.symbol} — ${department.name}`).join('\n'),
        knowledge: formatKnowledgeContext(knowledge),
      }),
    );

    return toRequestExtraction(output, departments, `${input.fileName}\n${input.text}`);
  }

  /** The knowledge base is optional context: without it the model judges by department names. */
  private async findContext(text: string): Promise<KnowledgeChunkMatch[]> {
    try {
      return await this.retriever.search(text.slice(0, RETRIEVAL_QUERY_LENGTH), {
        categories: [KnowledgeCategory.GUIDELINE, KnowledgeCategory.LAW],
      });
    } catch (error) {
      this.logger.warn(`Knowledge base search failed, continuing without it: ${String(error)}`);
      return [];
    }
  }
}

/** Checks the model's answer against the source text and the department list. Exported for tests. */
export function toRequestExtraction(
  output: RequestExtractionOutput,
  departments: Pick<Department, 'id' | 'symbol' | 'name'>[],
  sourceText: string,
): RequestExtraction {
  const source = normalizeForMatch(sourceText);
  const occursInSource = (value: string | null) => (value && source.includes(normalizeForMatch(value)) ? value : null);
  const bySymbol = new Map(departments.map((department) => [symbolKey(department.symbol), department]));

  const fields: RequestExtraction['fields'] = {
    // Copied values must occur in the text: the model must not invent a name, e-mail or case number.
    caseNumber: occursInSource(clean(output.caseNumber, FIELD_MAX_LENGTH.caseNumber)),
    requesterName: occursInSource(clean(output.requesterName, FIELD_MAX_LENGTH.requesterName)),
    requesterEmail: occursInSource(validEmail(clean(output.requesterEmail, FIELD_MAX_LENGTH.requesterEmail))),
    requesterAddress: clean(output.requesterAddress, FIELD_MAX_LENGTH.requesterAddress),
    subject: clean(output.subject, FIELD_MAX_LENGTH.subject),
    writtenAt: validDate(output.writtenAt),
    receivedAt: validDate(output.receivedAt),
  };

  const questions: ExtractedQuestion[] = output.questions
    .map((question) => ({
      text: question.text.trim(),
      departmentIds: unique(question.departmentSymbols.flatMap((symbol) => bySymbol.get(symbolKey(symbol))?.id ?? [])),
    }))
    .filter((question) => question.text.length > 0)
    .slice(0, MAX_QUESTIONS);

  const suggested = new Map<string, ExtractedDepartment>();
  for (const { symbol, reason } of output.departments) {
    const department = bySymbol.get(symbolKey(symbol));
    if (department && !suggested.has(department.id)) {
      suggested.set(department.id, {
        departmentId: department.id,
        symbol: department.symbol,
        name: department.name,
        reason: reason.trim(),
      });
    }
  }
  // A department assigned to a question but left out of the summary is still suggested.
  for (const departmentId of questions.flatMap((question) => question.departmentIds)) {
    const department = departments.find((item) => item.id === departmentId);
    if (department && !suggested.has(departmentId)) {
      suggested.set(departmentId, { departmentId, symbol: department.symbol, name: department.name, reason: '' });
    }
  }

  return { fields, questions, departments: [...suggested.values()] };
}

function clean(value: string | null, maxLength: number): string | null {
  const trimmed = value?.replace(/\s+/g, ' ').trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function validEmail(value: string | null): string | null {
  return value && EMAIL.test(value) ? value : null;
}

function validDate(value: string | null): string | null {
  if (!value) {
    return null;
  }
  try {
    return formatDateOnly(parseDateOnly(value.trim()));
  } catch {
    return null;
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
