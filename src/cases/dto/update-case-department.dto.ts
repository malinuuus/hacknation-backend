import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, Matches, ValidateIf } from 'class-validator';
import { DATE_ONLY_PATTERN } from './create-case.dto.js';

export class UpdateCaseDepartmentDto {
  @ApiProperty({
    format: 'date',
    nullable: true,
    description: 'Date the department replied, YYYY-MM-DD; `null` marks it as still waiting',
    example: '2026-11-20',
  })
  @IsDefined()
  @ValidateIf((dto: UpdateCaseDepartmentDto) => dto.answeredAt !== null)
  @Matches(DATE_ONLY_PATTERN, { message: 'answeredAt must be a date in YYYY-MM-DD format' })
  answeredAt: string | null;
}
