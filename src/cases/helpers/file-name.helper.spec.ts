import { attachmentContentDisposition, normalizeUploadFileName } from './file-name.helper.js';

const asLatin1 = (utf8: string) => Buffer.from(utf8, 'utf8').toString('latin1');

describe('normalizeUploadFileName', () => {
  it('repairs UTF-8 names that multer decoded as Latin-1', () => {
    // arrange
    const garbled = asLatin1('Wniosek – żłobek.pdf');

    // act
    const result = normalizeUploadFileName(garbled);

    // assert
    expect(result).toBe('Wniosek – żłobek.pdf');
  });

  it.each(['Wniosek - BKS.IV.1431.590.2026.pdf', 'Odpowiedź WIM.docx'])('keeps the correct name %s', (name) => {
    // act
    const result = normalizeUploadFileName(name);

    // assert
    expect(result).toBe(name);
  });

  it.each([
    ['..\\..\\C:\\temp\\x"y\u0000.pdf', 'xy.pdf'],
    ['../../etc/passwd', 'passwd'],
  ])('strips directories, control characters and quotes from %s', (name, expected) => {
    // act
    const result = normalizeUploadFileName(name);

    // assert
    expect(result).toBe(expected);
  });

  it.each(['..', '   '])('falls back to a default name for "%s"', (name) => {
    // act
    const result = normalizeUploadFileName(name);

    // assert
    expect(result).toBe('dokument');
  });

  it('keeps the end (with the extension) of very long names', () => {
    // arrange
    const longName = `${'a'.repeat(300)}.pdf`;

    // act
    const result = normalizeUploadFileName(longName);

    // assert
    expect(result).toHaveLength(200);
    expect(result.endsWith('.pdf')).toBe(true);
  });
});

describe('attachmentContentDisposition', () => {
  it('includes an ASCII fallback and the encoded UTF-8 name', () => {
    // arrange
    const name = 'Odpowiedź (WIM).pdf';

    // act
    const result = attachmentContentDisposition(name);

    // assert
    expect(result).toBe(`attachment; filename="Odpowiedz (WIM).pdf"; filename*=UTF-8''Odpowied%C5%BA%20%28WIM%29.pdf`);
  });

  it('transliterates ł, which has no Unicode decomposition', () => {
    // arrange
    const name = 'Żłobek.pdf';

    // act
    const result = attachmentContentDisposition(name);

    // assert
    expect(result).toMatch(/^attachment; filename="Zlobek.pdf";/);
  });
});
