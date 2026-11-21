import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaseStatus } from '../../generated/prisma/enums.js';
import { CaseUrgency } from '../domain/urgency.js';

export class UserRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'email' })
  email: string;
}

/** One row of the case register ("kalendarz wniosków"). */
export class CaseSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ description: 'Ordinal number within the year (liczba porządkowa)', example: 543 })
  sequenceNumber: number;

  @ApiProperty({ example: 'BKS.IV.1431.543.2026' })
  caseNumber: string;

  @ApiProperty()
  subject: string;

  @ApiProperty({ enum: CaseStatus, enumName: 'CaseStatus' })
  status: CaseStatus;

  @ApiProperty({ format: 'date', example: '2026-08-19' })
  receivedAt: string;

  @ApiProperty({ format: 'date', description: 'Statutory 14-day deadline', example: '2026-09-02' })
  dueAt: string;

  @ApiPropertyOptional({ format: 'date', nullable: true, description: 'Extended deadline (kwerenda)' })
  extendedDueAt: string | null;

  @ApiProperty({ format: 'date', description: 'Deadline in force: the extended one if set, else the statutory one' })
  effectiveDueAt: string;

  @ApiProperty({ description: 'Days until the effective deadline; negative when overdue', example: 3 })
  daysLeft: number;

  @ApiProperty({ enum: CaseUrgency, enumName: 'CaseUrgency', description: 'Drives row highlighting' })
  urgency: CaseUrgency;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  respondedAt: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'TM' })
  handlerInitials: string | null;

  @ApiPropertyOptional({ type: UserRefDto, nullable: true })
  assignee: UserRefDto | null;
}

export class CaseListResponseDto {
  @ApiProperty({ type: [CaseSummaryDto], description: 'Oldest received first' })
  items: CaseSummaryDto[];

  @ApiProperty({ description: 'Total matching cases, ignoring limit/offset' })
  total: number;
}

export class CaseStatusChangeDto {
  @ApiPropertyOptional({ enum: CaseStatus, enumName: 'CaseStatus', nullable: true })
  fromStatus: CaseStatus | null;

  @ApiProperty({ enum: CaseStatus, enumName: 'CaseStatus' })
  toStatus: CaseStatus;

  @ApiPropertyOptional({ nullable: true })
  comment: string | null;

  @ApiProperty({ type: UserRefDto })
  changedBy: UserRefDto;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}

export class CaseDetailDto extends CaseSummaryDto {
  @ApiPropertyOptional({ nullable: true })
  extensionReason: string | null;

  @ApiPropertyOptional({ nullable: true })
  requesterName: string | null;

  @ApiPropertyOptional({ nullable: true })
  requesterEmail: string | null;

  @ApiPropertyOptional({ nullable: true })
  requesterAddress: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes: string | null;

  @ApiProperty({ type: UserRefDto })
  createdBy: UserRefDto;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({ type: [CaseStatusChangeDto], description: 'Oldest first' })
  statusHistory: CaseStatusChangeDto[];
}

export class CaseYearsResponseDto {
  @ApiProperty({ type: [Number], description: 'Years with cases plus the current year, newest first' })
  years: number[];
}
