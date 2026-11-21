import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { CaseStatus } from '../../generated/prisma/enums.js';
import { DATE_ONLY_PATTERN } from './create-case.dto.js';

export class ChangeCaseStatusDto {
  @ApiProperty({ enum: CaseStatus, enumName: 'CaseStatus', description: 'New status' })
  @IsEnum(CaseStatus)
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
