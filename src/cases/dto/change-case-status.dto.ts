import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { CaseStatus } from '../../generated/prisma/enums.js';
import { DATE_ONLY_PATTERN } from './create-case.dto.js';

/** EXTENDED needs a new deadline, so it is set through the extension endpoint instead. */
const SETTABLE_STATUSES = Object.values(CaseStatus).filter((status) => status !== CaseStatus.EXTENDED);

export class ChangeCaseStatusDto {
  @ApiProperty({
    enum: SETTABLE_STATUSES,
    description: 'New status. Use `POST /cases/:id/extension` to move a case to EXTENDED.',
  })
  @IsEnum(CaseStatus)
  @IsIn(SETTABLE_STATUSES, { message: 'Use the extension endpoint to set EXTENDED' })
  status: CaseStatus;

  @ApiPropertyOptional({ description: 'Note stored in the status history', maxLength: 1000 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({
    description: 'Only for RESPONSE_SENT: date the response was sent, YYYY-MM-DD. Defaults to today.',
    format: 'date',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'respondedAt must be a date in YYYY-MM-DD format' })
  respondedAt?: string;
}
