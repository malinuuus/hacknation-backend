const MAX_FILE_NAME_LENGTH = 200;
const FALLBACK_FILE_NAME = 'dokument';

/**
 * Multer (busboy) decodes the multipart file name as Latin-1, so UTF-8 names
 * such as "Wniosek – żłobek.pdf" arrive garbled. Re-decode when the bytes form
 * valid UTF-8, then strip path parts and control characters.
 */
export function normalizeUploadFileName(rawName: string): string {
  let name = rawName;
  const bytes = Buffer.from(rawName, 'latin1');
  if (bytes.toString('latin1') === rawName) {
    const decoded = bytes.toString('utf8');
    if (!decoded.includes('\uFFFD')) {
      name = decoded;
    }
  }

  const baseName = name.split(/[/\\]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const cleaned = baseName.replace(/[\u0000-\u001f\u007f"]/g, '').trim();
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return FALLBACK_FILE_NAME;
  }
  return cleaned.length > MAX_FILE_NAME_LENGTH ? cleaned.slice(cleaned.length - MAX_FILE_NAME_LENGTH) : cleaned;
}

/** RFC 6266 attachment header with an ASCII fallback and the UTF-8 name. */
export function attachmentContentDisposition(fileName: string): string {
  const asciiFallback = fileName
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/[\\"]/g, '_');
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
