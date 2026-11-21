import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { DATE_ONLY_PATTERN } from './create-case.dto.js';

export class ExtendDeadlineDto {
  @ApiProperty({
    description:
      'New deadline, YYYY-MM-DD. Must be after the statutory deadline and at most 2 months from receipt (art. 13 ust. 2 UDIP).',
    format: 'date',
    example: '2026-10-19',
  })
  @Matches(DATE_ONLY_PATTERN, { message: 'extendedDueAt must be a date in YYYY-MM-DD format' })
  extendedDueAt: string;

  @ApiProperty({
    description: 'Reason for the delay; the requester must be told it (art. 13 ust. 2 UDIP)',
    example: 'Konieczność zebrania danych z kilku wydziałów',
    maxLength: 1000,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}
