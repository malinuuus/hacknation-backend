import type { TextExtractionStatus } from '../../generated/prisma/enums.js';

export interface TextExtractionResult {
  status: TextExtractionStatus;
  text: string | null;
}
