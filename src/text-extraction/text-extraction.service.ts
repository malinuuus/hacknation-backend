import { Injectable, Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { LlmService } from '../ai/llm.service.js';
import { TextExtractionStatus } from '../generated/prisma/enums.js';
import { DocumentFileType } from './enums/document-file-type.enum.js';
import { hasMeaningfulText, normalizeExtractedText } from './helpers/normalize-text.helper.js';
import type { TextExtractionResult } from './interfaces/text-extraction-result.interface.js';

export const OCR_MAX_PAGES = 10;
export const OCR_MAX_BYTES = 20 * 1024 * 1024;

interface RawText {
  text: string;
  pages?: number;
}

/**
 * Reads the text layer of PDF and DOCX files (and plain text files), locally.
 * Only when a PDF has no text layer (a scan, possibly handwritten) and AI is
 * configured, the model transcribes its pages (OCR_EXTRACTED); otherwise such
 * a PDF comes back as NO_TEXT. Never throws for a bad file: extraction
 * problems are reported as FAILED.
 */
@Injectable()
export class TextExtractionService {
  private readonly logger = new Logger(TextExtractionService.name);

  constructor(private readonly llm: LlmService) {}

  async extract(content: Buffer, type: DocumentFileType): Promise<TextExtractionResult> {
    if (type === DocumentFileType.Doc) {
      return { status: TextExtractionStatus.UNSUPPORTED, text: null };
    }

    let raw: RawText;
    try {
      raw = await this.extractRaw(content, type);
    } catch (error) {
      this.logger.warn(`Text extraction failed for ${type}: ${String(error)}`);
      return { status: TextExtractionStatus.FAILED, text: null };
    }

    const text = normalizeExtractedText(raw.text);
    if (hasMeaningfulText(text)) {
      return { status: TextExtractionStatus.EXTRACTED, text };
    }
    if (type === DocumentFileType.Pdf) {
      return this.transcribeScan(content, raw.pages);
    }
    return { status: TextExtractionStatus.NO_TEXT, text: null };
  }

  /** The OCR fallback: runs only for a PDF whose text layer is empty. */
  private async transcribeScan(content: Buffer, pages: number | undefined): Promise<TextExtractionResult> {
    const noText = { status: TextExtractionStatus.NO_TEXT, text: null };
    if (!this.llm.isConfigured()) {
      return noText;
    }
    if ((pages ?? 0) > OCR_MAX_PAGES || content.length > OCR_MAX_BYTES) {
      this.logger.log(`Scan not transcribed: ${pages} pages, ${content.length} bytes`);
      return noText;
    }

    try {
      const text = normalizeExtractedText(await this.llm.transcribePdf(content));
      return hasMeaningfulText(text) ? { status: TextExtractionStatus.OCR_EXTRACTED, text } : noText;
    } catch (error) {
      this.logger.warn(`Scan transcription failed: ${String(error)}`);
      return noText;
    }
  }

  private async extractRaw(content: Buffer, type: Exclude<DocumentFileType, DocumentFileType.Doc>): Promise<RawText> {
    switch (type) {
      case DocumentFileType.Pdf:
        return this.extractPdf(content);
      case DocumentFileType.Docx:
        return { text: (await mammoth.extractRawText({ buffer: content })).value };
      case DocumentFileType.Txt:
        // Drop a UTF-8 byte order mark if the editor added one.
        return { text: content.toString('utf8').replace(/^﻿/, '') };
    }
  }

  private async extractPdf(content: Buffer): Promise<RawText> {
    // pdf.js may transfer (detach) the buffer it gets, so hand it a copy.
    const parser = new PDFParse({ data: new Uint8Array(content) });
    try {
      const result = await parser.getText();
      return { text: result.text, pages: result.total };
    } finally {
      await parser.destroy();
    }
  }
}
