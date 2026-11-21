import type { StoredFile } from '../../storage/interfaces/stored-file.interface.js';
import type { TextExtractionResult } from '../../text-extraction/interfaces/text-extraction-result.interface.js';

/** An uploaded file that passed validation, had its text read and was stored. */
export interface ProcessedUpload {
  originalName: string;
  mimeType: string;
  stored: StoredFile;
  extraction: TextExtractionResult;
}
