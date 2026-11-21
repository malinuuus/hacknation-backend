import { CaseStatus } from '../../src/generated/prisma/enums.js';

/** When a demo case falls due, relative to the day the seed runs. */
export type DemoTiming =
  | { receivedDaysAgo: number }
  /** 0 = due today, 1 = due tomorrow; reached with an extension when no receipt date gives it. */
  | { dueInDays: number };

export interface DemoCase {
  subject: string;
  requesterName: string;
  requesterEmail: string;
  timing: DemoTiming;
  /** Path through the workflow, after NEW. */
  statuses: CaseStatus[];
  departmentSymbols: string[];
  /** Department symbols that have already replied. */
  answeredSymbols?: string[];
  handlerInitials: string;
  extension?: { daysFromToday: number; reason: string };
  respondedDaysAgo?: number;
}

/**
 * Ten fictional requests (no real personal data) covering every highlight:
 * overdue, due today, due tomorrow, extended, answered and upcoming.
 * Sequence numbers are assigned in receipt order and skip 509, 543 and 590,
 * so the hackathon example files can still be registered.
 */
export const DEMO_SEQUENCE_NUMBERS = [478, 486, 495, 503, 517, 526, 538, 551, 562, 574];

export const DEMO_CASES: DemoCase[] = [
  {
    subject: 'Koszty utrzymania zieleni miejskiej w 2025 r. oraz umowy z wykonawcami',
    requesterName: 'Stowarzyszenie Zielona Bydgoszcz (dane testowe)',
    requesterEmail: 'kontakt@zielona.example.com',
    timing: { receivedDaysAgo: 22 },
    statuses: [CaseStatus.SENT_TO_DEPARTMENTS],
    departmentSymbols: ['WGK'],
    handlerInitials: 'AK',
  },
  {
    subject: 'Liczba pozwoleń na budowę wydanych w 2025 r. w podziale na osiedla',
    requesterName: 'Jan Kowalski',
    requesterEmail: 'jan.kowalski@example.com',
    timing: { dueInDays: 0 },
    statuses: [CaseStatus.SENT_TO_DEPARTMENTS],
    departmentSymbols: ['WAB'],
    handlerInitials: 'TM',
  },
  {
    subject: 'Wydatki na promocję miasta w mediach społecznościowych w 2025 r.',
    requesterName: 'Redakcja portalu informacyjnego (dane testowe)',
    requesterEmail: 'redakcja@portal.example.com',
    timing: { dueInDays: 0 },
    statuses: [CaseStatus.SENT_TO_DEPARTMENTS, CaseStatus.RESPONSE_PREPARED],
    departmentSymbols: ['BP', 'BKS'],
    answeredSymbols: ['BP', 'BKS'],
    handlerInitials: 'AK',
  },
  {
    subject: 'Harmonogram remontów szkół podstawowych zaplanowanych na 2027 r.',
    requesterName: 'Anna Nowak',
    requesterEmail: 'anna.nowak@example.com',
    timing: { dueInDays: 1 },
    statuses: [],
    departmentSymbols: [],
    handlerInitials: 'TM',
  },
  {
    subject: 'Liczba interwencji dotyczących nielegalnie porzuconych odpadów wielkogabarytowych',
    requesterName: 'Piotr Wiśniewski',
    requesterEmail: 'p.wisniewski@example.com',
    timing: { dueInDays: 1 },
    statuses: [CaseStatus.SENT_TO_DEPARTMENTS],
    departmentSymbols: ['WGO', 'WZK'],
    answeredSymbols: ['WZK'],
    handlerInitials: 'MZ',
  },
  {
    subject: 'Umowy na obsługę prawną Urzędu Miasta zawarte w latach 2024–2026',
    requesterName: 'Fundacja Jawny Samorząd (dane testowe)',
    requesterEmail: 'biuro@jawny.example.com',
    timing: { receivedDaysAgo: 30 },
    statuses: [CaseStatus.SENT_TO_DEPARTMENTS],
    departmentSymbols: ['WOA', 'WZP'],
    answeredSymbols: ['WZP'],
    handlerInitials: 'MZ',
    extension: {
      daysFromToday: 20,
      reason: 'Konieczność zebrania i przeanalizowania umów z dwóch wydziałów',
    },
  },
  {
    subject: 'Wysokość dotacji przyznanych organizacjom pozarządowym w 2025 r.',
    requesterName: 'Katarzyna Wójcik',
    requesterEmail: 'k.wojcik@example.com',
    timing: { receivedDaysAgo: 18 },
    statuses: [CaseStatus.SENT_TO_DEPARTMENTS, CaseStatus.RESPONSE_PREPARED, CaseStatus.RESPONSE_SENT],
    departmentSymbols: ['BAS'],
    answeredSymbols: ['BAS'],
    handlerInitials: 'TM',
    respondedDaysAgo: 3,
  },
  {
    subject: 'Plan inwestycji w infrastrukturę rowerową na 2027 r.',
    requesterName: 'Tomasz Kamiński',
    requesterEmail: 't.kaminski@example.com',
    timing: { receivedDaysAgo: 5 },
    statuses: [CaseStatus.SENT_TO_DEPARTMENTS],
    departmentSymbols: ['WIM'],
    handlerInitials: 'AK',
  },
  {
    subject: 'Koszty organizacji miejskich wydarzeń kulturalnych latem 2026 r.',
    requesterName: 'Ewa Lewandowska',
    requesterEmail: 'ewa.lewandowska@example.com',
    timing: { receivedDaysAgo: 3 },
    statuses: [],
    departmentSymbols: [],
    handlerInitials: 'MZ',
  },
  {
    subject: 'Decyzje konserwatorskie dotyczące kamienic na Starym Mieście wydane w 2026 r.',
    requesterName: 'Michał Zieliński',
    requesterEmail: 'm.zielinski@example.com',
    timing: { receivedDaysAgo: 1 },
    statuses: [],
    departmentSymbols: [],
    handlerInitials: 'TM',
  },
];
