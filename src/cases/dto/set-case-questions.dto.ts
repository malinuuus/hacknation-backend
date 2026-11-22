import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CaseQuestionInputDto {
  @ApiProperty({ example: 'Ile wyniósł koszt opieki nad bezdomnymi zwierzętami w 2025 r.?', maxLength: 2000 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Department that answers the question' })
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;
}

export class SetCaseQuestionsDto {
  @ApiProperty({
    type: [CaseQuestionInputDto],
    description: 'All questions of the request, in order. Replaces the current list.',
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CaseQuestionInputDto)
  questions: CaseQuestionInputDto[];
}
