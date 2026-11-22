import { ExtractionMethod } from '../enums/extraction-method.enum.js';
import { MetadataSource } from '../enums/metadata-source.enum.js';
import type { AnalysisSuggestions } from '../interfaces/analysis-suggestion.interface.js';
import type { RequestExtraction } from '../interfaces/request-extraction.interface.js';
import type { RequestMetadata } from '../interfaces/request-metadata.interface.js';

/**
 * Fields with a strict format, where a pattern match is more reliable than the
 * model; for the rest (names, dates written in words, free-form subject) the
 * model reads the letter better.
 */
const PATTERN_FIRST: ReadonlySet<keyof RequestMetadata> = new Set(['caseNumber', 'requesterEmail']);

const FIELDS: ReadonlyArray<keyof RequestMetadata> = [
  'caseNumber',
  'receivedAt',
  'subject',
  'writtenAt',
  'requesterName',
  'requesterEmail',
  'requesterAddress',
];

/** Combines pattern matches with the AI's reading, field by field. */
export function mergeSuggestions(
  patterns: RequestMetadata,
  ai: RequestExtraction['fields'] | null,
): AnalysisSuggestions {
  const merged = {} as AnalysisSuggestions;
  for (const field of FIELDS) {
    const fromPattern = patterns[field] ? { ...patterns[field], method: ExtractionMethod.Pattern } : null;
    const aiValue = ai?.[field];
    const fromAi = aiValue ? { value: aiValue, source: MetadataSource.Text, method: ExtractionMethod.Ai } : null;
    merged[field] = PATTERN_FIRST.has(field) ? (fromPattern ?? fromAi) : (fromAi ?? fromPattern);
  }
  return merged;
}
