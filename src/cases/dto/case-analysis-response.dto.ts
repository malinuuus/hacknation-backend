import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TextExtractionStatus } from '../../generated/prisma/enums.js';
import { AiAnalysisStatus } from '../enums/ai-analysis-status.enum.js';
import { AnalysisWarning } from '../enums/analysis-warning.enum.js';
import { ExtractionMethod } from '../enums/extraction-method.enum.js';
import { MetadataSource } from '../enums/metadata-source.enum.js';

export class SuggestedValueDto {
  @ApiProperty()
  value: string;

  @ApiProperty({ enum: MetadataSource, enumName: 'MetadataSource', description: 'Where the value was found' })
  source: MetadataSource;

  @ApiProperty({
    enum: ExtractionMethod,
    enumName: 'ExtractionMethod',
    description: 'AI: read by the language model; PATTERN: found by pattern matching',
  })
  method: ExtractionMethod;
}

export class SuggestedQuestionDto {
  @ApiProperty({ description: 'The question as a self-contained sentence' })
  text: string;

  @ApiProperty({ type: [String], format: 'uuid', description: 'Departments that most likely hold the answer' })
  departmentIds: string[];
}

export class SuggestedDepartmentDto {
  @ApiProperty({ format: 'uuid' })
  departmentId: string;

  @ApiProperty({ example: 'WOŚ' })
  symbol: string;

  @ApiProperty({ example: 'Wydział Ochrony Środowiska' })
  name: string;

  @ApiProperty({ description: 'Why this department; may be empty' })
  reason: string;
}

export class AiAnalysisDto {
  @ApiProperty({
    enum: AiAnalysisStatus,
    enumName: 'AiAnalysisStatus',
    description:
      'USED: suggestions include the AI; NOT_CONFIGURED or FAILED: pattern matching only, no questions or ' +
      'departments; SKIPPED_NO_TEXT: no text to analyse',
  })
  status: AiAnalysisStatus;
}

export class CaseAnalysisSuggestionsDto {
  @ApiPropertyOptional({ type: SuggestedValueDto, nullable: true })
  caseNumber: SuggestedValueDto | null;

  @ApiPropertyOptional({ type: SuggestedValueDto, nullable: true, description: 'From the office stamp' })
  receivedAt: SuggestedValueDto | null;

  @ApiPropertyOptional({ type: SuggestedValueDto, nullable: true })
  subject: SuggestedValueDto | null;

  @ApiPropertyOptional({
    type: SuggestedValueDto,
    nullable: true,
    description: 'From the place and date line of the letter; omitted when after the receipt date or in the future',
  })
  writtenAt: SuggestedValueDto | null;

  @ApiPropertyOptional({
    type: SuggestedValueDto,
    nullable: true,
    description: 'From a "Wnioskodawca:"/"Od:" line or the signature',
  })
  requesterName: SuggestedValueDto | null;

  @ApiPropertyOptional({ type: SuggestedValueDto, nullable: true })
  requesterEmail: SuggestedValueDto | null;

  @ApiPropertyOptional({ type: SuggestedValueDto, nullable: true, description: 'Postal address of the requester' })
  requesterAddress: SuggestedValueDto | null;
}

export class CaseAnalysisResponseDto {
  @ApiProperty({ description: 'Name of the analysed file' })
  fileName: string;

  @ApiProperty({ enum: TextExtractionStatus, enumName: 'TextExtractionStatus' })
  textExtractionStatus: TextExtractionStatus;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Text read from the file; prefill `requestText` with it for the official to verify',
  })
  extractedText: string | null;

  @ApiProperty({ type: CaseAnalysisSuggestionsDto, description: 'Values read from the file; null when not found' })
  suggestions: CaseAnalysisSuggestionsDto;

  @ApiProperty({
    type: [SuggestedQuestionDto],
    description: 'Questions of the request, read by the AI; save the confirmed ones with `PUT /cases/:id/questions`',
  })
  questions: SuggestedQuestionDto[];

  @ApiProperty({
    type: [SuggestedDepartmentDto],
    description:
      'Departments to ask, matched by the AI among active departments; save with `PUT /cases/:id/departments`',
  })
  departments: SuggestedDepartmentDto[];

  @ApiProperty({ type: AiAnalysisDto })
  ai: AiAnalysisDto;

  @ApiProperty({
    enum: AnalysisWarning,
    enumName: 'AnalysisWarning',
    isArray: true,
    description: 'What the official should check before registering the request',
  })
  warnings: AnalysisWarning[];
}
