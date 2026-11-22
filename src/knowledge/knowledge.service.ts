import { BadRequestException, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { toAiHttpError } from '../ai/helpers/ai-http-error.helper.js';
import { AiNotConfiguredError } from '../ai/errors/ai-not-configured.error.js';
import { LlmService } from '../ai/llm.service.js';
import { normalizeUploadFileName } from '../cases/helpers/file-name.helper.js';
import { StoredFileNotFoundError } from '../storage/errors/stored-file-not-found.error.js';
import { FileStorageService } from '../storage/file-storage.service.js';
import { detectKnowledgeFileType, mimeTypeOf } from '../text-extraction/helpers/file-type.helper.js';
import { TextExtractionService } from '../text-extraction/text-extraction.service.js';
import type { CreateKnowledgeDocumentDto } from './dto/create-knowledge-document.dto.js';
import type {
  KnowledgeDocumentDetailDto,
  KnowledgeDocumentDto,
  KnowledgeDocumentListResponseDto,
} from './dto/knowledge-document-response.dto.js';
import type { ListKnowledgeQueryDto } from './dto/list-knowledge-query.dto.js';
import type { KnowledgeSearchResponseDto, SearchKnowledgeDto } from './dto/search-knowledge.dto.js';
import type { UpdateKnowledgeDocumentDto } from './dto/update-knowledge-document.dto.js';
import { KnowledgeDocumentNotFoundError } from './errors/knowledge-document-not-found.error.js';
import type { KnowledgeDownload } from './interfaces/knowledge-download.interface.js';
import { KnowledgeIndexer } from './knowledge-indexer.service.js';
import { KnowledgeRetriever } from './knowledge-retriever.service.js';
import { KnowledgeRepository } from './knowledge.repository.js';
import { toKnowledgeDocumentDetailDto, toKnowledgeDocumentDto } from './mappers/knowledge-document.mapper.js';

/**
 * The knowledge base: reference files (law, past responses, guidelines) whose
 * text is split, embedded and searched to give the AI context.
 */
@Injectable()
export class KnowledgeService {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly indexer: KnowledgeIndexer,
    private readonly retriever: KnowledgeRetriever,
    private readonly storage: FileStorageService,
    private readonly textExtraction: TextExtractionService,
    private readonly llm: LlmService,
  ) {}

  /** Stores the file, reads its text and indexes it right away (when AI is configured). */
  async create(
    file: Express.Multer.File | undefined,
    dto: CreateKnowledgeDocumentDto,
    user: AuthUser,
  ): Promise<KnowledgeDocumentDto> {
    if (!file || file.size === 0) {
      throw new BadRequestException('A non-empty file is required');
    }
    const originalName = normalizeUploadFileName(file.originalname);
    const type = detectKnowledgeFileType(file.buffer, originalName);
    if (!type) {
      throw new UnsupportedMediaTypeException('Only PDF, DOCX, DOC and TXT files are accepted');
    }

    const extraction = await this.textExtraction.extract(file.buffer, type);
    const indexing = await this.indexer.index(extraction.text);
    const stored = await this.storage.save(file.buffer);
    try {
      const created = await this.repository.create({
        name: dto.name,
        category: dto.category,
        description: dto.description,
        originalName,
        mimeType: mimeTypeOf(type),
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
        storageKey: stored.storageKey,
        extractedText: extraction.text,
        textExtractionStatus: extraction.status,
        indexStatus: indexing.status,
        chunks: indexing.chunks,
        uploadedById: user.id,
      });
      return toKnowledgeDocumentDto(created);
    } catch (error) {
      await this.storage.delete(stored.storageKey);
      throw error;
    }
  }

  async list(query: ListKnowledgeQueryDto): Promise<KnowledgeDocumentListResponseDto> {
    const { items, total } = await this.repository.findMany({
      search: query.q,
      category: query.category,
      limit: query.limit,
      offset: query.offset,
    });
    return { items: items.map(toKnowledgeDocumentDto), total };
  }

  async get(id: string): Promise<KnowledgeDocumentDetailDto> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundException(new KnowledgeDocumentNotFoundError(id).message);
    }
    return toKnowledgeDocumentDetailDto(found);
  }

  async update(id: string, dto: UpdateKnowledgeDocumentDto): Promise<KnowledgeDocumentDto> {
    try {
      return toKnowledgeDocumentDto(
        await this.repository.update(id, { name: dto.name, category: dto.category, description: dto.description }),
      );
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  /** Splits and embeds the stored text again, e.g. after adding the API key or a failed attempt. */
  async reindex(id: string): Promise<KnowledgeDocumentDto> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundException(new KnowledgeDocumentNotFoundError(id).message);
    }
    if (found.extractedText && !this.llm.isConfigured()) {
      throw toAiHttpError(new AiNotConfiguredError());
    }

    const indexing = await this.indexer.index(found.extractedText);
    try {
      return toKnowledgeDocumentDto(await this.repository.replaceChunks(id, indexing.status, indexing.chunks));
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  async download(id: string): Promise<KnowledgeDownload> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundException(new KnowledgeDocumentNotFoundError(id).message);
    }
    try {
      return {
        stream: await this.storage.openReadStream(found.storageKey),
        fileName: found.originalName,
        mimeType: found.mimeType,
        sizeBytes: found.sizeBytes,
      };
    } catch (error) {
      if (error instanceof StoredFileNotFoundError) {
        throw new NotFoundException('The file is missing from storage');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    let storageKey: string;
    try {
      storageKey = await this.repository.delete(id);
    } catch (error) {
      throw this.toHttpError(error);
    }
    await this.storage.delete(storageKey);
  }

  /** What the AI would get as context for this query; for checking the knowledge base. */
  async search(dto: SearchKnowledgeDto): Promise<KnowledgeSearchResponseDto> {
    try {
      return { matches: await this.retriever.search(dto.query, { k: dto.k, categories: dto.categories }) };
    } catch (error) {
      throw toAiHttpError(error);
    }
  }

  private toHttpError(error: unknown): unknown {
    if (error instanceof KnowledgeDocumentNotFoundError) {
      return new NotFoundException(error.message);
    }
    return error;
  }
}
