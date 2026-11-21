import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntakeWarning } from '../enums/intake-warning.enum.js';
import { MetadataSource } from '../enums/metadata-source.enum.js';
import { CaseDetailDto } from './case-response.dto.js';

export class SuggestedValueDto {
  @ApiProperty()
  value: string;

  @ApiProperty({ enum: MetadataSource, enumName: 'MetadataSource', description: 'Where the value was found' })
  source: MetadataSource;
}

export class CaseIntakeSuggestionsDto {
  @ApiPropertyOptional({ type: SuggestedValueDto, nullable: true })
  caseNumber: SuggestedValueDto | null;

  @ApiPropertyOptional({ type: SuggestedValueDto, nullable: true, description: 'From the office stamp' })
  receivedAt: SuggestedValueDto | null;

  @ApiPropertyOptional({ type: SuggestedValueDto, nullable: true })
  subject: SuggestedValueDto | null;
}

export class CaseIntakeResponseDto {
  @ApiProperty({ type: CaseDetailDto, description: 'The registered case, with the file attached' })
  case: CaseDetailDto;

  @ApiProperty({ type: CaseIntakeSuggestionsDto, description: 'Values read from the file' })
  suggestions: CaseIntakeSuggestionsDto;

  @ApiProperty({
    enum: IntakeWarning,
    enumName: 'IntakeWarning',
    isArray: true,
    description: 'What the official should check, e.g. a receipt date that defaulted to today',
  })
  warnings: IntakeWarning[];
}
