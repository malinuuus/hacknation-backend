import type { RequestExtractionOutput } from '../../ai/prompts/request-extraction.prompt.js';
import { toRequestExtraction } from './request-extraction.service.js';

const departments = [
  { id: 'dep-wos', symbol: 'WOŚ', name: 'Wydział Ochrony Środowiska' },
  { id: 'dep-wk', symbol: 'WK', name: 'Wydział Księgowości' },
];

const text = `Bydgoszcz, 17 sierpnia 2026 r.
Jan Kowalski, ul. Długa 1, 85-001 Bydgoszcz, jan.kowalski@example.com
Wnoszę o informację o kosztach opieki nad bezdomnymi zwierzętami w 2025 r.`;

function output(overrides: Partial<RequestExtractionOutput> = {}): RequestExtractionOutput {
  return {
    caseNumber: null,
    subject: '  Koszty opieki nad   bezdomnymi zwierzętami ',
    requesterName: 'Jan Kowalski',
    requesterEmail: 'jan.kowalski@example.com',
    requesterAddress: 'ul. Długa 1, 85-001 Bydgoszcz',
    writtenAt: '2026-08-17',
    receivedAt: null,
    questions: [{ text: ' Jakie były koszty opieki w 2025 r.? ', departmentSymbols: ['wOŚ', 'WK', 'XYZ'] }],
    departments: [{ symbol: 'WOŚ', reason: 'Opieka nad zwierzętami. ' }],
    ...overrides,
  };
}

describe('toRequestExtraction', () => {
  it('maps department symbols to ids, case-insensitively, and drops unknown ones', () => {
    const result = toRequestExtraction(output(), departments, text);
    expect(result.questions).toEqual([
      { text: 'Jakie były koszty opieki w 2025 r.?', departmentIds: ['dep-wos', 'dep-wk'] },
    ]);
  });

  it('suggests departments used by questions even when left out of the summary', () => {
    const result = toRequestExtraction(output(), departments, text);
    expect(result.departments).toEqual([
      { departmentId: 'dep-wos', symbol: 'WOŚ', name: 'Wydział Ochrony Środowiska', reason: 'Opieka nad zwierzętami.' },
      { departmentId: 'dep-wk', symbol: 'WK', name: 'Wydział Księgowości', reason: '' },
    ]);
  });

  it('cleans up text fields', () => {
    const { fields } = toRequestExtraction(output(), departments, text);
    expect(fields.subject).toBe('Koszty opieki nad bezdomnymi zwierzętami');
    expect(fields.writtenAt).toBe('2026-08-17');
  });

  it('drops a name, e-mail or case number that does not occur in the text', () => {
    const { fields } = toRequestExtraction(
      output({ requesterName: 'Anna Nowak', requesterEmail: 'anna@example.com', caseNumber: 'BKS.IV.1431.1.2026' }),
      departments,
      text,
    );
    expect(fields.requesterName).toBeNull();
    expect(fields.requesterEmail).toBeNull();
    expect(fields.caseNumber).toBeNull();
  });

  it('finds the case number in the file name too', () => {
    const { fields } = toRequestExtraction(
      output({ caseNumber: 'BKS.IV.1431.590.2026' }),
      departments,
      `Wniosek BKS.IV.1431.590.2026.pdf\n${text}`,
    );
    expect(fields.caseNumber).toBe('BKS.IV.1431.590.2026');
  });

  it('drops invalid dates and e-mails', () => {
    const { fields } = toRequestExtraction(
      output({ writtenAt: '2026-02-30', receivedAt: '19.08.2026', requesterEmail: 'Jan Kowalski' }),
      departments,
      text,
    );
    expect(fields.writtenAt).toBeNull();
    expect(fields.receivedAt).toBeNull();
    expect(fields.requesterEmail).toBeNull();
  });
});
