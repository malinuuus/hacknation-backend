import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetCaseDepartmentsDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description:
      'All departments asked for information. Replaces the current list; departments already on it keep their dates.',
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  departmentIds: string[];
}
