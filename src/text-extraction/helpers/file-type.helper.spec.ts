import { DocumentFileType } from '../enums/document-file-type.enum.js';
import { detectDocumentFileType, detectKnowledgeFileType } from './file-type.helper.js';

const ZIP_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE_HEADER = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);

describe('detectDocumentFileType', () => {
  it('detects a PDF by its header, whatever the name', () => {
    // arrange
    const pdf = Buffer.from('%PDF-1.7\n...');

    // act
    const result = detectDocumentFileType(pdf, 'scan.bin');

    // assert
    expect(result).toBe(DocumentFileType.Pdf);
  });

  it('detects a DOCX as a zip containing word/document.xml', () => {
    // arrange
    const docx = Buffer.concat([ZIP_HEADER, Buffer.from('....word/document.xml....')]);

    // act
    const result = detectDocumentFileType(docx, 'wniosek.docx');

    // assert
    expect(result).toBe(DocumentFileType.Docx);
  });

  it('rejects other zip archives', () => {
    // arrange
    const zip = Buffer.concat([ZIP_HEADER, Buffer.from('....xl/workbook.xml')]);

    // act
    const result = detectDocumentFileType(zip, 'arkusz.docx');

    // assert
    expect(result).toBeNull();
  });

  it.each([
    ['stary.DOC', DocumentFileType.Doc],
    ['arkusz.xls', null],
  ])('accepts an OLE container only with the .doc extension (%s)', (fileName, expected) => {
    // act
    const result = detectDocumentFileType(OLE_HEADER, fileName);

    // assert
    expect(result).toBe(expected);
  });

  it('rejects a renamed executable', () => {
    // arrange
    const executable = Buffer.from('MZ\x90\x00');

    // act
    const result = detectDocumentFileType(executable, 'wniosek.pdf');

    // assert
    expect(result).toBeNull();
  });
});

describe('detectKnowledgeFileType', () => {
  it('accepts UTF-8 text with the .txt extension', () => {
    // arrange
    const text = Buffer.from('Zasady anonimizacji odpowiedzi', 'utf8');

    // act
    const result = detectKnowledgeFileType(text, 'zasady.TXT');

    // assert
    expect(result).toBe(DocumentFileType.Txt);
  });

  it.each([
    ['text under another extension', Buffer.from('tekst'), 'notatka.md'],
    ['binary content', Buffer.from([0x41, 0x00, 0x42]), 'dane.txt'],
    ['invalid UTF-8', Buffer.from([0xc3, 0x28]), 'zle.txt'],
  ])('rejects %s', (_, buffer, fileName) => {
    // act
    const result = detectKnowledgeFileType(buffer, fileName);

    // assert
    expect(result).toBeNull();
  });

  it('still detects PDF documents', () => {
    // arrange
    const pdf = Buffer.from('%PDF-1.7\n...');

    // act
    const result = detectKnowledgeFileType(pdf, 'ustawa.pdf');

    // assert
    expect(result).toBe(DocumentFileType.Pdf);
  });
});
