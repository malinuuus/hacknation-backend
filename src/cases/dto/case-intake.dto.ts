import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { CreateCaseDto } from './create-case.dto.js';

/**
 * multipart/form-data body for registering a request from its file. Every
 * case field is optional: missing ones are read from the file where possible.
 */
export class CaseIntakeDto extends PartialType(CreateCaseDto) {
  @ApiProperty({ type: 'string', format: 'binary', description: 'The request: PDF, DOCX or DOC' })
  @IsOptional()
  file?: unknown;
}
