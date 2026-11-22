import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AiNotConfiguredError } from '../../ai/errors/ai-not-configured.error.js';
import { formatKnowledgeContext } from '../../ai/helpers/knowledge-context.helper.js';
import { LlmService } from '../../ai/llm.service.js';
import { buildRedactionPrompt, redactionSchema } from '../../ai/prompts/redaction.prompt.js';
import { KnowledgeCategory } from '../../generated/prisma/enums.js';
import type { KnowledgeChunkMatch } from '../../knowledge/interfaces/knowledge-chunk-match.interface.js';
import { KnowledgeRetriever } from '../../knowledge/knowledge-retriever.service.js';
import { CasesRepository } from '../cases.repository.js';
import type {
  RedactionSuggestionDto,
  RedactionSuggestionsRequestDto,
  RedactionSuggestionsResponseDto,
} from '../dto/redaction-suggestions.dto.js';
import { RedactionCategory } from '../enums/redaction-category.enum.js';

const RETRIEVAL_QUERY =
  'anonimizacja danych osobowych w odpowiedzi na wniosek o udostępnienie informacji publicznej, ' +
  'prywatność osoby fizycznej, tajemnica przedsiębiorcy, RODO';
const MIN_FRAGMENT_LENGTH = 2;

/**
 * Suggests what to anonymise in a text (usually the draft response), guided by
 * the knowledge base (anonymisation guidelines, law). The requester's own data
 * from the case is always suggested when it occurs in the text.
 */
@Injectable()
export class RedactionSuggestionsService {
  private readonly logger = new Logger(RedactionSuggestionsService.name);

  constructor(
    private readonly llm: LlmService,
    private readonly retriever: KnowledgeRetriever,
    private readonly casesRepository: CasesRepository,
  ) {}

  /**
   * @throws {AiNotConfiguredError}
   * @throws {AiRequestFailedError}
   */
  async suggest(caseId: string, dto: RedactionSuggestionsRequestDto): Promise<RedactionSuggestionsResponseDto> {
    if (!this.llm.isConfigured()) {
      throw new AiNotConfiguredError();
    }
    const found = await this.casesRepository.findById(caseId);
    if (!found) {
      throw new NotFoundException(`Case "${caseId}" not found`);
    }

    const requesterData: RedactionSuggestionDto[] = [
      { text: found.requesterName, category: RedactionCategory.PersonName },
      { text: found.requesterEmail, category: RedactionCategory.Email },
      { text: found.requesterAddress, category: RedactionCategory.Address },
    ].flatMap(({ text, category }) => (text ? [{ text, category, reason: 'Dane wnioskodawcy' }] : []));

    const output = await this.llm.structured(
      'redaction_suggestions',
      redactionSchema,
      buildRedactionPrompt({
        text: dto.text,
        requester: requesterData.map((item) => item.text).join('\n') || '(brak danych)',
        knowledge: formatKnowledgeContext(await this.findGuidelines()),
      }),
    );

    return { suggestions: filterSuggestions(dto.text, [...requesterData, ...output.suggestions]) };
  }

  private async findGuidelines(): Promise<KnowledgeChunkMatch[]> {
    try {
      return await this.retriever.search(RETRIEVAL_QUERY, {
        categories: [KnowledgeCategory.GUIDELINE, KnowledgeCategory.LAW],
      });
    } catch (error) {
      this.logger.warn(`Knowledge base search failed, continuing without it: ${String(error)}`);
      return [];
    }
  }
}

/**
 * Keeps fragments that occur verbatim in the text, once each, ordered by
 * first occurrence; a fragment inside a longer one already kept is dropped.
 * Exported for tests.
 */
export function filterSuggestions(text: string, suggestions: RedactionSuggestionDto[]): RedactionSuggestionDto[] {
  const kept: RedactionSuggestionDto[] = [];
  const candidates = suggestions
    .map((suggestion) => ({ ...suggestion, text: suggestion.text.trim(), reason: suggestion.reason.trim() }))
    .filter((suggestion) => suggestion.text.length >= MIN_FRAGMENT_LENGTH && text.includes(suggestion.text))
    // Longer fragments first, so shorter ones they contain are recognised as duplicates.
    .sort((a, b) => b.text.length - a.text.length);

  for (const candidate of candidates) {
    if (!kept.some((item) => item.text.includes(candidate.text))) {
      kept.push(candidate);
    }
  }
  return kept.sort((a, b) => text.indexOf(a.text) - text.indexOf(b.text));
}
