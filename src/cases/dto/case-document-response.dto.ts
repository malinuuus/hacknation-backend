import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaseDocumentKind, TextExtractionStatus } from '../../generated/prisma/enums.js';
import { UserRefDto } from './user-ref.dto.js';

export class DocumentDepartmentRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'WIM' })
  symbol: string;

  @ApiProperty({ example: 'Wydział Inwestycji Miasta' })
  name: string;
}

export class CaseDocumentDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: CaseDocumentKind, enumName: 'CaseDocumentKind' })
  kind: CaseDocumentKind;

  @ApiPropertyOptional({ type: DocumentDepartmentRefDto, nullable: true })
  department: DocumentDepartmentRefDto | null;

  @ApiProperty({ example: 'Wniosek - BKS.IV.1431.590.2026.pdf' })
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty()
  sizeBytes: number;

  @ApiProperty({
    enum: TextExtractionStatus,
    enumName: 'TextExtractionStatus',
    description: 'NO_TEXT usually means a scan without a text layer (needs OCR)',
  })
  textExtractionStatus: TextExtractionStatus;

  @ApiProperty({ type: UserRefDto })
  uploadedBy: UserRefDto;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}

export class CaseDocumentDetailDto extends CaseDocumentDto {
  @ApiPropertyOptional({ nullable: true, description: 'Plain text read from the file' })
  extractedText: string | null;
}
