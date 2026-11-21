import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import type { EnvironmentVariables } from '../config/environment/environment-variables.validation.js';
import { CaseDocumentKind, CaseStatus } from '../generated/prisma/enums.js';
import { FileStorageService } from '../storage/file-storage.service.js';
import { CaseDocumentsRepository } from './case-documents.repository.js';
import { CaseDocumentsService } from './case-documents.service.js';
import { type CaseDetailRecord, CasesRepository } from './cases.repository.js';
import type { CaseDetailDto, CaseListResponseDto, CaseYearsResponseDto } from './dto/case-response.dto.js';
import type { ChangeCaseStatusDto } from './dto/change-case-status.dto.js';
import type { CreateCaseDto } from './dto/create-case.dto.js';
import type { ExtendDeadlineDto } from './dto/extend-deadline.dto.js';
import type { ListCasesQueryDto } from './dto/list-cases-query.dto.js';
import type { SetCaseDepartmentsDto } from './dto/set-case-departments.dto.js';
import type { UpdateCaseDepartmentDto } from './dto/update-case-department.dto.js';
import type { UpdateCaseDto } from './dto/update-case.dto.js';
import { AssigneeNotFoundError } from './errors/assignee-not-found.error.js';
import { CaseDepartmentNotFoundError } from './errors/case-department-not-found.error.js';
import { CaseNotFoundError } from './errors/case-not-found.error.js';
import { CaseNumberTakenError } from './errors/case-number-taken.error.js';
import { CaseStatusChangedError } from './errors/case-status-changed.error.js';
import { DepartmentNotFoundError } from './errors/department-not-found.error.js';
import { SequenceNumberTakenError } from './errors/sequence-number-taken.error.js';
import { formatCaseNumber, sequenceNumberFromCaseNumber } from './helpers/case-number.helper.js';
import { allowedTransitions, canChangeDeadline, canTransition } from './helpers/case-status.helper.js';
import { formatDateOnly, parseDateOnly, todayInOfficeTimeZone } from './helpers/date-only.helper.js';
import { computeDueDate, maxExtendedDueDate } from './helpers/deadline.helper.js';
import type { CaseStatusChangeData } from './interfaces/case-status-change-data.interface.js';
import type { UpdateCaseData } from './interfaces/update-case-data.interface.js';
import { toCaseDetailDto, toCaseSummaryDto } from './mappers/case.mapper.js';

@Injectable()
export class CasesService {
  private readonly caseNumberPrefix: string;

  constructor(
    private readonly casesRepository: CasesRepository,
    private readonly documentsRepository: CaseDocumentsRepository,
    private readonly documentsService: CaseDocumentsService,
    private readonly storage: FileStorageService,
    config: ConfigService,
  ) {
    this.caseNumberPrefix = config.getOrThrow<EnvironmentVariables['CASE_NUMBER_PREFIX']>('CASE_NUMBER_PREFIX');
  }

  /**
   * Registers a request with the data confirmed by the official (brief, step 5).
   *
   * @param file The request file, attached in the same transaction as the case.
   *   Without `requestText`, the text read from it is used.
   */
  async create(dto: CreateCaseDto, user: AuthUser, file?: Express.Multer.File): Promise<CaseDetailDto> {
    const today = todayInOfficeTimeZone();
    const receivedAt = this.parseReceivedAt(dto.receivedAt, today);
    const year = receivedAt.getUTCFullYear();
    const dueAt = computeDueDate(receivedAt);

    const upload = file ? await this.documentsService.processUpload(file) : undefined;
    try {
      const created = await this.casesRepository.create({
        year,
        // Keep the register's ordinal number in step with the sequence in an explicit case sign.
        sequenceNumber: dto.caseNumber ? sequenceNumberFromCaseNumber(dto.caseNumber, year) : undefined,
        caseNumber:
          dto.caseNumber ?? ((sequenceNumber) => formatCaseNumber(this.caseNumberPrefix, sequenceNumber, year)),
        subject: dto.subject,
        requestText: dto.requestText ?? upload?.extraction.text ?? undefined,
        receivedAt,
        dueAt,
        effectiveDueAt: dueAt,
        handlerInitials: dto.handlerInitials,
        assigneeId: dto.assigneeId,
        requesterName: dto.requesterName,
        requesterEmail: dto.requesterEmail,
        requesterAddress: dto.requesterAddress,
        notes: dto.notes,
        createdById: user.id,
        document: upload && this.documentsService.toDocumentData(upload, CaseDocumentKind.REQUEST, user),
      });
      return toCaseDetailDto(created, today);
    } catch (error) {
      if (upload) {
        await this.documentsService.discard(upload);
      }
      throw this.toHttpError(error);
    }
  }

  async list(query: ListCasesQueryDto): Promise<CaseListResponseDto> {
    const today = todayInOfficeTimeZone();
    const { items, total } = await this.casesRepository.findMany({
      year: query.year ?? today.getUTCFullYear(),
      statuses: query.status,
      extended: query.extended,
      assigneeId: query.assigneeId,
      search: query.q,
      sort: query.sort,
      limit: query.limit,
      offset: query.offset,
    });

    return { items: items.map((item) => toCaseSummaryDto(item, today)), total };
  }

