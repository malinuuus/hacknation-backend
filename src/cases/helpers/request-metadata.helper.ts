import { MetadataSource } from '../enums/metadata-source.enum.js';
import type { RequestMetadata } from '../interfaces/request-metadata.interface.js';
import type { SuggestedValue } from '../interfaces/suggested-value.interface.js';
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
const MAX_REQUESTER_NAME_LENGTH = 300;
const MAX_REQUESTER_ADDRESS_LENGTH = 500;

const MONTHS: Readonly<Record<string, number>> = {
  stycznia: 1,
  lutego: 2,
  marca: 3,
  kwietnia: 4,
  maja: 5,
  czerwca: 6,
  lipca: 7,
  sierpnia: 8,
  września: 9,
  października: 10,
  listopada: 11,
  grudnia: 12,
};

/** Place and date line of a letter: "Bydgoszcz, 17.08.2026 r." or "Bydgoszcz, dnia 17 sierpnia 2026". */
const PLACE_AND_DATE =
  /^[ \t]*\p{Lu}[\p{L} .-]{1,40},\s*(?:dnia|dn\.)?\s*(\d{1,2})(?:\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*|\s+(\p{L}+)\s+)(\d{4})/imu;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/i;

/** Header lines naming the recipient of an e-mail, whose address is the office's own. */
const RECIPIENT_HEADER = /^\s*(?:do|to|dw|cc|bcc|udw)\s*:/i;

/** "Wnioskodawca: …", "Imię i nazwisko: …", or the "Od: …" header of a forwarded e-mail. */
const REQUESTER_LABEL = /^[ \t]*(?:wnioskodawca|imię i nazwisko|nadawca|od|from)[ \t]*:[ \t]*(\S[^\n]*)$/imu;

/** The line signed after a closing formula. */
const SIGNATURE =
  /(?:z\s+(?:wyrazami\s+szacunku|poważaniem|pozdrowieniami)|pozdrawiam(?:\s+serdecznie)?)[ \t]*[,.!]?[ \t]*\n(?:[ \t]*\n)*[ \t]*([^\n]{2,120})/iu;

const ADDRESS_LABEL =
  /^[ \t]*adres(?:\s+(?:do\s+korespondencji|zamieszkania|siedziby|pocztowy))?[ \t]*:[ \t]*(\S[^\n]*)$/imu;

const POSTAL_CODE = /\b\d{2}-\d{3}\s+\p{Lu}\p{L}+/u;
const STREET = /^(?:ul|al|pl|os)\.\s*\S/iu;

/** Lines right before an address that mark it as the office's (the addressee), not the requester's. */
const OFFICE_CONTEXT = /urz[aą]d|prezydent|burmistrz|biuro|wydzia[lł]|szanown/iu;

export function parseRequestMetadata(input: { fileName: string; text: string | null }): RequestMetadata {
  return {
    caseNumber: findCaseNumber(input.fileName, input.text),
    receivedAt: findReceiptDate(input.text),
    subject: findSubject(input.text),
    writtenAt: findWrittenDate(input.text),
    requesterName: findRequesterName(input.text),
    requesterEmail: findRequesterEmail(input.text),
    requesterAddress: findRequesterAddress(input.text),
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
  return toSuggestedDate(match[1], match[2], match[3]);
}

function findWrittenDate(text: string | null): RequestMetadata['writtenAt'] {
  const match = text ? PLACE_AND_DATE.exec(text) : null;
  if (!match) {
    return null;
  }
  const [, day, numericMonth, monthName, year] = match;
  const month = numericMonth ?? MONTHS[monthName.toLocaleLowerCase('pl')]?.toString();
  return month ? toSuggestedDate(day, month, year) : null;
}

function toSuggestedDate(day: string, month: string, year: string): SuggestedValue<string> | null {
  try {
    const date = parseDateOnly(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    return { value: formatDateOnly(date), source: MetadataSource.Text };
  } catch {
    return null;
  }
}

function findRequesterName(text: string | null): RequestMetadata['requesterName'] {
  if (!text) {
    return null;
  }
  const candidates = [REQUESTER_LABEL.exec(text)?.[1], SIGNATURE.exec(text)?.[1]];
  for (const candidate of candidates) {
    const name = candidate && cleanRequesterName(candidate);
    if (name) {
      return { value: cap(name, MAX_REQUESTER_NAME_LENGTH), source: MetadataSource.Text };
    }
  }
  return null;
}

/** Drops an e-mail part ("Jan Kowalski <jan@example.com>"); rejects lines that are not a name. */
function cleanRequesterName(value: string): string | null {
  const name = value
    .replace(/<[^>]*>|\([^)]*@[^)]*\)/g, '')
    .replace(EMAIL, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, '');
  return name.length >= 2 && /\p{L}/u.test(name) && !/\d/.test(name) ? name : null;
}

function findRequesterEmail(text: string | null): RequestMetadata['requesterEmail'] {
  for (const line of text?.split('\n') ?? []) {
    const match = RECIPIENT_HEADER.test(line) ? null : EMAIL.exec(line);
    if (match) {
      return { value: match[0].toLowerCase(), source: MetadataSource.Text };
    }
  }
  return null;
}

function findRequesterAddress(text: string | null): RequestMetadata['requesterAddress'] {
  if (!text) {
    return null;
  }
  const labelled = ADDRESS_LABEL.exec(text)?.[1];
  if (labelled && !EMAIL.test(labelled)) {
    return toSuggestedAddress(labelled);
  }

  const lines = text.split('\n').map((line) => line.trim());
  for (const [index, line] of lines.entries()) {
    if (!POSTAL_CODE.test(line) || EMAIL.test(line)) {
      continue;
    }
    const previous = lines.slice(Math.max(0, index - 3), index).filter(Boolean);
    if (previous.some((context) => OFFICE_CONTEXT.test(context)) || OFFICE_CONTEXT.test(line)) {
      continue;
    }
    const street = previous.at(-1);
    return toSuggestedAddress(street && STREET.test(street) && !STREET.test(line) ? `${street}, ${line}` : line);
  }
  return null;
}

function toSuggestedAddress(value: string): SuggestedValue<string> {
  const address = value.replace(/\s+/g, ' ').replace(/^[\s,;]+|[\s,;.]+$/g, '');
  return { value: cap(address, MAX_REQUESTER_ADDRESS_LENGTH), source: MetadataSource.Text };
}

function cap(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function findSubject(text: string | null): RequestMetadata['subject'] {
  const match = text ? SUBJECT_PHRASE.exec(text) : null;
  if (!match) {
    return null;
  }
  const subject = match[1].replace(/\s+/g, ' ').trim().replace(TRAILING_FILLER, '');
  const capped = cap(subject, MAX_SUBJECT_LENGTH);
  return { value: capped.charAt(0).toUpperCase() + capped.slice(1), source: MetadataSource.Text };
}
