import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { CaseStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssigneeNotFoundError } from './errors/assignee-not-found.error.js';
import { caseDocumentSummaryArgs } from './case-documents.repository.js';
import { CaseSort } from './enums/case-sort.enum.js';
import { CaseDepartmentNotFoundError } from './errors/case-department-not-found.error.js';
import { CaseNotFoundError } from './errors/case-not-found.error.js';
import { CaseNumberTakenError } from './errors/case-number-taken.error.js';
import { CaseStatusChangedError } from './errors/case-status-changed.error.js';
import { DepartmentNotFoundError } from './errors/department-not-found.error.js';
import { SequenceNumberTakenError } from './errors/sequence-number-taken.error.js';
import type { CaseListFilter } from './interfaces/case-list-filter.interface.js';
import type { CaseListResult } from './interfaces/case-list-result.interface.js';
import type { CaseStatusChangeData } from './interfaces/case-status-change-data.interface.js';
import type { CreateCaseData } from './interfaces/create-case-data.interface.js';
import type { SetCaseDepartmentsData } from './interfaces/set-case-departments-data.interface.js';
import type { UpdateCaseData } from './interfaces/update-case-data.interface.js';

const userRef = { select: { id: true, email: true } } as const;

const summaryInclude = {
  assignee: userRef,
  departments: {
    select: { answeredAt: true, department: { select: { symbol: true } } },
    orderBy: { department: { symbol: 'asc' } },
  },
} satisfies Prisma.CaseInclude;

