import type { TextExtractionResult } from '../../text-extraction/interfaces/text-extraction-result.interface.js';

/** An uploaded file that passed validation and had its text read, not yet stored. */
export interface ReadUpload {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  extraction: TextExtractionResult;
}
