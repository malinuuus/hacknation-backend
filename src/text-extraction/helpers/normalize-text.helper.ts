/** pdf-parse appends "-- 1 of 2 --" after each page. */
const PDF_PAGE_MARKER = /^-- \d+ of \d+ --$/gm;

/** Below this many letters a document is treated as having no text layer (e.g. a scan). */
const MIN_LETTERS = 20;

export function normalizeExtractedText(raw: string): string {
  return raw
    .replace(PDF_PAGE_MARKER, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function hasMeaningfulText(text: string): boolean {
  return (text.match(/\p{L}/gu)?.length ?? 0) >= MIN_LETTERS;
}
