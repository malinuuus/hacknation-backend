import { z } from 'zod';
import { RedactionCategory } from '../../cases/enums/redaction-category.enum.js';
import { dataBlock } from '../helpers/prompt.helper.js';
import type { StructuredPrompt } from '../interfaces/structured-prompt.interface.js';
import { DATA_BLOCK_RULE, OFFICE_CONTEXT } from './shared.prompt.js';

export const redactionSchema = z.object({
  suggestions: z.array(
    z.object({
      text: z.string().describe('Fragment dokładnie tak, jak występuje w dokumencie'),
      category: z.enum(RedactionCategory),
      reason: z.string().describe('Krótko, dlaczego należy go ukryć'),
    }),
  ),
});

export type RedactionOutput = z.infer<typeof redactionSchema>;

const SYSTEM = `${OFFICE_CONTEXT}
Twoje zadanie: wskazać w projekcie odpowiedzi fragmenty, które należy zanonimizować przed jej udostępnieniem.

${DATA_BLOCK_RULE}

Zasady:
- Wskaż dane osobowe osób fizycznych: imiona i nazwiska (PERSON_NAME), adresy (ADDRESS), adresy e-mail (EMAIL),
  numery telefonów (PHONE), PESEL, numery dokumentów, rachunków bankowych lub rejestracyjne (ID_NUMBER),
  a także inne informacje chronione, np. tajemnicę przedsiębiorcy lub dane o zdrowiu (OTHER).
- Nie wskazuj danych osób pełniących funkcje publiczne, gdy dotyczą pełnienia tych funkcji (art. 5 ust. 2 UDIP),
  ani danych urzędu, jednostek miejskich i firm podawanych w związku z wydatkowaniem środków publicznych,
  chyba że <baza_wiedzy> stanowi inaczej.
- Kieruj się wytycznymi z <baza_wiedzy>, jeśli dotyczą anonimizacji.
- Każdy fragment przepisz znak w znak z <dokument>, możliwie najkrótszy, bez otaczającego tekstu. Każdy fragment podaj raz.
- reason: krótko, po polsku.`;

export function buildRedactionPrompt(input: { text: string; requester: string; knowledge: string }): StructuredPrompt {
  return {
    system: SYSTEM,
    user: [
      dataBlock('wnioskodawca', input.requester),
      dataBlock('baza_wiedzy', input.knowledge),
      dataBlock('dokument', input.text),
    ].join('\n\n'),
  };
}
