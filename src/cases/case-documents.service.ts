import { BadRequestException, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { CaseDocumentKind } from '../generated/prisma/enums.js';
import { StoredFileNotFoundError } from '../storage/errors/stored-file-not-found.error.js';
import { FileStorageService } from '../storage/file-storage.service.js';
import { detectDocumentFileType, mimeTypeOf } from '../text-extraction/helpers/file-type.helper.js';
import { TextExtractionService } from '../text-extraction/text-extraction.service.js';
import { CaseDocumentsRepository } from './case-documents.repository.js';
import { CasesRepository } from './cases.repository.js';
import type { CaseDocumentDetailDto, CaseDocumentDto } from './dto/case-document-response.dto.js';
import type { UploadCaseDocumentDto } from './dto/upload-case-document.dto.js';
import { CaseDocumentNotFoundError } from './errors/case-document-not-found.error.js';
import { CaseNotFoundError } from './errors/case-not-found.error.js';
import { todayInOfficeTimeZone } from './helpers/date-only.helper.js';
import { normalizeUploadFileName } from './helpers/file-name.helper.js';
import type { DocumentDownload } from './interfaces/document-download.interface.js';
import type { NewCaseDocumentData } from './interfaces/new-case-document-data.interface.js';
import type { ProcessedUpload } from './interfaces/processed-upload.interface.js';
import { toCaseDocumentDetailDto, toCaseDocumentDto } from './mappers/case-document.mapper.js';

@Injectable()
export class CaseDocumentsService {
  constructor(
    private readonly documentsRepository: CaseDocumentsRepository,
    private readonly casesRepository: CasesRepository,
    private readonly storage: FileStorageService,
    private readonly textExtraction: TextExtractionService,
  ) {}

  /**
   * Validates an uploaded file by its content, reads its text and stores it.
   * Callers must `discard` the result if they fail to save the record.
   */
  async processUpload(file: Express.Multer.File | undefined): Promise<ProcessedUpload> {
    if (!file || file.size === 0) {
      throw new BadRequestException('A non-empty file is required');
    }

    const originalName = normalizeUploadFileName(file.originalname);
    const type = detectDocumentFileType(file.buffer, originalName);
    if (!type) {
      throw new UnsupportedMediaTypeException('Only PDF, DOCX and DOC files are accepted');
    }

    const extraction = await this.textExtraction.extract(file.buffer, type);
    const stored = await this.storage.save(file.buffer);
    return { originalName, mimeType: mimeTypeOf(type), stored, extraction };
  }

  async discard(upload: ProcessedUpload): Promise<void> {
    await this.storage.delete(upload.stored.storageKey);
  }

  toDocumentData(
    upload: ProcessedUpload,
    kind: CaseDocumentKind,
    user: AuthUser,
    departmentId?: string,
  ): NewCaseDocumentData {
    return {
      kind,
      departmentId,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      sizeBytes: upload.stored.sizeBytes,
      sha256: upload.stored.sha256,
      storageKey: upload.stored.storageKey,
      extractedText: upload.extraction.text,
      textExtractionStatus: upload.extraction.status,
      uploadedById: user.id,
    };
  }

  async upload(
    caseId: string,
    file: Express.Multer.File | undefined,
    dto: UploadCaseDocumentDto,
    user: AuthUser,
  ): Promise<CaseDocumentDto> {
    const existing = await this.casesRepository.findById(caseId);
    if (!existing) {
      throw new NotFoundException(`Case "${caseId}" not found`);
    }
    if (dto.departmentId) {
      if (dto.kind !== CaseDocumentKind.DEPARTMENT_RESPONSE) {
        throw new BadRequestException('departmentId can only be set for DEPARTMENT_RESPONSE documents');
      }
      if (!existing.departments.some((link) => link.departmentId === dto.departmentId)) {
        throw new BadRequestException('The department was not asked about this case; add it to the case first');
      }
    }

    const upload = await this.processUpload(file);
    try {
      const created = await this.documentsRepository.create({
        ...this.toDocumentData(upload, dto.kind, user, dto.departmentId),
        caseId,
        departmentAnsweredAt: dto.departmentId ? todayInOfficeTimeZone() : undefined,
      });
      return toCaseDocumentDto(created);
    } catch (error) {
      await this.discard(upload);
      if (error instanceof CaseNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  async list(caseId: string): Promise<CaseDocumentDto[]> {
    if (!(await this.casesRepository.exists(caseId))) {
      throw new NotFoundException(`Case "${caseId}" not found`);
    }
    return (await this.documentsRepository.findByCase(caseId)).map(toCaseDocumentDto);
  }

  async get(caseId: string, documentId: string): Promise<CaseDocumentDetailDto> {
    const found = await this.documentsRepository.findOne(caseId, documentId);
    if (!found) {
      throw new NotFoundException(new CaseDocumentNotFoundError(caseId, documentId).message);
    }
    return toCaseDocumentDetailDto(found);
  }

  async download(caseId: string, documentId: string): Promise<DocumentDownload> {
    const found = await this.documentsRepository.findOne(caseId, documentId);
    if (!found) {
      throw new NotFoundException(new CaseDocumentNotFoundError(caseId, documentId).message);
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

  async delete(caseId: string, documentId: string): Promise<void> {
    let storageKey: string;
    try {
      storageKey = await this.documentsRepository.delete(caseId, documentId);
    } catch (error) {
      if (error instanceof CaseDocumentNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
    await this.storage.delete(storageKey);
  }
}