const detailInclude = {
  assignee: userRef,
  createdBy: userRef,
  statusChanges: { include: { changedBy: userRef }, orderBy: { createdAt: 'asc' } },
  departments: { include: { department: true }, orderBy: { department: { symbol: 'asc' } } },
  documents: { ...caseDocumentSummaryArgs, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.CaseInclude;

export type CaseSummaryRecord = Prisma.CaseGetPayload<{ include: typeof summaryInclude }>;
export type CaseDetailRecord = Prisma.CaseGetPayload<{ include: typeof detailInclude }>;

/** Ties are broken by the register's ordinal number, so the order is stable for paging. */
const CASE_ORDER: Readonly<Record<CaseSort, Prisma.CaseOrderByWithRelationInput[]>> = {
  [CaseSort.ReceivedAsc]: [{ receivedAt: 'asc' }, { sequenceNumber: 'asc' }],
  [CaseSort.ReceivedDesc]: [{ receivedAt: 'desc' }, { sequenceNumber: 'desc' }],
  // `respondedAt` is set only once the response is sent, so open cases come first.
  [CaseSort.DeadlineAsc]: [
    { respondedAt: { sort: 'asc', nulls: 'first' } },
    { effectiveDueAt: 'asc' },
    { receivedAt: 'asc' },
    { sequenceNumber: 'asc' },
  ],
};

/** Concurrent creates can race for the same sequence number; retry a few times. */
const MAX_SEQUENCE_ATTEMPTS = 3;

const isKnownError = (error: unknown, code: string): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

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
    const { caseNumber, createdById, sequenceNumber: explicitSequence, document, ...fields } = data;

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
              documents: document ? { create: document } : undefined,
            },
            include: detailInclude,
          });
        });
      } catch (error) {
        const retry =
          isKnownError(error, 'P2002') &&
          explicitSequence === undefined &&
          attempt < MAX_SEQUENCE_ATTEMPTS &&
          resolvedCaseNumber !== undefined &&
          !(await this.caseNumberExists(resolvedCaseNumber));
        if (retry) {
          continue;
        }
        throw await this.mapWriteError(error, {
          caseNumber: resolvedCaseNumber,
          sequenceNumber: explicitSequence,
          year: data.year,
          assigneeId: data.assigneeId,
        });
      }
    }
  }

  /**
   * @throws {CaseNotFoundError}
   * @throws {CaseNumberTakenError}
   * @throws {SequenceNumberTakenError}
   * @throws {AssigneeNotFoundError}
   */
  async update(id: string, year: number, data: UpdateCaseData): Promise<CaseDetailRecord> {
    try {
      return await this.prisma.case.update({ where: { id }, data, include: detailInclude });
    } catch (error) {
      throw await this.mapWriteError(error, {
        id,
        caseNumber: data.caseNumber,
        sequenceNumber: data.sequenceNumber,
        year,
        assigneeId: data.assigneeId ?? undefined,
      });
    }
  }

  /**
   * Moves a case to a new status and appends to its history, atomically.
   *
   * @throws {CaseNotFoundError}
   * @throws {CaseStatusChangedError} when the case is no longer in `fromStatus`.
   */
  async changeStatus(id: string, change: CaseStatusChangeData): Promise<CaseDetailRecord> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.applyStatusChange(tx, id, change);
        return tx.case.findUniqueOrThrow({ where: { id }, include: detailInclude });
      });
    } catch (error) {
      if (isKnownError(error, 'P2025')) {
        throw (await this.exists(id)) ? new CaseStatusChangedError(id) : new CaseNotFoundError(id);
      }
      throw error;
    }
  }

  /**
   * Replaces the departments asked about a case. Departments already on the
   * list keep their request and reply dates.
   *
   * @throws {CaseNotFoundError}
   * @throws {DepartmentNotFoundError} when an id does not match a department.
   * @throws {CaseStatusChangedError} when `statusChange` no longer applies.
   */
  async setDepartments(id: string, data: SetCaseDepartmentsData): Promise<CaseDetailRecord> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.caseDepartment.deleteMany({ where: { caseId: id, departmentId: { notIn: data.departmentIds } } });
        await tx.caseDepartment.createMany({
          data: data.departmentIds.map((departmentId) => ({ caseId: id, departmentId, requestedAt: data.requestedAt })),
          skipDuplicates: true,
        });
        if (data.statusChange) {
          await this.applyStatusChange(tx, id, data.statusChange);
        }
        return tx.case.findUniqueOrThrow({ where: { id }, include: detailInclude });
      });
    } catch (error) {
      if (isKnownError(error, 'P2003')) {
        throw (await this.exists(id)) ? new DepartmentNotFoundError() : new CaseNotFoundError(id);
      }
      if (isKnownError(error, 'P2025')) {
        throw (await this.exists(id)) ? new CaseStatusChangedError(id) : new CaseNotFoundError(id);
      }
      throw error;
    }
  }

  /** @throws {CaseDepartmentNotFoundError} when the department is not on the case. */
  async setDepartmentAnsweredAt(
    caseId: string,
    departmentId: string,
    answeredAt: Date | null,
  ): Promise<CaseDetailRecord> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.caseDepartment.update({
          where: { caseId_departmentId: { caseId, departmentId } },
          data: { answeredAt },
        });
        return tx.case.findUniqueOrThrow({ where: { id: caseId }, include: detailInclude });
      });
    } catch (error) {
      if (isKnownError(error, 'P2025')) {
        throw new CaseDepartmentNotFoundError(caseId, departmentId);
      }
      throw error;
    }
  }

  /** @throws {CaseNotFoundError} */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.case.delete({ where: { id } });
    } catch (error) {
      throw await this.mapWriteError(error, { id });
    }
  }

  async findMany(filter: CaseListFilter): Promise<CaseListResult> {
    const where: Prisma.CaseWhereInput = {
      year: filter.year,
      status: filter.statuses?.length ? { in: filter.statuses } : undefined,
      extendedDueAt: filter.extended === undefined ? undefined : filter.extended ? { not: null } : null,
      assigneeId: filter.assigneeId,
      ...(filter.search && {
        OR: [
          { caseNumber: { contains: filter.search, mode: 'insensitive' } },
          { subject: { contains: filter.search, mode: 'insensitive' } },
          { requestText: { contains: filter.search, mode: 'insensitive' } },
          { requesterName: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.case.findMany({
        where,
        include: summaryInclude,
        orderBy: CASE_ORDER[filter.sort],
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

  /** Throws P2025 when the case is missing or no longer in `fromStatus`. */
  private async applyStatusChange(tx: Prisma.TransactionClient, id: string, change: CaseStatusChangeData) {
    await tx.case.update({
      where: { id, status: change.fromStatus },
      data: { ...change.fields, status: change.toStatus },
    });
    await tx.caseStatusChange.create({
      data: {
        caseId: id,
        fromStatus: change.fromStatus,
        toStatus: change.toStatus,
        comment: change.comment,
        changedById: change.changedById,
      },
    });
  }

  private async nextSequenceNumber(tx: Prisma.TransactionClient, year: number): Promise<number> {
    const { _max } = await tx.case.aggregate({ where: { year }, _max: { sequenceNumber: true } });
    return (_max.sequenceNumber ?? 0) + 1;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.prisma.case.findUnique({ where: { id }, select: { id: true } })) !== null;
  }

  /** @param exceptId A case to ignore, e.g. the one being renumbered. */
  async caseNumberExists(caseNumber: string, exceptId?: string): Promise<boolean> {
    const found = await this.prisma.case.findUnique({ where: { caseNumber }, select: { id: true } });
    return found !== null && found.id !== exceptId;
  }

  /** Translates Prisma constraint errors into domain errors; returns other errors unchanged. */
  private async mapWriteError(
    error: unknown,
    context: { id?: string; caseNumber?: string; sequenceNumber?: number; year?: number; assigneeId?: string },
  ): Promise<unknown> {
    if (isKnownError(error, 'P2025') && context.id) {
      return new CaseNotFoundError(context.id);
    }
    if (isKnownError(error, 'P2003')) {
      return new AssigneeNotFoundError(context.assigneeId ?? '');
    }
    if (isKnownError(error, 'P2002')) {
      // The constraint name in `meta` differs between drivers, so check which one clashed.
      if (context.caseNumber && (await this.caseNumberExists(context.caseNumber, context.id))) {
        return new CaseNumberTakenError(context.caseNumber);
      }
      if (context.sequenceNumber !== undefined && context.year !== undefined) {
        return new SequenceNumberTakenError(context.sequenceNumber, context.year);
      }
    }
    return error;
  }
}
