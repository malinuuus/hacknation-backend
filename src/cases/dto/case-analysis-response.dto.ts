import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TextExtractionStatus } from '../../generated/prisma/enums.js';
import { AnalysisWarning } from '../enums/analysis-warning.enum.js';
import { MetadataSource } from '../enums/metadata-source.enum.js';

export class SuggestedValueDto {
  @ApiProperty()
  value: string;

  @ApiProperty({ enum: MetadataSource, enumName: 'MetadataSource', description: 'Where the value was found' })
  source: MetadataSource;
}

export class CaseAnalysisSuggestionsDto {
  @ApiPropertyOptional({ type: SuggestedValueDto, nullable: true })
  caseNumber: SuggestedValueDto | null;

  @ApiPropertyOptional({ type: SuggestedValueDto, nullable: true, description: 'From the office stamp' })
  receivedAt: SuggestedValueDto | null;

  @ApiPropertyOptional({ type: SuggestedValueDto, nullable: true })
  subject: SuggestedValueDto | null;
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
    enum: AnalysisWarning,
    enumName: 'AnalysisWarning',
    isArray: true,
    description: 'What the official should check before registering the request',
  })
  warnings: AnalysisWarning[];
}
