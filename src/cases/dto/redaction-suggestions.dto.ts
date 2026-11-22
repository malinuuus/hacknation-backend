import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { RedactionCategory } from '../enums/redaction-category.enum.js';

export class RedactionSuggestionsRequestDto {
  @ApiProperty({ description: 'Text to check, e.g. the draft response', maxLength: 100000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
  text: string;
}

export class RedactionSuggestionDto {
  @ApiProperty({ description: 'Fragment exactly as it occurs in the text' })
  text: string;

  @ApiProperty({ enum: RedactionCategory, enumName: 'RedactionCategory' })
  category: RedactionCategory;

  @ApiProperty()
  reason: string;
}

export class RedactionSuggestionsResponseDto {
  @ApiProperty({ type: [RedactionSuggestionDto], description: 'In order of first occurrence in the text' })
  suggestions: RedactionSuggestionDto[];
}
