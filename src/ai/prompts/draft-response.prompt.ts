import { z } from 'zod';
import { dataBlock } from '../helpers/prompt.helper.js';
import type { StructuredPrompt } from '../interfaces/structured-prompt.interface.js';
import { DATA_BLOCK_RULE, OFFICE_CONTEXT } from './shared.prompt.js';

export const draftResponseSchema = z.object({
  text: z.string().describe('Projekt odpowiedzi, zwykły tekst'),
  usedSources: z.array(z.number().int()).describe('Numery źródeł [n], z których skorzystano'),
});

export type DraftResponseOutput = z.infer<typeof draftResponseSchema>;

const SYSTEM = `${OFFICE_CONTEXT}
Twoje zadanie: przygotować projekt pisemnej odpowiedzi urzędu na wniosek, do sprawdzenia i podpisania przez urzędnika.

${DATA_BLOCK_RULE}

Zasady:
- Odpowiedz na każde pytanie z <pytania>, w tej samej kolejności, numerując odpowiedzi tak jak pytania.
- Fakty (liczby, kwoty, daty, nazwy, opisy) bierz wyłącznie z <odpowiedzi_wydzialow> i <notatki_urzednika>. Niczego nie wymyślaj.
- Jeśli materiały nie wystarczają do odpowiedzi na pytanie, wstaw w tym miejscu znacznik [UZUPEŁNIJ: czego brakuje].
- <baza_wiedzy> wykorzystaj do podstawy prawnej, sformułowań i układu pisma (wzorcowe odpowiedzi), ale nie przenoś z niej faktów dotyczących innych spraw.
- Styl: formalny, uprzejmy i zwięzły język urzędowy, bez Markdown.
- Układ: „Bydgoszcz, [data]”, znak sprawy, adresat (wnioskodawca), zwrot grzecznościowy bez zakładania płci (np. „Szanowni Państwo”),
  nawiązanie do wniosku i podstawy prawnej (UDIP), odpowiedzi na pytania, formuła końcowa, na końcu [podpis].
- usedSources: numery źródeł [n], z których faktycznie wziąłeś treść.`;

export function buildDraftResponsePrompt(input: {
  today: string;
  caseNumber: string;
  subject: string;
  requesterName: string | null;
  writtenAt: string | null;
  receivedAt: string;
  questions: string;
  requestText: string | null;
  departmentResponses: string;
  notes: string | null;
  knowledge: string;
}): StructuredPrompt {
  const header = [
    `Dzisiejsza data: ${input.today}.`,
    `Znak sprawy: ${input.caseNumber}.`,
    `Data wpływu wniosku: ${input.receivedAt}.`,
    input.writtenAt ? `Data sporządzenia wniosku: ${input.writtenAt}.` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    system: SYSTEM,
    user: [
      header,
      dataBlock('temat', input.subject),
      dataBlock('wnioskodawca', input.requesterName ?? '(nie podano)'),
      dataBlock('pytania', input.questions),
      input.requestText ? dataBlock('wniosek', input.requestText) : null,
      dataBlock('odpowiedzi_wydzialow', input.departmentResponses),
      dataBlock('notatki_urzednika', input.notes ?? '(brak)'),
      dataBlock('baza_wiedzy', input.knowledge),
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}
