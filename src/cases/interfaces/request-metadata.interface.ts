import type { SuggestedValue } from './suggested-value.interface.js';

/** Values read from an uploaded request, for the official to confirm. */
export interface RequestMetadata {
  caseNumber: SuggestedValue<string> | null;
  /** YYYY-MM-DD from the office stamp ("wpływ dnia …"). */
  receivedAt: SuggestedValue<string> | null;
  subject: SuggestedValue<string> | null;
}
