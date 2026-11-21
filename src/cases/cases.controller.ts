import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CasesService } from './cases.service.js';
import { CaseDetailDto, CaseListResponseDto, CaseYearsResponseDto } from './dto/case-response.dto.js';
import { CreateCaseDto } from './dto/create-case.dto.js';
import { ListCasesQueryDto } from './dto/list-cases-query.dto.js';

@ApiTags('Cases')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a new request',
    description: 'Assigns the next sequence number of the year and computes the 14-day statutory deadline.',
  })
  @ApiCreatedResponse({ type: CaseDetailDto })
  @ApiBadRequestResponse({ description: 'Invalid body, future receipt date or unknown assignee' })
  @ApiConflictResponse({ description: 'Case number is already used' })
  create(@Body() dto: CreateCaseDto, @CurrentUser() user: AuthUser): Promise<CaseDetailDto> {
    return this.casesService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'List the request register for a year',
    description: 'Oldest received first. Each row carries `urgency` and `daysLeft` for highlighting.',
  })
  @ApiOkResponse({ type: CaseListResponseDto })
  list(@Query() query: ListCasesQueryDto): Promise<CaseListResponseDto> {
    return this.casesService.list(query);
  }

  @Get('years')
  @ApiOperation({ summary: 'Years available in the year picker' })
  @ApiOkResponse({ type: CaseYearsResponseDto })
  getYears(): Promise<CaseYearsResponseDto> {
    return this.casesService.getYears();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a request with its status history' })
  @ApiOkResponse({ type: CaseDetailDto })
  @ApiNotFoundResponse({ description: 'Case not found' })
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<CaseDetailDto> {
    return this.casesService.getById(id);
  }
}
