import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { DATE_ONLY_PATTERN } from './create-case.dto.js';

export class DeadlinePreviewQueryDto {
  @ApiProperty({ description: 'Date of receipt, YYYY-MM-DD; cannot be in the future', example: '2026-08-19' })
  @Matches(DATE_ONLY_PATTERN, { message: 'receivedAt must be a date in YYYY-MM-DD format' })
  receivedAt: string;
}

export class DeadlinePreviewResponseDto {
  @ApiProperty({ format: 'date', example: '2026-08-19' })
  receivedAt: string;

  @ApiProperty({
    format: 'date',
    description: 'Statutory deadline: 14 days from receipt, moved to the next working day if needed',
    example: '2026-09-02',
  })
  dueAt: string;

  @ApiProperty({ format: 'date', description: 'Latest date the deadline can be extended to (2 months)' })
  maxExtendedDueAt: string;
}
