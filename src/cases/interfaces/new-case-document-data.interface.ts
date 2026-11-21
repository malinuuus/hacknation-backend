import type { CaseDocumentKind, TextExtractionStatus } from '../../generated/prisma/enums.js';

export interface NewCaseDocumentData {
  kind: CaseDocumentKind;
  departmentId?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storageKey: string;
  extractedText: string | null;
  textExtractionStatus: TextExtractionStatus;
  uploadedById: string;
}
