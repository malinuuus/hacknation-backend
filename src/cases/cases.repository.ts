import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { CaseStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssigneeNotFoundError } from './errors/assignee-not-found.error.js';
import { CaseNumberTakenError } from './errors/case-number-taken.error.js';
import { SequenceNumberTakenError } from './errors/sequence-number-taken.error.js';

const userRef = { select: { id: true, email: true } } as const;

const summaryInclude = { assignee: userRef } satisfies Prisma.CaseInclude;

const detailInclude = {
  assignee: userRef,
  createdBy: userRef,
  statusChanges: { include: { changedBy: userRef }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.CaseInclude;

export type CaseSummaryRecord = Prisma.CaseGetPayload<{ include: typeof summaryInclude }>;
export type CaseDetailRecord = Prisma.CaseGetPayload<{ include: typeof detailInclude }>;

export interface CreateCaseData {
  year: number;
  /** Explicit sequence number; the next free one of the year when omitted. */
  sequenceNumber?: number;
  /** Explicit case number, or a function building one from the assigned sequence number. */
  caseNumber: string | ((sequenceNumber: number) => string);
  subject: string;
  receivedAt: Date;
  dueAt: Date;
  handlerInitials?: string;
  assigneeId?: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterAddress?: string;
  notes?: string;
  createdById: string;
}

export interface CaseListFilter {
  year: number;
  status?: CaseStatus;
  assigneeId?: string;
  search?: string;
  limit: number;
  offset: number;
}

/** Concurrent creates can race for the same sequence number; retry a few times. */
const MAX_SEQUENCE_ATTEMPTS = 3;

@Injectable()
export class CasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a case with the next sequence number of its year and records the
   * initial status in the history.
   *
   * @throws {CaseNumberTakenError} when the case number is already used.
   * @throws {SequenceNumberTakenError} when an explicit sequence number is already used in that year.
   * @throws {AssigneeNotFoundError} when `assigneeId` does not match a user.
   */
  async create(data: CreateCaseData): Promise<CaseDetailRecord> {
    const { caseNumber, createdById, sequenceNumber: explicitSequence, ...fields } = data;

    for (let attempt = 1; ; attempt++) {
      let resolvedCaseNumber: string | undefined;
      try {
        return await this.prisma.$transaction(async (tx) => {
          const sequenceNumber = explicitSequence ?? (await this.nextSequenceNumber(tx, data.year));
          resolvedCaseNumber = typeof caseNumber === 'function' ? caseNumber(sequenceNumber) : caseNumber;

          return tx.case.create({
            data: {
              ...fields,
              sequenceNumber,
              caseNumber: resolvedCaseNumber,
              createdById,
              statusChanges: { create: { toStatus: CaseStatus.NEW, changedById: createdById } },
            },
            include: detailInclude,
          });
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
          throw error;
        }
        if (error.code === 'P2003') {
          throw new AssigneeNotFoundError(data.assigneeId ?? '');
        }
        if (error.code === 'P2002' && resolvedCaseNumber !== undefined) {
          // The constraint name in `meta` differs between drivers, so check which one clashed.
          if (await this.caseNumberExists(resolvedCaseNumber)) {
            throw new CaseNumberTakenError(resolvedCaseNumber);
          }
          if (explicitSequence !== undefined) {
            throw new SequenceNumberTakenError(explicitSequence, data.year);
          }
          if (attempt < MAX_SEQUENCE_ATTEMPTS) {
            continue;
          }
        }
        throw error;
      }
    }
  }

  async findMany(filter: CaseListFilter): Promise<{ items: CaseSummaryRecord[]; total: number }> {
    const where: Prisma.CaseWhereInput = {
      year: filter.year,
      status: filter.status,
      assigneeId: filter.assigneeId,
      ...(filter.search && {
        OR: [
          { caseNumber: { contains: filter.search, mode: 'insensitive' } },
          { subject: { contains: filter.search, mode: 'insensitive' } },
          { requesterName: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.case.findMany({
        where,
        include: summaryInclude,
        orderBy: [{ receivedAt: 'asc' }, { sequenceNumber: 'asc' }],
        skip: filter.offset,
        take: filter.limit,
      }),
      this.prisma.case.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<CaseDetailRecord | null> {
    return this.prisma.case.findUnique({ where: { id }, include: detailInclude });
  }

  async findYears(): Promise<number[]> {
    const rows = await this.prisma.case.findMany({
      distinct: ['year'],
      select: { year: true },
      orderBy: { year: 'desc' },
    });
    return rows.map((row) => row.year);
  }

  private async nextSequenceNumber(tx: Prisma.TransactionClient, year: number): Promise<number> {
    const { _max } = await tx.case.aggregate({ where: { year }, _max: { sequenceNumber: true } });
    return (_max.sequenceNumber ?? 0) + 1;
  }

  private async caseNumberExists(caseNumber: string): Promise<boolean> {
    const found = await this.prisma.case.findUnique({ where: { caseNumber }, select: { id: true } });
    return found !== null;
  }
}
