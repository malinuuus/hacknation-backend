/**
 * Wraps untrusted content (request text, documents) in a tagged block, so the
 * model treats it as data. A closing tag inside the content is neutralised,
 * so a document cannot end the block early and smuggle in instructions.
 */
export function dataBlock(tag: string, content: string): string {
  const closing = new RegExp(`</\\s*${tag}\\s*>`, 'gi');
  return `<${tag}>\n${content.replace(closing, `</ ${tag}_>`)}\n</${tag}>`;
}

/** Shortens text for the prompt, marking the cut. */
export function truncateForPrompt(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}\n[…tekst skrócony…]`;
}

/** Normalises whitespace and case, for checking that a value really occurs in a text. */
export function normalizeForMatch(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLocaleLowerCase('pl');
}
