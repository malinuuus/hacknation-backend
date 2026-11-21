import { Injectable } from '@nestjs/common';
import type { Department } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DepartmentListFilter } from './interfaces/department-list-filter.interface.js';

@Injectable()
export class DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(filter: DepartmentListFilter): Promise<Department[]> {
    return this.prisma.department.findMany({
      where: filter.includeInactive ? {} : { isActive: true },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });
  }
}
