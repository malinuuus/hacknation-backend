import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { CaseSummaryDto } from './case-response.dto.js';
import { DATE_ONLY_PATTERN } from './create-case.dto.js';

export class CaseCalendarQueryDto {
  @ApiProperty({ description: 'First day of the range, YYYY-MM-DD (inclusive)', example: '2026-12-01' })
  @Matches(DATE_ONLY_PATTERN, { message: 'from must be a date in YYYY-MM-DD format' })
  from: string;

  @ApiProperty({ description: 'Last day of the range, YYYY-MM-DD (inclusive)', example: '2026-12-31' })
  @Matches(DATE_ONLY_PATTERN, { message: 'to must be a date in YYYY-MM-DD format' })
  to: string;
}

export class CaseCalendarResponseDto {
  @ApiProperty({ format: 'date', example: '2026-12-01' })
  from: string;

  @ApiProperty({ format: 'date', example: '2026-12-31' })
  to: string;

  @ApiProperty({
    type: [CaseSummaryDto],
    description: 'Every case whose deadline in force falls in the range, nearest deadline first',
  })
  items: CaseSummaryDto[];
}
