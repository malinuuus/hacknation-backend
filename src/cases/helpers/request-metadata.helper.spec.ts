import { MetadataSource } from '../enums/metadata-source.enum.js';
import { parseRequestMetadata } from './request-metadata.helper.js';

const ASTORIA_PDF = `WNIOSEK O UDOSTĘPNIENIE INFORMACJI PUBLICZNEJ
Na podstawie art. 2 ust. 1 i art. 10 ust. 1 ustawy z dnia 6 września 2001 r. o dostępie do informacji
publicznej
(Dz. U. z 2016 r. poz. 1764 ze zm.) proszę o udostępnienie informacji dotyczącej Państwa inwestycji
pn. „Budowa kompleksu Astoria ul. Królowej Jadwigi 23 w Bydgoszczy – „Rewitalizacja kompleksu
Astoria na cele sportowo - rekreacyjne wraz z budową 50 -metrowego basenu” w następującym
zakresie:
1. Proszę o informację czy Pan pełnił funkcję Kierownika robót
Budowlanka S.A.`;

const APARTMENTS_DOCX = `W trybie dostępu do informacji publicznej proszę o przesłanie dokumentacji dotyczącej budynku nowego apartamentowca (teren po budynku Astrum):

Projekt zagospodarowania terenu

Z wyrazami szacunku

E. Góra`;

// What OCR of the stamped e-mail scan would produce.
const ANIMALS_SCAN = `BKS Urząd Miasta Bydgoszczy
URZĄD MIASTA BYDGOSZCZY Biuro Komunikacji Społecznej
wpływ dnia 19. 08. 2026
Stowarzyszenie , organizacja pożytku publicznego, zwraca się z uprzejmą prośbą o udzielenie informacji publicznej na temat sposobu i skutków wykonywania zadania „opieka nad bezdomnymi zwierzętami i ich wyłapywanie", przewidzianego ustawą o ochronie zwierząt.`;

describe('parseRequestMetadata', () => {
  it('reads the case number from the file name and the subject from the text', () => {
    const result = parseRequestMetadata({ fileName: 'Wniosek - BKS.IV.1431.590.2026.pdf', text: ASTORIA_PDF });

    expect(result.caseNumber).toEqual({ value: 'BKS.IV.1431.590.2026', source: MetadataSource.FileName });
    expect(result.receivedAt).toBeNull();
    expect(result.subject?.value).toMatch(/^Państwa inwestycji pn\. „Budowa kompleksu Astoria/);
  });

  it('handles the DOCX example', () => {
    const result = parseRequestMetadata({ fileName: 'Wniosek - BKS.IV.1431.509.2026.docx', text: APARTMENTS_DOCX });

    expect(result.caseNumber?.value).toBe('BKS.IV.1431.509.2026');
    expect(result.subject?.value).toBe('Budynku nowego apartamentowca (teren po budynku Astrum)');
  });

  it('reads the office stamp date and a "na temat" subject', () => {
    const result = parseRequestMetadata({ fileName: 'skan.pdf', text: ANIMALS_SCAN });

    expect(result.caseNumber).toBeNull();
    expect(result.receivedAt).toEqual({ value: '2026-08-19', source: MetadataSource.Text });
    expect(result.subject?.value).toMatch(/^Sposobu i skutków wykonywania zadania „opieka nad bezdomnymi/);
  });

  it('finds a case number in the text when the file name has none', () => {
    const result = parseRequestMetadata({ fileName: 'scan001.pdf', text: 'Znak sprawy: WIM.II.1431.12.2026' });
    expect(result.caseNumber).toEqual({ value: 'WIM.II.1431.12.2026', source: MetadataSource.Text });
  });

  it.each(['data wpływu: 3.02.2026', 'Wpłynęło 03-02-2026'])('reads stamp variant "%s"', (stamp) => {
    expect(parseRequestMetadata({ fileName: 'x.pdf', text: stamp }).receivedAt?.value).toBe('2026-02-03');
  });

  it('ignores impossible stamp dates and missing text', () => {
    expect(parseRequestMetadata({ fileName: 'x.pdf', text: 'wpływ dnia 31.02.2026' }).receivedAt).toBeNull();
    expect(parseRequestMetadata({ fileName: 'x.pdf', text: null })).toEqual({
      caseNumber: null,
      receivedAt: null,
      subject: null,
      writtenAt: null,
      requesterName: null,
      requesterEmail: null,
      requesterAddress: null,
    });
  });

  it('reads the signature as the requester name', () => {
    expect(parseRequestMetadata({ fileName: 'x.docx', text: APARTMENTS_DOCX }).requesterName).toEqual({
      value: 'E. Góra',
      source: MetadataSource.Text,
    });
  });

  it.each([
    ['Bydgoszcz, 17.08.2026 r.', '2026-08-17'],
    ['Bydgoszcz, dnia 3 lutego 2026 r.', '2026-02-03'],
    ['  Nowa Wieś Wielka, 5-11-2026', '2026-11-05'],
  ])('reads the date the letter was written from "%s"', (line, expected) => {
    const text = `${line}\nwpływ dnia 19.11.2026\nWniosek`;
    const result = parseRequestMetadata({ fileName: 'x.pdf', text });

    expect(result.writtenAt?.value).toBe(expected);
    expect(result.receivedAt?.value).toBe('2026-11-19');
  });

  it('does not take the office stamp for the date the letter was written', () => {
    expect(parseRequestMetadata({ fileName: 'x.pdf', text: ANIMALS_SCAN }).writtenAt).toBeNull();
  });

  it('reads the requester from a forwarded e-mail, skipping the office inbox', () => {
    const text = `Od: Jan Kowalski <Jan.Kowalski@example.com>
Do: bks@um.bydgoszcz.pl
Temat: wniosek

Proszę o informację w sprawie remontu ulicy Gdańskiej w latach 2024–2026.`;
    const result = parseRequestMetadata({ fileName: 'mail.pdf', text });

    expect(result.requesterName?.value).toBe('Jan Kowalski');
    expect(result.requesterEmail?.value).toBe('jan.kowalski@example.com');
  });

  it('reads the requester address, but not the office address', () => {
    const text = `Anna Nowak
ul. Długa 5/2
85-001 Bydgoszcz

Urząd Miasta Bydgoszczy
ul. Jezuicka 1
85-102 Bydgoszcz`;
    expect(parseRequestMetadata({ fileName: 'x.pdf', text }).requesterAddress?.value).toBe(
      'ul. Długa 5/2, 85-001 Bydgoszcz',
    );
  });

  it('prefers a labelled address and ignores the office address alone', () => {
    expect(
      parseRequestMetadata({ fileName: 'x.pdf', text: 'Adres do korespondencji: ul. Krótka 1, 85-002 Bydgoszcz' })
        .requesterAddress?.value,
    ).toBe('ul. Krótka 1, 85-002 Bydgoszcz');
    expect(
      parseRequestMetadata({ fileName: 'x.pdf', text: 'Prezydent Miasta Bydgoszczy\nul. Jezuicka 1\n85-102 Bydgoszcz' })
        .requesterAddress,
    ).toBeNull();
  });
});