  async getById(id: string): Promise<CaseDetailDto> {
    return toCaseDetailDto(await this.findOrThrow(id), todayInOfficeTimeZone());
  }

  async getYears(): Promise<CaseYearsResponseDto> {
    const currentYear = todayInOfficeTimeZone().getUTCFullYear();
    const years = new Set([currentYear, ...(await this.casesRepository.findYears())]);
    return { years: [...years].sort((a, b) => b - a) };
  }

  /**
   * Edits case data. A new receipt date recomputes the statutory deadline; the
   * case must stay in the same year, since the year is part of its number.
   */
  async update(id: string, dto: UpdateCaseDto): Promise<CaseDetailDto> {
    const today = todayInOfficeTimeZone();
    const existing = await this.findOrThrow(id);

    for (const field of ['subject', 'receivedAt', 'caseNumber'] as const) {
      if (dto[field] === null) {
        throw new BadRequestException(`${field} cannot be cleared`);
      }
    }

    const data: UpdateCaseData = {
      subject: dto.subject,
      requestText: dto.requestText,
      handlerInitials: dto.handlerInitials,
      assigneeId: dto.assigneeId,
      requesterName: dto.requesterName,
      requesterEmail: dto.requesterEmail,
      requesterAddress: dto.requesterAddress,
      notes: dto.notes,
    };

    if (dto.receivedAt !== undefined) {
      const receivedAt = this.parseReceivedAt(dto.receivedAt, today);
      if (receivedAt.getUTCFullYear() !== existing.year) {
        throw new BadRequestException(
          `receivedAt must stay in ${existing.year}; register the request again to move it to another year`,
        );
      }
      data.receivedAt = receivedAt;
      data.dueAt = computeDueDate(receivedAt);
      if (existing.extendedDueAt) {
        this.assertValidExtension(existing.extendedDueAt, receivedAt, data.dueAt);
      }
      data.effectiveDueAt = existing.extendedDueAt ?? data.dueAt;
    }

    if (dto.caseNumber !== undefined && dto.caseNumber !== existing.caseNumber) {
      data.caseNumber = dto.caseNumber;
      data.sequenceNumber = sequenceNumberFromCaseNumber(dto.caseNumber, existing.year);
    }

    try {
      return toCaseDetailDto(await this.casesRepository.update(id, existing.year, data), today);
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  async changeStatus(id: string, dto: ChangeCaseStatusDto, user: AuthUser): Promise<CaseDetailDto> {
    const today = todayInOfficeTimeZone();
    const existing = await this.findOrThrow(id);
    this.assertTransition(existing.status, dto.status);

    if (dto.respondedAt !== undefined && dto.status !== CaseStatus.RESPONSE_SENT) {
      throw new BadRequestException('respondedAt can only be set together with RESPONSE_SENT');
    }

    const fields: CaseStatusChangeData['fields'] = {};
    if (dto.status === CaseStatus.RESPONSE_SENT) {
      const respondedAt = dto.respondedAt ? this.parseDate(dto.respondedAt, 'respondedAt') : today;
      if (respondedAt > today || respondedAt < existing.receivedAt) {
        throw new BadRequestException('respondedAt must be between the receipt date and today');
      }
      fields.respondedAt = respondedAt;
    } else if (existing.status === CaseStatus.RESPONSE_SENT) {
      fields.respondedAt = null; // reopened
    }

    return this.applyStatusChange(id, today, {
      fromStatus: existing.status,
      toStatus: dto.status,
      changedById: user.id,
      comment: dto.comment,
      fields,
    });
  }

  /**
   * Kwerenda: extends the deadline (art. 13 ust. 2 UDIP), or changes an
   * existing extension. The status stays; the history records the change.
   */
  async extendDeadline(id: string, dto: ExtendDeadlineDto, user: AuthUser): Promise<CaseDetailDto> {
    const today = todayInOfficeTimeZone();
    const existing = await this.findOrThrow(id);
    this.assertDeadlineChangeable(existing.status);

    const extendedDueAt = this.parseDate(dto.extendedDueAt, 'extendedDueAt');
    this.assertValidExtension(extendedDueAt, existing.receivedAt, existing.dueAt);

    return this.applyStatusChange(id, today, {
      fromStatus: existing.status,
      toStatus: existing.status,
      changedById: user.id,
      comment: `Termin przedłużony do ${formatDateOnly(extendedDueAt)}: ${dto.reason}`,
      fields: { extendedDueAt, extensionReason: dto.reason, effectiveDueAt: extendedDueAt },
    });
  }

  /** Withdraws an extension set by mistake; the statutory deadline applies again. */
  async cancelExtension(id: string, user: AuthUser): Promise<CaseDetailDto> {
    const today = todayInOfficeTimeZone();
    const existing = await this.findOrThrow(id);
    if (!existing.extendedDueAt) {
      throw new ConflictException('The deadline of this case is not extended');
    }
    this.assertDeadlineChangeable(existing.status);

    return this.applyStatusChange(id, today, {
      fromStatus: existing.status,
      toStatus: existing.status,
      changedById: user.id,
      comment: `Cofnięto przedłużenie terminu; obowiązuje termin ${formatDateOnly(existing.dueAt)}`,
      fields: { extendedDueAt: null, extensionReason: null, effectiveDueAt: existing.dueAt },
    });
  }

  /**
   * Sets the departments asked for information. The first assignment moves a
   * NEW case to SENT_TO_DEPARTMENTS (brief, step 11b).
   */
  async setDepartments(id: string, dto: SetCaseDepartmentsDto, user: AuthUser): Promise<CaseDetailDto> {
    const today = todayInOfficeTimeZone();
    const existing = await this.findOrThrow(id);

    const statusChange: CaseStatusChangeData | undefined =
      existing.status === CaseStatus.NEW && dto.departmentIds.length > 0
        ? {
            fromStatus: CaseStatus.NEW,
            toStatus: CaseStatus.SENT_TO_DEPARTMENTS,
            changedById: user.id,
            comment: 'Wysłano zapytania do wydziałów',
          }
        : undefined;

    try {
      const updated = await this.casesRepository.setDepartments(id, {
        departmentIds: dto.departmentIds,
        requestedAt: today,
        statusChange,
      });
      return toCaseDetailDto(updated, today);
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  async updateDepartment(id: string, departmentId: string, dto: UpdateCaseDepartmentDto): Promise<CaseDetailDto> {
    const today = todayInOfficeTimeZone();
    const existing = await this.findOrThrow(id);

    let answeredAt: Date | null = null;
    if (dto.answeredAt !== null) {
      answeredAt = this.parseDate(dto.answeredAt, 'answeredAt');
      if (answeredAt > today || answeredAt < existing.receivedAt) {
        throw new BadRequestException('answeredAt must be between the receipt date and today');
      }
    }

    try {
      return toCaseDetailDto(await this.casesRepository.setDepartmentAnsweredAt(id, departmentId, answeredAt), today);
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  /** Deletes the case with its history and files. */
  async delete(id: string): Promise<void> {
    const storageKeys = await this.documentsRepository.findStorageKeysByCase(id);
    try {
      await this.casesRepository.delete(id);
    } catch (error) {
      throw this.toHttpError(error);
    }
    await this.storage.deleteMany(storageKeys);
  }

  private async applyStatusChange(id: string, today: Date, change: CaseStatusChangeData): Promise<CaseDetailDto> {
    try {
      return toCaseDetailDto(await this.casesRepository.changeStatus(id, change), today);
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  private async findOrThrow(id: string): Promise<CaseDetailRecord> {
    const found = await this.casesRepository.findById(id);
    if (!found) {
      throw new NotFoundException(`Case "${id}" not found`);
    }
    return found;
  }

  private assertTransition(from: CaseStatus, to: CaseStatus): void {
    if (!canTransition(from, to)) {
      const allowed = allowedTransitions(from).join(', ') || 'none';
      throw new ConflictException(`Cannot change status from ${from} to ${to}; allowed: ${allowed}`);
    }
  }

  private assertDeadlineChangeable(status: CaseStatus): void {
    if (!canChangeDeadline(status)) {
      throw new ConflictException('The deadline cannot be changed once the response is sent');
    }
  }

  private assertValidExtension(extendedDueAt: Date, receivedAt: Date, dueAt: Date): void {
    const max = maxExtendedDueDate(receivedAt);
    if (extendedDueAt <= dueAt || extendedDueAt > max) {
      throw new BadRequestException(
        `extendedDueAt must be after ${formatDateOnly(dueAt)} and no later than ${formatDateOnly(max)}`,
      );
    }
  }

  private parseReceivedAt(value: string, today: Date): Date {
    const receivedAt = this.parseDate(value, 'receivedAt');
    if (receivedAt > today) {
      throw new BadRequestException('receivedAt cannot be in the future');
    }
    return receivedAt;
  }

  private parseDate(value: string, field: string): Date {
    try {
      return parseDateOnly(value);
    } catch {
      throw new BadRequestException(`${field} is not a valid date`);
    }
  }

  private toHttpError(error: unknown): unknown {
    if (error instanceof CaseNotFoundError || error instanceof CaseDepartmentNotFoundError) {
      return new NotFoundException(error.message);
    }
    if (
      error instanceof CaseNumberTakenError ||
      error instanceof SequenceNumberTakenError ||
      error instanceof CaseStatusChangedError
    ) {
      return new ConflictException(error.message);
    }
    if (error instanceof AssigneeNotFoundError || error instanceof DepartmentNotFoundError) {
      return new BadRequestException(error.message);
    }
    return error;
  }
}
