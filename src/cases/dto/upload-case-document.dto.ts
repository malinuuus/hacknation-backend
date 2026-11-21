import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CaseDocumentKind } from '../../generated/prisma/enums.js';

/** multipart/form-data body; the file itself is read by the interceptor. */
export class UploadCaseDocumentDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'PDF, DOCX or DOC' })
  @IsOptional()
  file?: unknown;

  @ApiProperty({ enum: CaseDocumentKind, enumName: 'CaseDocumentKind' })
  @IsEnum(CaseDocumentKind)
  kind: CaseDocumentKind;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'For DEPARTMENT_RESPONSE: the department that replied. Its reply date is set to today if empty.',
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
