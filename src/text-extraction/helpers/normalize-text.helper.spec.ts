import { hasMeaningfulText, normalizeExtractedText } from './normalize-text.helper.js';

describe('normalizeExtractedText', () => {
  it('removes pdf-parse page markers and collapses whitespace', () => {
    const raw = 'WNIOSEK  O\tUDOSTĘPNIENIE\r\n\r\n\r\n\r\nBudowlanka S.A.\n\n-- 1 of 1 --\n\n';
    expect(normalizeExtractedText(raw)).toBe('WNIOSEK O UDOSTĘPNIENIE\n\nBudowlanka S.A.');
  });

  it('treats a scan with only page markers as having no text', () => {
    const text = normalizeExtractedText('\n\n-- 1 of 2 --\n\n\n\n-- 2 of 2 --\n\n');
    expect(text).toBe('');
    expect(hasMeaningfulText(text)).toBe(false);
  });

  it('counts Polish letters', () => {
    expect(hasMeaningfulText('Zażółć gęślą jaźń, proszę o informację')).toBe(true);
  });
});
