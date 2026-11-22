import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { KnowledgeCategory } from '../../generated/prisma/enums.js';
import { trim } from './create-knowledge-document.dto.js';

export class SearchKnowledgeDto {
  @ApiProperty({ example: 'Kiedy można przedłużyć termin udostępnienia informacji?', maxLength: 2000 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  query: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 30, description: 'Number of fragments; defaults to RAG_TOP_K' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  k?: number;

  @ApiPropertyOptional({ enum: KnowledgeCategory, enumName: 'KnowledgeCategory', isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(KnowledgeCategory, { each: true })
  categories?: KnowledgeCategory[];
}

export class KnowledgeSearchMatchDto {
  @ApiProperty({ format: 'uuid' })
  chunkId: string;

  @ApiProperty({ format: 'uuid' })
  documentId: string;

  @ApiProperty()
  documentName: string;

  @ApiProperty({ enum: KnowledgeCategory, enumName: 'KnowledgeCategory' })
  category: KnowledgeCategory;

  @ApiProperty({ description: 'Order of the fragment in the document, from 0' })
  position: number;

  @ApiProperty()
  content: string;

  @ApiProperty({ description: 'Cosine similarity to the query; 1 = identical' })
  score: number;
}

export class KnowledgeSearchResponseDto {
  @ApiProperty({ type: [KnowledgeSearchMatchDto], description: 'Most similar first' })
  matches: KnowledgeSearchMatchDto[];
}
