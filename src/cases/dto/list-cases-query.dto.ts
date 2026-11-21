import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { CaseStatus } from '../../generated/prisma/enums.js';
import { CaseSort } from '../enums/case-sort.enum.js';

/** Accepts `?status=A&status=B` as well as `?status=A,B`. */
const toList = ({ value }: { value: unknown }) => {
  const values = (Array.isArray(value) ? value : [value]).flatMap((item) =>
    typeof item === 'string' ? item.split(',') : [item],
  );
  const list = values.map((item) => (typeof item === 'string' ? item.trim() : item)).filter((item) => item !== '');
  return list.length > 0 ? list : undefined;
};

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class ListCasesQueryDto {
  @ApiPropertyOptional({ description: 'Year of receipt. Defaults to the current year.', example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({
    enum: CaseStatus,
    enumName: 'CaseStatus',
    isArray: true,
    description: 'Only cases in one of these statuses. Repeat the parameter or separate with commas.',
  })
  @Transform(toList)
  @IsOptional()
  @IsEnum(CaseStatus, { each: true })
  status?: CaseStatus[];

  @ApiPropertyOptional({
    type: Boolean,
    description: 'true: only cases with an extended deadline (kwerenda); false: only without',
  })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  extended?: boolean;

  @ApiPropertyOptional({ format: 'uuid', description: 'Only cases assigned to this official' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'Search in case number, subject, request text and requester name',
    maxLength: 200,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({
    enum: CaseSort,
    enumName: 'CaseSort',
    default: CaseSort.ReceivedAsc,
    description:
      'RECEIVED_ASC: oldest received first; RECEIVED_DESC: newest first; ' +
      'DEADLINE_ASC: nearest deadline in force first, answered cases last',
  })
  @IsOptional()
  @IsEnum(CaseSort)
  sort: CaseSort = CaseSort.ReceivedAsc;

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 100;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
