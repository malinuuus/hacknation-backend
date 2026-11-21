import { Injectable, Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { TextExtractionStatus } from '../generated/prisma/enums.js';
import { DocumentFileType } from './enums/document-file-type.enum.js';
import { hasMeaningfulText, normalizeExtractedText } from './helpers/normalize-text.helper.js';
import type { TextExtractionResult } from './interfaces/text-extraction-result.interface.js';

/**
 * Reads the text layer of PDF and DOCX files, locally. Scanned PDFs have no
 * text layer and come back as NO_TEXT (they need OCR). Never throws for a bad
 * file: extraction problems are reported as FAILED.
 */
@Injectable()
export class TextExtractionService {
  private readonly logger = new Logger(TextExtractionService.name);

  async extract(content: Buffer, type: DocumentFileType): Promise<TextExtractionResult> {
    if (type === DocumentFileType.Doc) {
      return { status: TextExtractionStatus.UNSUPPORTED, text: null };
    }

    let raw: string;
    try {
      raw = type === DocumentFileType.Pdf ? await this.extractPdf(content) : await this.extractDocx(content);
    } catch (error) {
      this.logger.warn(`Text extraction failed for ${type}: ${String(error)}`);
      return { status: TextExtractionStatus.FAILED, text: null };
    }

    const text = normalizeExtractedText(raw);
    return hasMeaningfulText(text)
      ? { status: TextExtractionStatus.EXTRACTED, text }
      : { status: TextExtractionStatus.NO_TEXT, text: null };
  }

  private async extractPdf(content: Buffer): Promise<string> {
    // pdf.js may transfer (detach) the buffer it gets, so hand it a copy.
    const parser = new PDFParse({ data: new Uint8Array(content) });
    try {
      return (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  }

  private async extractDocx(content: Buffer): Promise<string> {
    return (await mammoth.extractRawText({ buffer: content })).value;
  }
}
