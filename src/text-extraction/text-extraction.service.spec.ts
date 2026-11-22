import type { Mocked } from 'vitest';
import { AiRequestFailedError } from '../ai/errors/ai-request-failed.error.js';
import type { LlmService } from '../ai/llm.service.js';
import { TextExtractionStatus } from '../generated/prisma/enums.js';
import { DocumentFileType } from './enums/document-file-type.enum.js';
import { OCR_MAX_PAGES, TextExtractionService } from './text-extraction.service.js';

const REQUEST_TEXT = 'Wnoszę o udostępnienie informacji publicznej o liczbie punktów sprzedaży alkoholu.';
const TRANSCRIPTION = 'Ile punktów sprzedaży alkoholu przybyło w Bydgoszczy?\nOdpowiedź w trybie administracyjnym.';

/** Builds a valid PDF; a page without text stands in for a scan. */
function buildPdf(pageTexts: (string | null)[]): Buffer {
  const objects: string[] = [];
  const pageIds = pageTexts.map((_, index) => 4 + index * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  pageTexts.forEach((text, index) => {
    const pageId = pageIds[index];
    const stream = text ? `BT /F1 12 Tf 50 700 Td (${text}) Tj ET` : '';
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

describe('TextExtractionService', () => {
  let llm: Mocked<Pick<LlmService, 'isConfigured' | 'transcribePdf'>>;
  let service: TextExtractionService;

  beforeEach(() => {
    llm = { isConfigured: vi.fn().mockReturnValue(true), transcribePdf: vi.fn().mockResolvedValue(TRANSCRIPTION) };
    service = new TextExtractionService(llm as unknown as LlmService);
  });

  it('reads the text layer of a PDF without calling the model', async () => {
    const result = await service.extract(
      buildPdf(['Wniosek o udostepnienie informacji publicznej']),
      DocumentFileType.Pdf,
    );

    expect(result).toEqual({
      status: TextExtractionStatus.EXTRACTED,
      text: 'Wniosek o udostepnienie informacji publicznej',
    });
    expect(llm.transcribePdf).not.toHaveBeenCalled();
  });

  it('transcribes a scan without a text layer with the model', async () => {
    const scan = buildPdf([null]);

    const result = await service.extract(scan, DocumentFileType.Pdf);

    expect(result).toEqual({ status: TextExtractionStatus.OCR_EXTRACTED, text: TRANSCRIPTION });
    expect(llm.transcribePdf).toHaveBeenCalledWith(scan);
  });

  it('never sends text files to the model', async () => {
    const result = await service.extract(Buffer.from('krótko'), DocumentFileType.Txt);

    expect(result).toEqual({ status: TextExtractionStatus.NO_TEXT, text: null });
    expect(llm.transcribePdf).not.toHaveBeenCalled();
    await expect(service.extract(Buffer.from(REQUEST_TEXT), DocumentFileType.Txt)).resolves.toEqual({
      status: TextExtractionStatus.EXTRACTED,
      text: REQUEST_TEXT,
    });
  });

  it('leaves a scan as NO_TEXT when AI is not configured', async () => {
    llm.isConfigured.mockReturnValue(false);

    const result = await service.extract(buildPdf([null]), DocumentFileType.Pdf);

    expect(result).toEqual({ status: TextExtractionStatus.NO_TEXT, text: null });
    expect(llm.transcribePdf).not.toHaveBeenCalled();
  });

  it('leaves a scan as NO_TEXT when the transcription fails', async () => {
    llm.transcribePdf.mockRejectedValue(new AiRequestFailedError('transcribePdf', new Error('timeout')));

    await expect(service.extract(buildPdf([null]), DocumentFileType.Pdf)).resolves.toEqual({
      status: TextExtractionStatus.NO_TEXT,
      text: null,
    });
  });

  it('leaves a scan as NO_TEXT when the model reads nothing meaningful', async () => {
    llm.transcribePdf.mockResolvedValue('[nieczytelne]');

    await expect(service.extract(buildPdf([null]), DocumentFileType.Pdf)).resolves.toEqual({
      status: TextExtractionStatus.NO_TEXT,
      text: null,
    });
  });

  it('does not send scans longer than the page limit to the model', async () => {
    const pages = Array.from({ length: OCR_MAX_PAGES + 1 }, () => null);

    const result = await service.extract(buildPdf(pages), DocumentFileType.Pdf);

    expect(result).toEqual({ status: TextExtractionStatus.NO_TEXT, text: null });
    expect(llm.transcribePdf).not.toHaveBeenCalled();
  });
});
