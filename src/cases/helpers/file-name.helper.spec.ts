import { attachmentContentDisposition, normalizeUploadFileName } from './file-name.helper.js';

const asLatin1 = (utf8: string) => Buffer.from(utf8, 'utf8').toString('latin1');

describe('normalizeUploadFileName', () => {
  it('repairs UTF-8 names that multer decoded as Latin-1', () => {
    expect(normalizeUploadFileName(asLatin1('Wniosek – żłobek.pdf'))).toBe('Wniosek – żłobek.pdf');
  });

  it('keeps names that are already correct', () => {
    expect(normalizeUploadFileName('Wniosek - BKS.IV.1431.590.2026.pdf')).toBe('Wniosek - BKS.IV.1431.590.2026.pdf');
    expect(normalizeUploadFileName('Odpowiedź WIM.docx')).toBe('Odpowiedź WIM.docx');
  });

  it('strips directories, control characters and quotes', () => {
    expect(normalizeUploadFileName('..\\..\\C:\\temp\\x"y\u0000.pdf')).toBe('xy.pdf');
    expect(normalizeUploadFileName('../../etc/passwd')).toBe('passwd');
  });

  it('falls back to a default name', () => {
    expect(normalizeUploadFileName('..')).toBe('dokument');
    expect(normalizeUploadFileName('   ')).toBe('dokument');
  });

  it('keeps the end (with the extension) of very long names', () => {
    const name = normalizeUploadFileName(`${'a'.repeat(300)}.pdf`);
    expect(name).toHaveLength(200);
    expect(name.endsWith('.pdf')).toBe(true);
  });
});

describe('attachmentContentDisposition', () => {
  it('includes an ASCII fallback and the encoded UTF-8 name', () => {
    expect(attachmentContentDisposition('Odpowiedź (WIM).pdf')).toBe(
      `attachment; filename="Odpowiedz (WIM).pdf"; filename*=UTF-8''Odpowied%C5%BA%20%28WIM%29.pdf`,
    );
  });
});

describe('attachmentContentDisposition fallback', () => {
  it('transliterates ł, which has no Unicode decomposition', () => {
    expect(attachmentContentDisposition('Żłobek.pdf')).toMatch(/^attachment; filename="Zlobek.pdf";/);
  });
});
