import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRefDto } from '../../cases/dto/user-ref.dto.js';
import { KnowledgeCategory, KnowledgeIndexStatus, TextExtractionStatus } from '../../generated/prisma/enums.js';

export class KnowledgeDocumentDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: KnowledgeCategory, enumName: 'KnowledgeCategory' })
  category: KnowledgeCategory;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty({ example: 'ustawa-udip.pdf' })
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty()
  sizeBytes: number;

  @ApiProperty({
    enum: TextExtractionStatus,
    enumName: 'TextExtractionStatus',
    description:
      'OCR_EXTRACTED: transcribed by AI from a scan without a text layer, check it against the original; NO_TEXT: a scan that could not be transcribed',
  })
  textExtractionStatus: TextExtractionStatus;

  @ApiProperty({
    enum: KnowledgeIndexStatus,
    enumName: 'KnowledgeIndexStatus',
    description:
      'INDEXED: used by the AI; PENDING: AI not configured at upload, reindex later; ' +
      'NO_TEXT: no text could be read (e.g. a scan); FAILED: indexing failed, reindex to retry',
  })
  indexStatus: KnowledgeIndexStatus;

  @ApiProperty({ description: 'Number of indexed fragments' })
  chunkCount: number;

  @ApiProperty({ type: UserRefDto })
  uploadedBy: UserRefDto;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class KnowledgeDocumentDetailDto extends KnowledgeDocumentDto {
  @ApiPropertyOptional({ nullable: true, description: 'Plain text read from the file' })
  extractedText: string | null;
}

export class KnowledgeDocumentListResponseDto {
  @ApiProperty({ type: [KnowledgeDocumentDto], description: 'Recently updated first' })
  items: KnowledgeDocumentDto[];

  @ApiProperty({ description: 'Total matching documents, ignoring limit/offset' })
  total: number;
}
