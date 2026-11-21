import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { DepartmentsService } from './departments.service.js';
import { DepartmentDto } from './dto/department-response.dto.js';
import { ListDepartmentsQueryDto } from './dto/list-departments-query.dto.js';

@ApiTags('Departments')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List city hall departments and offices that can be asked for information' })
  @ApiOkResponse({ type: [DepartmentDto] })
  list(@Query() query: ListDepartmentsQueryDto): Promise<DepartmentDto[]> {
    return this.departmentsService.list(query);
  }
}
