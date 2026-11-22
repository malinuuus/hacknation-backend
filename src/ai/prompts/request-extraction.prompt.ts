import { z } from 'zod';
import { dataBlock } from '../helpers/prompt.helper.js';
import type { StructuredPrompt } from '../interfaces/structured-prompt.interface.js';
import { DATA_BLOCK_RULE, OFFICE_CONTEXT } from './shared.prompt.js';

export const requestExtractionSchema = z.object({
  caseNumber: z.string().nullable().describe('Znak sprawy nadany przez urząd, np. BKS.IV.1431.590.2026; null gdy brak'),
  subject: z.string().nullable().describe('Krótki temat wniosku, do 150 znaków'),
  requesterName: z.string().nullable().describe('Imię i nazwisko lub nazwa wnioskodawcy, dokładnie jak w tekście'),
  requesterEmail: z.string().nullable().describe('Adres e-mail wnioskodawcy'),
  requesterAddress: z.string().nullable().describe('Adres pocztowy wnioskodawcy w jednej linii'),
  writtenAt: z.string().nullable().describe('Data sporządzenia pisma, RRRR-MM-DD'),
  receivedAt: z.string().nullable().describe('Data wpływu do urzędu, RRRR-MM-DD'),
  questions: z
    .array(
      z.object({
        text: z.string().describe('Pytanie lub prośba o informację jako pełne, samodzielne zdanie'),
        departmentSymbols: z.array(z.string()).describe('Symbole jednostek z listy, które mają tę informację'),
      }),
    )
    .describe('Wszystkie pytania wniosku, w kolejności'),
  departments: z
    .array(
      z.object({
        symbol: z.string().describe('Symbol jednostki z listy'),
        reason: z.string().describe('Jedno zdanie: dlaczego ta jednostka'),
      }),
    )
    .describe('Jednostki, do których należy skierować wniosek'),
});

export type RequestExtractionOutput = z.infer<typeof requestExtractionSchema>;

const SYSTEM = `${OFFICE_CONTEXT}
Twoje zadanie: odczytać z wniosku dane do rejestru i rozpisać pytania na jednostki urzędu.

${DATA_BLOCK_RULE}

Zasady:
- Nie zgaduj. Gdy informacji nie ma w tekście, zwróć null (lub pustą listę).
- Daty zwracaj jako RRRR-MM-DD.
- writtenAt: data sporządzenia pisma, zwykle w linii „miejscowość, data” albo przy podpisie lub w nagłówku e-maila nadawcy.
- receivedAt: data wpływu do urzędu z pieczęci lub adnotacji („wpłynęło”, „data wpływu”). Nie używaj daty sporządzenia pisma.
- requesterName: wnioskodawca (osoba lub organizacja), nigdy urząd będący adresatem. Przepisz dokładnie z tekstu.
- requesterEmail i requesterAddress: dane wnioskodawcy, nie urzędu.
- caseNumber: tylko znak sprawy nadany przez urząd, jeśli występuje w tekście lub nazwie pliku.
- subject: zwięzły temat w stylu rejestru, np. „Koszty opieki nad bezdomnymi zwierzętami w 2025 r.”.
- questions: każda odrębna prośba o informację to osobna pozycja. Zachowaj wszystkie szczegóły (okres, zakres, podział),
  sformułuj ją tak, by była zrozumiała bez reszty wniosku. Nie dodawaj pytań, których nie ma.
  Pomiń prośby o formę lub sposób udostępnienia (np. „proszę o przesłanie na e-mail”).
- departmentSymbols: wyłącznie symbole z listy <wydzialy>, zwykle jeden; pusta lista, gdy żadna jednostka nie pasuje.
  Właściwość jednostek ustalaj przede wszystkim na podstawie <baza_wiedzy> (np. regulaminu organizacyjnego), a gdy jej brak — z nazwy jednostki.
- departments: każda jednostka użyta w departmentSymbols dokładnie raz, z krótkim uzasadnieniem po polsku.`;

export function buildRequestExtractionPrompt(input: {
  today: string;
  fileName: string;
  text: string;
  departments: string;
  knowledge: string;
}): StructuredPrompt {
  return {
    system: SYSTEM,
    user: [
      `Dzisiejsza data: ${input.today}.`,
      dataBlock('nazwa_pliku', input.fileName),
      dataBlock('wydzialy', input.departments),
      dataBlock('baza_wiedzy', input.knowledge),
      dataBlock('wniosek', input.text),
    ].join('\n\n'),
  };
}
