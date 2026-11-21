import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../auth/auth-user.js';
import type { EnvironmentVariables } from '../config/environment/environment-variables.validation.js';
import { toCaseDetailDto, toCaseSummaryDto } from './case.mapper.js';
import { CasesRepository } from './cases.repository.js';
import { formatCaseNumber, sequenceNumberFromCaseNumber } from './domain/case-number.js';
import { parseDateOnly, todayInOfficeTimeZone } from './domain/date-only.js';
import { computeDueDate } from './domain/deadline.js';
import type { CaseDetailDto, CaseListResponseDto, CaseYearsResponseDto } from './dto/case-response.dto.js';
import type { CreateCaseDto } from './dto/create-case.dto.js';
import type { ListCasesQueryDto } from './dto/list-cases-query.dto.js';
import { AssigneeNotFoundError } from './errors/assignee-not-found.error.js';
import { CaseNumberTakenError } from './errors/case-number-taken.error.js';
import { SequenceNumberTakenError } from './errors/sequence-number-taken.error.js';

@Injectable()
export class CasesService {
  private readonly caseNumberPrefix: string;

  constructor(
    private readonly casesRepository: CasesRepository,
    config: ConfigService,
  ) {
    this.caseNumberPrefix = config.getOrThrow<EnvironmentVariables['CASE_NUMBER_PREFIX']>('CASE_NUMBER_PREFIX');
  }

  async create(dto: CreateCaseDto, user: AuthUser): Promise<CaseDetailDto> {
    const today = todayInOfficeTimeZone();
    const receivedAt = this.parseDate(dto.receivedAt, 'receivedAt');
    if (receivedAt > today) {
      throw new BadRequestException('receivedAt cannot be in the future');
    }
    const year = receivedAt.getUTCFullYear();

    try {
      const created = await this.casesRepository.create({
        year,
        // Keep the register's ordinal number in step with the sequence in an explicit case sign.
        sequenceNumber: dto.caseNumber ? sequenceNumberFromCaseNumber(dto.caseNumber, year) : undefined,
        caseNumber:
          dto.caseNumber ?? ((sequenceNumber) => formatCaseNumber(this.caseNumberPrefix, sequenceNumber, year)),
        subject: dto.subject,
        receivedAt,
        dueAt: computeDueDate(receivedAt),
        handlerInitials: dto.handlerInitials,
        assigneeId: dto.assigneeId,
        requesterName: dto.requesterName,
        requesterEmail: dto.requesterEmail,
        requesterAddress: dto.requesterAddress,
        notes: dto.notes,
        createdById: user.id,
      });
      return toCaseDetailDto(created, today);
    } catch (error) {
      if (error instanceof CaseNumberTakenError || error instanceof SequenceNumberTakenError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof AssigneeNotFoundError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async list(query: ListCasesQueryDto): Promise<CaseListResponseDto> {
    const today = todayInOfficeTimeZone();
    const { items, total } = await this.casesRepository.findMany({
      year: query.year ?? today.getUTCFullYear(),
      status: query.status,
      assigneeId: query.assigneeId,
      search: query.q,
      limit: query.limit,
      offset: query.offset,
    });

    return { items: items.map((item) => toCaseSummaryDto(item, today)), total };
  }

  async getById(id: string): Promise<CaseDetailDto> {
    const found = await this.casesRepository.findById(id);
    if (!found) {
      throw new NotFoundException(`Case "${id}" not found`);
    }
    return toCaseDetailDto(found, todayInOfficeTimeZone());
  }

  async getYears(): Promise<CaseYearsResponseDto> {
    const currentYear = todayInOfficeTimeZone().getUTCFullYear();
    const years = new Set([currentYear, ...(await this.casesRepository.findYears())]);
    return { years: [...years].sort((a, b) => b - a) };
  }

  private parseDate(value: string, field: string): Date {
    try {
      return parseDateOnly(value);
    } catch {
      throw new BadRequestException(`${field} is not a valid date`);
    }
  }
}
