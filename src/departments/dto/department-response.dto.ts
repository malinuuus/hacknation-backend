import { ApiProperty } from '@nestjs/swagger';
import { DepartmentKind } from '../../generated/prisma/enums.js';

export class DepartmentDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Wydział Inwestycji Miasta' })
  name: string;

  @ApiProperty({ example: 'WIM' })
  symbol: string;

  @ApiProperty({
    enum: DepartmentKind,
    enumName: 'DepartmentKind',
    description: 'Wydział (DEPARTMENT) or biuro (OFFICE)',
  })
  kind: DepartmentKind;

  @ApiProperty()
  isActive: boolean;
}
