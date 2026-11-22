import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CaseDocumentNotFoundError } from './errors/case-document-not-found.error.js';
import { CaseNotFoundError } from './errors/case-not-found.error.js';
import type { CaseDocumentKind } from '../generated/prisma/enums.js';
import type { CreateCaseDocumentData } from './interfaces/create-case-document-data.interface.js';

export const caseDocumentInclude = {
  department: { select: { id: true, symbol: true, name: true } },
  uploadedBy: { select: { id: true, email: true } },
} satisfies Prisma.CaseDocumentInclude;

/** Lists leave out the (possibly long) extracted text. */
export const caseDocumentSummaryArgs = {
  omit: { extractedText: true },
  include: caseDocumentInclude,
} satisfies Prisma.CaseDocumentDefaultArgs;

export type CaseDocumentRecord = Prisma.CaseDocumentGetPayload<typeof caseDocumentSummaryArgs>;
export type CaseDocumentDetailRecord = Prisma.CaseDocumentGetPayload<{ include: typeof caseDocumentInclude }>;

@Injectable()
export class CaseDocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @throws {CaseNotFoundError} */
  async create(data: CreateCaseDocumentData): Promise<CaseDocumentRecord> {
    const { departmentAnsweredAt, ...document } = data;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.caseDocument.create({ data: document, ...caseDocumentSummaryArgs });
        if (departmentAnsweredAt && document.departmentId) {
          await tx.caseDepartment.updateMany({
            where: { caseId: document.caseId, departmentId: document.departmentId, answeredAt: null },
            data: { answeredAt: departmentAnsweredAt },
          });
        }
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new CaseNotFoundError(data.caseId);
      }
      throw error;
    }
  }

  findByCase(caseId: string): Promise<CaseDocumentRecord[]> {
    return this.prisma.caseDocument.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
      ...caseDocumentSummaryArgs,
    });
  }

  findOne(caseId: string, documentId: string): Promise<CaseDocumentDetailRecord | null> {
    return this.prisma.caseDocument.findFirst({
      where: { id: documentId, caseId },
      include: caseDocumentInclude,
    });
  }

  /**
   * Deletes the record and returns its storage key, so the caller can remove the file.
   *
   * @throws {CaseDocumentNotFoundError}
   */
  async delete(caseId: string, documentId: string): Promise<string> {
    const { count, storageKey } = await this.prisma.$transaction(async (tx) => {
      const found = await tx.caseDocument.findFirst({
        where: { id: documentId, caseId },
        select: { storageKey: true },
      });
      if (!found) {
        return { count: 0, storageKey: '' };
      }
      const deleted = await tx.caseDocument.deleteMany({ where: { id: documentId, caseId } });
      return { count: deleted.count, storageKey: found.storageKey };
    });

    if (count === 0) {
      throw new CaseDocumentNotFoundError(caseId, documentId);
    }
    return storageKey;
  }

  /** Documents of a kind with their text, e.g. department replies for drafting the response. */
  findWithTextByCase(caseId: string, kind: CaseDocumentKind): Promise<CaseDocumentDetailRecord[]> {
    return this.prisma.caseDocument.findMany({
      where: { caseId, kind, extractedText: { not: null } },
      orderBy: { createdAt: 'asc' },
      include: caseDocumentInclude,
    });
  }

  async findStorageKeysByCase(caseId: string): Promise<string[]> {
    const rows = await this.prisma.caseDocument.findMany({ where: { caseId }, select: { storageKey: true } });
    return rows.map((row) => row.storageKey);
  }
}
