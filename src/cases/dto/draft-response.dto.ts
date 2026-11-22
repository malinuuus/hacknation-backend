import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { KnowledgeCategory } from '../../generated/prisma/enums.js';
import { DraftSourceKind } from '../enums/draft-source-kind.enum.js';

export class GenerateDraftResponseDto {
  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Questions to answer (from `questions` of the case); all when omitted',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  questionIds?: string[];

  @ApiPropertyOptional({
    description: "The official's notes, e.g. information received by phone; used as facts",
    maxLength: 20000,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  notes?: string;
}

export class DraftSourceDto {
  @ApiProperty({ enum: DraftSourceKind, enumName: 'DraftSourceKind' })
  kind: DraftSourceKind;

  @ApiProperty({ format: 'uuid', description: 'Case document id or knowledge document id, depending on `kind`' })
  documentId: string;

  @ApiProperty()
  documentName: string;

  @ApiPropertyOptional({ enum: KnowledgeCategory, enumName: 'KnowledgeCategory', nullable: true })
  category: KnowledgeCategory | null;

  @ApiPropertyOptional({ nullable: true, description: 'For department replies', example: 'WOŚ' })
  departmentSymbol: string | null;

  @ApiProperty({ description: 'Beginning of the text used' })
  excerpt: string;
}

export class DraftResponseDto {
  @ApiProperty({ description: 'Draft for the official to check; gaps are marked [UZUPEŁNIJ: …]' })
  text: string;

  @ApiProperty({ type: [DraftSourceDto], description: 'Materials the draft is based on' })
  sources: DraftSourceDto[];
}
