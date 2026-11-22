import type { ExtractionMethod } from '../enums/extraction-method.enum.js';
import type { RequestMetadata } from './request-metadata.interface.js';
import type { SuggestedValue } from './suggested-value.interface.js';

export interface AnalysisSuggestion<T> extends SuggestedValue<T> {
  method: ExtractionMethod;
}

export type AnalysisSuggestions = Record<keyof RequestMetadata, AnalysisSuggestion<string> | null>;
