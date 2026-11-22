import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth-cookie.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { DepartmentsService } from './departments.service.js';
import { DepartmentDto } from './dto/department-response.dto.js';
import { ListDepartmentsQueryDto } from './dto/list-departments-query.dto.js';

@ApiTags('Departments')
@ApiCookieAuth(ACCESS_TOKEN_COOKIE)
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
