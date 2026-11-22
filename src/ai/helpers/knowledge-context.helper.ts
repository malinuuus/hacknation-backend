import type { KnowledgeChunkMatch } from '../../knowledge/interfaces/knowledge-chunk-match.interface.js';

const CATEGORY_LABELS: Readonly<Record<KnowledgeChunkMatch['category'], string>> = {
  LAW: 'przepis prawa',
  RESPONSE: 'wzorcowa odpowiedź',
  GUIDELINE: 'wytyczne',
};

/** Knowledge base fragments as a numbered list `[1] (kategoria) Nazwa: treść`, for citing by number. */
export function formatKnowledgeContext(matches: KnowledgeChunkMatch[], startAt = 1): string {
  if (matches.length === 0) {
    return '(brak dokumentów w bazie wiedzy)';
  }
  return matches
    .map(
      (match, index) =>
        `[${startAt + index}] (${CATEGORY_LABELS[match.category]}) ${match.documentName}:\n${match.content}`,
    )
    .join('\n\n');
}
