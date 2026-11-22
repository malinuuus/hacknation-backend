import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { KnowledgeCategory, KnowledgeIndexStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { KnowledgeDocumentNotFoundError } from './errors/knowledge-document-not-found.error.js';
import { toVectorLiteral } from './helpers/vector.helper.js';
import type { IndexedChunk } from './interfaces/indexed-chunk.interface.js';
import type { KnowledgeChunkMatch } from './interfaces/knowledge-chunk-match.interface.js';
import type { KnowledgeListFilter } from './interfaces/knowledge-list-filter.interface.js';
import type { NewKnowledgeDocumentData } from './interfaces/new-knowledge-document-data.interface.js';

const knowledgeDocumentInclude = {
  uploadedBy: { select: { id: true, email: true } },
} satisfies Prisma.KnowledgeDocumentInclude;

/** Lists leave out the (possibly long) extracted text. */
const knowledgeDocumentSummaryArgs = {
  omit: { extractedText: true },
  include: knowledgeDocumentInclude,
} satisfies Prisma.KnowledgeDocumentDefaultArgs;

export type KnowledgeDocumentRecord = Prisma.KnowledgeDocumentGetPayload<typeof knowledgeDocumentSummaryArgs>;
export type KnowledgeDocumentDetailRecord = Prisma.KnowledgeDocumentGetPayload<{
  include: typeof knowledgeDocumentInclude;
}>;

interface ChunkRow {
  chunkId: string;
  documentId: string;
  documentName: string;
  category: KnowledgeCategory;
  position: number;
  content: string;
  score: number;
}

const isKnownError = (error: unknown, code: string): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

/**
 * Knowledge documents through Prisma, their chunks through raw SQL, since
 * Prisma cannot read or write pgvector columns.
 */
@Injectable()
export class KnowledgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: NewKnowledgeDocumentData): Promise<KnowledgeDocumentRecord> {
    const { chunks, ...document } = data;
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.knowledgeDocument.create({
        data: { ...document, chunkCount: chunks.length },
        ...knowledgeDocumentSummaryArgs,
      });
      await this.insertChunks(tx, created.id, chunks);
      return created;
    });
  }

  /**
   * Replaces the chunks of a document and records the indexing result.
   *
   * @throws {KnowledgeDocumentNotFoundError}
   */
  async replaceChunks(
    id: string,
    status: KnowledgeIndexStatus,
    chunks: IndexedChunk[],
  ): Promise<KnowledgeDocumentRecord> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.knowledgeChunk.deleteMany({ where: { documentId: id } });
        await this.insertChunks(tx, id, chunks);
        return tx.knowledgeDocument.update({
          where: { id },
          data: { indexStatus: status, chunkCount: chunks.length },
          ...knowledgeDocumentSummaryArgs,
        });
      });
    } catch (error) {
      if (isKnownError(error, 'P2025') || isKnownError(error, 'P2003')) {
        throw new KnowledgeDocumentNotFoundError(id);
      }
      throw error;
    }
  }

  /** @throws {KnowledgeDocumentNotFoundError} */
  async update(id: string, data: Prisma.KnowledgeDocumentUpdateInput): Promise<KnowledgeDocumentRecord> {
    try {
      return await this.prisma.knowledgeDocument.update({ where: { id }, data, ...knowledgeDocumentSummaryArgs });
    } catch (error) {
      if (isKnownError(error, 'P2025')) {
        throw new KnowledgeDocumentNotFoundError(id);
      }
      throw error;
    }
  }

  /**
   * Deletes the document with its chunks and returns its storage key, so the caller can remove the file.
   *
   * @throws {KnowledgeDocumentNotFoundError}
   */
  async delete(id: string): Promise<string> {
    try {
      const deleted = await this.prisma.knowledgeDocument.delete({ where: { id }, select: { storageKey: true } });
      return deleted.storageKey;
    } catch (error) {
      if (isKnownError(error, 'P2025')) {
        throw new KnowledgeDocumentNotFoundError(id);
      }
      throw error;
    }
  }

  async findMany(filter: KnowledgeListFilter): Promise<{ items: KnowledgeDocumentRecord[]; total: number }> {
    const where: Prisma.KnowledgeDocumentWhereInput = {
      category: filter.category,
      ...(filter.search && {
        OR: [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
          { originalName: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.knowledgeDocument.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: filter.offset,
        take: filter.limit,
        ...knowledgeDocumentSummaryArgs,
      }),
      this.prisma.knowledgeDocument.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string): Promise<KnowledgeDocumentDetailRecord | null> {
    return this.prisma.knowledgeDocument.findUnique({ where: { id }, include: knowledgeDocumentInclude });
  }

  /** Fragments nearest to the query embedding by cosine distance (exact scan). */
  async searchChunks(
    queryEmbedding: number[],
    k: number,
    categories: KnowledgeCategory[] = [],
  ): Promise<KnowledgeChunkMatch[]> {
    const vector = toVectorLiteral(queryEmbedding);
    const categoryFilter =
      categories.length > 0 ? Prisma.sql`WHERE d.category::text = ANY(${categories}::text[])` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<ChunkRow[]>`
      SELECT c.id AS "chunkId",
             c.document_id AS "documentId",
             d.name AS "documentName",
             d.category::text AS "category",
             c.position AS "position",
             c.content AS "content",
             (1 - (c.embedding <=> ${vector}::vector))::float8 AS "score"
      FROM knowledge_chunks c
      JOIN knowledge_documents d ON d.id = c.document_id
      ${categoryFilter}
      ORDER BY c.embedding <=> ${vector}::vector
      LIMIT ${k}
    `;
    return rows.map((row) => ({ ...row, score: Number(row.score) }));
  }

  private async insertChunks(tx: Prisma.TransactionClient, documentId: string, chunks: IndexedChunk[]): Promise<void> {
    if (chunks.length === 0) {
      return;
    }
    const positions = chunks.map((_, index) => index);
    const contents = chunks.map((chunk) => chunk.content);
    const embeddings = chunks.map((chunk) => toVectorLiteral(chunk.embedding));

    await tx.$executeRaw`
      INSERT INTO knowledge_chunks (id, document_id, position, content, embedding)
      SELECT gen_random_uuid(), ${documentId}::uuid, t.position, t.content, t.embedding::vector
      FROM unnest(${positions}::int[], ${contents}::text[], ${embeddings}::text[]) AS t(position, content, embedding)
    `;
  }
}
