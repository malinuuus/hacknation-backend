import { ExtractionMethod } from '../enums/extraction-method.enum.js';
import { MetadataSource } from '../enums/metadata-source.enum.js';
import type { RequestMetadata } from '../interfaces/request-metadata.interface.js';
import { mergeSuggestions } from './merge-suggestions.helper.js';

const empty: RequestMetadata = {
  caseNumber: null,
  receivedAt: null,
  subject: null,
  writtenAt: null,
  requesterName: null,
  requesterEmail: null,
  requesterAddress: null,
};
const noAi = {
  caseNumber: null,
  receivedAt: null,
  subject: null,
  writtenAt: null,
  requesterName: null,
  requesterEmail: null,
  requesterAddress: null,
};

describe('mergeSuggestions', () => {
  it('marks pattern matches when there is no AI result', () => {
    const merged = mergeSuggestions({ ...empty, subject: { value: 'Temat', source: MetadataSource.Text } }, null);
    expect(merged.subject).toEqual({ value: 'Temat', source: MetadataSource.Text, method: ExtractionMethod.Pattern });
    expect(merged.requesterName).toBeNull();
  });

  it('prefers the AI for free-form fields and fills gaps', () => {
    const merged = mergeSuggestions(
      { ...empty, requesterName: { value: 'Z poważaniem', source: MetadataSource.Text } },
      { ...noAi, requesterName: 'Jan Kowalski', writtenAt: '2026-08-17' },
    );
    expect(merged.requesterName).toEqual({
      value: 'Jan Kowalski',
      source: MetadataSource.Text,
      method: ExtractionMethod.Ai,
    });
    expect(merged.writtenAt?.method).toBe(ExtractionMethod.Ai);
  });

  it('prefers pattern matches for the case number and e-mail', () => {
    const merged = mergeSuggestions(
      {
        ...empty,
        caseNumber: { value: 'BKS.IV.1431.590.2026', source: MetadataSource.FileName },
        requesterEmail: { value: 'jan@example.com', source: MetadataSource.Text },
      },
      {
        ...noAi,
        caseNumber: 'BKS.IV.1431.59.2026',
        requesterEmail: 'jan2@example.com',
        requesterAddress: 'ul. Długa 1',
      },
    );
    expect(merged.caseNumber).toEqual({
      value: 'BKS.IV.1431.590.2026',
      source: MetadataSource.FileName,
      method: ExtractionMethod.Pattern,
    });
    expect(merged.requesterEmail?.value).toBe('jan@example.com');
    expect(merged.requesterAddress?.method).toBe(ExtractionMethod.Ai);
  });
});
