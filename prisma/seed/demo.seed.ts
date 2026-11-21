import bcrypt from 'bcrypt';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { CaseStatus } from '../../src/generated/prisma/enums.js';
import { formatCaseNumber } from '../../src/cases/helpers/case-number.helper.js';
import { canTransition } from '../../src/cases/helpers/case-status.helper.js';
import { addDays, formatDateOnly, todayInOfficeTimeZone } from '../../src/cases/helpers/date-only.helper.js';
import { computeDueDate, maxExtendedDueDate } from '../../src/cases/helpers/deadline.helper.js';
import { DEMO_CASES, DEMO_SEQUENCE_NUMBERS, type DemoCase, type DemoTiming } from './demo-cases.data.js';

const DEFAULT_DEMO_EMAIL = 'urzednik@example.com';
const DEFAULT_DEMO_PASSWORD = 'Bydgoszcz2026';
const BCRYPT_SALT_ROUNDS = 12;
const MAX_LOOKBACK_DAYS = 40;

interface ResolvedDates {
  receivedAt: Date;
  dueAt: Date;
  /** Set when the wanted deadline can only be reached with an extension. */
  extendedDueAt: Date | null;
}

/**
 * Picks a receipt date that makes the case fall due on the wanted day. A
 * statutory deadline is always a working day, so on weekends and holidays
 * "due today" is reached with an extension instead.
 */
function resolveDates(timing: DemoTiming, today: Date): ResolvedDates {
  if ('receivedDaysAgo' in timing) {
    const receivedAt = addDays(today, -timing.receivedDaysAgo);
    return { receivedAt, dueAt: computeDueDate(receivedAt), extendedDueAt: null };
  }

  const target = addDays(today, timing.dueInDays);
  for (let daysAgo = 0; daysAgo <= MAX_LOOKBACK_DAYS; daysAgo++) {
    const receivedAt = addDays(today, -daysAgo);
    if (computeDueDate(receivedAt).getTime() === target.getTime()) {
      return { receivedAt, dueAt: computeDueDate(receivedAt), extendedDueAt: null };
    }
  }
  const receivedAt = addDays(target, -20);
  return { receivedAt, dueAt: computeDueDate(receivedAt), extendedDueAt: target };
}

interface HistoryEntry {
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus;
  comment: string | null;
}

/**
 * History from registration to the current status. An extension keeps the
 * status, so it is recorded as a same-status entry after the first step.
 */
function buildHistory(demo: DemoCase, extendedDueAt: Date | null): HistoryEntry[] {
  const history: HistoryEntry[] = [{ fromStatus: null, toStatus: CaseStatus.NEW, comment: null }];
  let previous: CaseStatus = CaseStatus.NEW;
  for (const status of demo.statuses) {
    if (!canTransition(previous, status)) {
      throw new Error(`Invalid demo status path for "${demo.subject}": ${previous} → ${status}`);
    }
    history.push({ fromStatus: previous, toStatus: status, comment: null });
    previous = status;
  }
  if (extendedDueAt) {
    const at = Math.min(2, history.length);
    const status = history[at - 1].toStatus;
    history.splice(at, 0, {
      fromStatus: status,
      toStatus: status,
      comment: `Termin przedłużony do ${formatDateOnly(extendedDueAt)}`,
    });
  }
  return history;
}

const minDate = (a: Date, b: Date) => (a < b ? a : b);

async function upsertDemoUser(prisma: PrismaClient): Promise<{ id: string; email: string; password: string }> {
  const email = (process.env.SEED_DEMO_EMAIL ?? DEFAULT_DEMO_EMAIL).trim().toLowerCase();
  const password = process.env.SEED_DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD;
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  });
  return { id: user.id, email, password };
}

/**
 * Replaces the demo user's cases with ten fresh ones, dated relative to today,
 * so the register always shows overdue, due-today and due-tomorrow requests.
 */
export async function seedDemoCases(prisma: PrismaClient): Promise<void> {
  const today = todayInOfficeTimeZone();
  const prefix = process.env.CASE_NUMBER_PREFIX ?? 'BKS.IV.1431';
  const user = await upsertDemoUser(prisma);

  const departments = await prisma.department.findMany({ select: { id: true, symbol: true } });
  const departmentId = (symbol: string) => {
    const found = departments.find((department) => department.symbol === symbol);
    if (!found) {
      throw new Error(`Department ${symbol} is missing; seed departments first`);
    }
    return found.id;
  };

  const removed = await prisma.case.deleteMany({ where: { createdById: user.id } });

  const planned = DEMO_CASES.map((demo) => ({ demo, dates: resolveDates(demo.timing, today) })).sort(
    (a, b) => a.dates.receivedAt.getTime() - b.dates.receivedAt.getTime(),
  );

  for (const [index, { demo, dates }] of planned.entries()) {
    const year = dates.receivedAt.getUTCFullYear();
    const sequenceNumber = DEMO_SEQUENCE_NUMBERS[index];

    let extendedDueAt = dates.extendedDueAt;
    if (demo.extension) {
      extendedDueAt = minDate(addDays(today, demo.extension.daysFromToday), maxExtendedDueDate(dates.receivedAt));
    }
    const history = buildHistory(demo, extendedDueAt);

    const requestedAt = minDate(addDays(dates.receivedAt, 1), today);
    const answeredAt = minDate(addDays(requestedAt, 3), today);
    const respondedAt = demo.respondedDaysAgo !== undefined ? addDays(today, -demo.respondedDaysAgo) : null;

    // History entries spread over the life of the case, oldest first.
    const changedAt = (step: number) =>
      new Date(Math.min(addDays(dates.receivedAt, step * 2).getTime() + 9 * 3600_000, Date.now()));

    await prisma.case.create({
      data: {
        year,
        sequenceNumber,
        caseNumber: formatCaseNumber(prefix, sequenceNumber, year),
        subject: demo.subject,
        receivedAt: dates.receivedAt,
        dueAt: dates.dueAt,
        extendedDueAt,
        effectiveDueAt: extendedDueAt ?? dates.dueAt,
        extensionReason: extendedDueAt
          ? (demo.extension?.reason ?? 'Konieczność uzyskania informacji z kilku komórek urzędu')
          : null,
        respondedAt,
        status: demo.statuses.at(-1) ?? CaseStatus.NEW,
        handlerInitials: demo.handlerInitials,
        requesterName: demo.requesterName,
        requesterEmail: demo.requesterEmail,
        assigneeId: user.id,
        createdById: user.id,
        statusChanges: {
          create: history.map((entry, step) => ({
            ...entry,
            changedById: user.id,
            createdAt: changedAt(step),
          })),
        },
        departments: {
          create: demo.departmentSymbols.map((symbol) => ({
            departmentId: departmentId(symbol),
            requestedAt,
            answeredAt: demo.answeredSymbols?.includes(symbol) ? answeredAt : null,
          })),
        },
      },
    });
  }

  console.log(
    `Replaced ${removed.count} demo cases with ${planned.length} new ones (today: ${formatDateOnly(today)}).\n` +
      `Demo login: ${user.email} / ${user.password}` +
      (process.env.SEED_DEMO_PASSWORD ? '' : ' (default; set SEED_DEMO_PASSWORD to change it)'),
  );
}
