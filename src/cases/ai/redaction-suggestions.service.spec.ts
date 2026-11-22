import { RedactionCategory } from '../enums/redaction-category.enum.js';
import { filterSuggestions } from './redaction-suggestions.service.js';

const text = 'Szanowny Panie Janie Kowalski, odpowiedź wysyłamy na adres jan.kowalski@example.com. Dziękujemy.';
const s = (fragment: string, category = RedactionCategory.Other) => ({ text: fragment, category, reason: ' powód ' });

describe('filterSuggestions', () => {
  it('keeps only fragments occurring verbatim, in text order', () => {
    const result = filterSuggestions(text, [
      s('jan.kowalski@example.com', RedactionCategory.Email),
      s('Janie Kowalski', RedactionCategory.PersonName),
      s('Jan Kowalski', RedactionCategory.PersonName),
    ]);
    expect(result.map((item) => item.text)).toEqual(['Janie Kowalski', 'jan.kowalski@example.com']);
    expect(result[0].reason).toBe('powód');
  });

  it('drops duplicates, fragments inside longer ones and too short fragments', () => {
    const result = filterSuggestions(text, [s('Kowalski'), s('Janie Kowalski'), s('Janie Kowalski'), s('J'), s('  ')]);
    expect(result.map((item) => item.text)).toEqual(['Janie Kowalski']);
  });
});
