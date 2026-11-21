import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ListDepartmentsQueryDto {
  @ApiPropertyOptional({ default: false, description: 'Also return units that no longer exist' })
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsOptional()
  @IsBoolean()
  includeInactive: boolean = false;
}
