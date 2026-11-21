import { Injectable } from '@nestjs/common';
import { DepartmentsRepository } from './departments.repository.js';
import type { DepartmentDto } from './dto/department-response.dto.js';
import type { ListDepartmentsQueryDto } from './dto/list-departments-query.dto.js';
import { toDepartmentDto } from './mappers/department.mapper.js';

@Injectable()
export class DepartmentsService {
  constructor(private readonly departmentsRepository: DepartmentsRepository) {}

  async list(query: ListDepartmentsQueryDto): Promise<DepartmentDto[]> {
    const departments = await this.departmentsRepository.findMany({ includeInactive: query.includeInactive });
    return departments.map(toDepartmentDto);
  }
}
