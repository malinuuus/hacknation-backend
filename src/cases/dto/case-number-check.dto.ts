import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { CaseConflict } from '../enums/case-conflict.enum.js';

export class CaseNumberCheckQueryDto {
  @ApiProperty({ example: 'BKS.IV.1431.543.2026', maxLength: 100 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  caseNumber: string;

  @ApiPropertyOptional({
    description:
      'Year of the case (of its receipt date). Its sequence number is checked only when the case number ' +
      'ends with `.<sequence>.<year>` of this year. Defaults to the year in the case number.',
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ format: 'uuid', description: 'A case to ignore, e.g. the one being edited' })
  @IsOptional()
  @IsUUID()
  exceptId?: string;
}

export class CaseNumberCheckResponseDto {
  @ApiProperty({ description: 'The checked case number, trimmed' })
  caseNumber: string;

  @ApiProperty({ description: 'Whether a case can be registered (or renumbered) with this number' })
  available: boolean;

  @ApiPropertyOptional({
    enum: [CaseConflict.CaseNumberTaken, CaseConflict.SequenceNumberTaken],
    enumName: 'CaseNumberConflict',
    nullable: true,
    description: 'Why the number is not available; the same `code` that `POST /cases` would return with 409',
  })
  conflict: CaseConflict.CaseNumberTaken | CaseConflict.SequenceNumberTaken | null;
}
