import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { CreateCaseDto } from './create-case.dto.js';

/** multipart/form-data body of `POST /cases`: the case fields plus the request file. */
export class CreateCaseFormDto extends CreateCaseDto {
  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'The request: PDF, DOCX or DOC' })
  @IsOptional()
  file?: unknown;
}
