import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { KnowledgeCategory } from '../../generated/prisma/enums.js';

export const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Empty strings become undefined; `null` is kept so PATCH can clear a field. */
export const trimToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

/** multipart/form-data body; the file itself is read by the interceptor. */
export class CreateKnowledgeDocumentDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'PDF, DOCX or TXT (DOC is stored but not read)' })
  @IsOptional()
  file?: unknown;

  @ApiProperty({
    description: 'Name shown in the knowledge base',
    example: 'Ustawa o dostępie do informacji publicznej',
    maxLength: 300,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  name: string;

  @ApiProperty({
    enum: KnowledgeCategory,
    enumName: 'KnowledgeCategory',
    description:
      'LAW: legal acts; RESPONSE: past responses (style and wording); GUIDELINE: internal rules, e.g. anonymisation or the organisational regulations',
  })
  @IsEnum(KnowledgeCategory)
  category: KnowledgeCategory;

  @ApiPropertyOptional({ maxLength: 2000 })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
