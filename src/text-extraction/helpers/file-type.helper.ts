import { DocumentFileType } from '../enums/document-file-type.enum.js';

const PDF_MAGIC = Buffer.from('%PDF-', 'latin1');
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

const MIME_TYPES: Record<DocumentFileType, string> = {
  [DocumentFileType.Pdf]: 'application/pdf',
  [DocumentFileType.Docx]: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  [DocumentFileType.Doc]: 'application/msword',
};

/**
 * Detects the file type from its content, not from the client-supplied MIME
 * type. Returns null for anything that is not a PDF or Word document.
 */
export function detectDocumentFileType(content: Buffer, fileName: string): DocumentFileType | null {
  if (content.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    return DocumentFileType.Pdf;
  }
  // A .docx is a zip archive containing word/document.xml (listed in the central directory).
  if (content.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC) && content.includes('word/document.xml', 0, 'latin1')) {
    return DocumentFileType.Docx;
  }
  // OLE containers are also used by .xls/.msg, so require the .doc extension too.
  if (content.subarray(0, OLE_MAGIC.length).equals(OLE_MAGIC) && /\.doc$/i.test(fileName)) {
    return DocumentFileType.Doc;
  }
  return null;
}

export function mimeTypeOf(type: DocumentFileType): string {
  return MIME_TYPES[type];
}
