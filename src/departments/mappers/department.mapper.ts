import type { Department } from '../../generated/prisma/client.js';
import type { DepartmentDto } from '../dto/department-response.dto.js';

export function toDepartmentDto(department: Department): DepartmentDto {
  return {
    id: department.id,
    name: department.name,
    symbol: department.symbol,
    kind: department.kind,
    isActive: department.isActive,
  };
}
