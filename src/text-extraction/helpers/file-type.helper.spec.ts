import { DocumentFileType } from '../enums/document-file-type.enum.js';
import { detectDocumentFileType } from './file-type.helper.js';

describe('detectDocumentFileType', () => {
  it('detects a PDF by its header, whatever the name', () => {
    expect(detectDocumentFileType(Buffer.from('%PDF-1.7\n...'), 'scan.bin')).toBe(DocumentFileType.Pdf);
  });

  it('detects a DOCX as a zip containing word/document.xml', () => {
    const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('....word/document.xml....')]);
    expect(detectDocumentFileType(docx, 'wniosek.docx')).toBe(DocumentFileType.Docx);
  });

  it('rejects other zip archives', () => {
    const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('....xl/workbook.xml')]);
    expect(detectDocumentFileType(zip, 'arkusz.docx')).toBeNull();
  });

  it('accepts an OLE container only with the .doc extension', () => {
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
    expect(detectDocumentFileType(ole, 'stary.DOC')).toBe(DocumentFileType.Doc);
    expect(detectDocumentFileType(ole, 'arkusz.xls')).toBeNull();
  });

  it('rejects a renamed executable', () => {
    expect(detectDocumentFileType(Buffer.from('MZ\x90\x00'), 'wniosek.pdf')).toBeNull();
  });
});
