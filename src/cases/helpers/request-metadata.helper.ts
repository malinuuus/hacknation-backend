import { MetadataSource } from '../enums/metadata-source.enum.js';
import type { RequestMetadata } from '../interfaces/request-metadata.interface.js';
import { formatDateOnly, parseDateOnly } from './date-only.helper.js';

/** Case sign such as BKS.IV.1431.590.2026: unit symbols, JRWA class, sequence, year. */
const CASE_NUMBER = /\b[A-ZĄĆĘŁŃÓŚŹŻ]{2,6}(?:\.[A-Z0-9ĄĆĘŁŃÓŚŹŻ]{1,6})+\.\d{1,6}\.(?:19|20)\d{2}\b/u;

/** Office stamp: "wpływ dnia 19. 08. 2026", "data wpływu: 19.08.2026", "wpłynęło 19-08-2026". */
const RECEIPT_STAMP =
  /wp(?:ł|l)(?:yw(?:u)?|yn(?:ę|e)(?:ło|lo))\s*(?:dnia|dn\.)?\s*[:.]?\s*(\d{1,2})\s*[.\-/ ]\s*(\d{1,2})\s*[.\-/ ]\s*(\d{4})/iu;

/**
 * "… informacji dotyczącej X", "… na temat X", "… w sprawie X", up to the end of
 * the sentence. A dot after a word of 1–3 letters is an abbreviation (pn., ul., nr., art.).
 */
const SUBJECT_PHRASE =
  /(?:dotycząc\p{L}*|na temat|w sprawie|w zakresie)\s+(\S.{15,400}?)(?:[:;]|(?<!\b\p{L}{1,3})\.(?=\s|$)|\n\n|$)/isu;

/** Trailing filler such as "… basenu w następującym zakresie". */
const TRAILING_FILLER = /[\s,]+w następującym zakresie$/iu;

const MAX_SUBJECT_LENGTH = 300;

export function parseRequestMetadata(input: { fileName: string; text: string | null }): RequestMetadata {
  return {
    caseNumber: findCaseNumber(input.fileName, input.text),
    receivedAt: findReceiptDate(input.text),
    subject: findSubject(input.text),
  };
}

function findCaseNumber(fileName: string, text: string | null): RequestMetadata['caseNumber'] {
  const fromName = CASE_NUMBER.exec(fileName);
  if (fromName) {
    return { value: fromName[0], source: MetadataSource.FileName };
  }
  const fromText = text ? CASE_NUMBER.exec(text) : null;
  return fromText ? { value: fromText[0], source: MetadataSource.Text } : null;
}

function findReceiptDate(text: string | null): RequestMetadata['receivedAt'] {
  const match = text ? RECEIPT_STAMP.exec(text) : null;
  if (!match) {
    return null;
  }
  const [day, month, year] = [match[1], match[2], match[3]];
  try {
    const date = parseDateOnly(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    return { value: formatDateOnly(date), source: MetadataSource.Text };
  } catch {
    return null;
  }
}

function findSubject(text: string | null): RequestMetadata['subject'] {
  const match = text ? SUBJECT_PHRASE.exec(text) : null;
  if (!match) {
    return null;
  }
  const subject = match[1].replace(/\s+/g, ' ').trim().replace(TRAILING_FILLER, '');
  const capped = subject.length > MAX_SUBJECT_LENGTH ? `${subject.slice(0, MAX_SUBJECT_LENGTH - 1)}…` : subject;
  return { value: capped.charAt(0).toUpperCase() + capped.slice(1), source: MetadataSource.Text };
}
