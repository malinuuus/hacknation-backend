import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ format: 'uuid', example: '3f6c1e2a-9b8d-4c7e-a1f0-2d5b6e8c9a10' })
  id: string;

  @ApiProperty({ format: 'email', example: 'urzednik@example.com' })
  email: string;
}
