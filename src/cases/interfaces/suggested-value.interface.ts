import type { MetadataSource } from '../enums/metadata-source.enum.js';

export interface SuggestedValue<T> {
  value: T;
  source: MetadataSource;
}
