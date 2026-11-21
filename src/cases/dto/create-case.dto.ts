import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCaseDto {
  @ApiProperty({
    description: 'Short description of what the request is about',
    example: 'Opieka nad bezdomnymi zwierzętami w 2025 r. – umowy i koszty',
    maxLength: 500,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  subject: string;

  @ApiProperty({
    description: 'Date the request was received (office stamp), YYYY-MM-DD. The response deadline is computed from it.',
    example: '2026-08-19',
    format: 'date',
  })
  @Matches(DATE_ONLY_PATTERN, { message: 'receivedAt must be a date in YYYY-MM-DD format' })
  receivedAt: string;

  @ApiPropertyOptional({
    description: 'Official case number. Generated as `<prefix>.<sequence>.<year>` when omitted.',
    example: 'BKS.IV.1431.543.2026',
    maxLength: 100,
  })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  caseNumber?: string;

  @ApiPropertyOptional({ description: 'Initials of the official handling the case', example: 'TM', maxLength: 10 })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(10)
  handlerInitials?: string;

  @ApiPropertyOptional({ description: 'Official responsible for the case', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Requester name or organisation (personal data)', maxLength: 300 })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  requesterName?: string;

  @ApiPropertyOptional({ description: 'Requester e-mail for the response (personal data)', format: 'email' })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  requesterEmail?: string;

  @ApiPropertyOptional({ description: 'Requester postal address (personal data)', maxLength: 500 })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  requesterAddress?: string;

  @ApiPropertyOptional({ description: 'Internal notes', maxLength: 5000 })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
