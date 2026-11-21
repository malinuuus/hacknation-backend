import type { TextExtractionStatus } from '../../generated/prisma/enums.js';

export interface TextExtractionResult {
  status: TextExtractionStatus;
  /** Normalised plain text; null unless status is EXTRACTED. */
  text: string | null;
}
