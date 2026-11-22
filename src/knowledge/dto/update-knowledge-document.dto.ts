import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { KnowledgeCategory } from '../../generated/prisma/enums.js';
import { trim, trimToUndefined } from './create-knowledge-document.dto.js';

export class UpdateKnowledgeDocumentDto {
  @ApiPropertyOptional({ maxLength: 300 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  name?: string;

  @ApiPropertyOptional({ enum: KnowledgeCategory, enumName: 'KnowledgeCategory' })
  @IsOptional()
  @IsEnum(KnowledgeCategory)
  category?: KnowledgeCategory;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true, description: 'Send null to clear' })
  @Transform(trimToUndefined)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
