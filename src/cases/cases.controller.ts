import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CaseIntakeService } from './case-intake.service.js';
import { CasesService } from './cases.service.js';
import { CaseIntakeResponseDto } from './dto/case-intake-response.dto.js';
import { CaseIntakeDto } from './dto/case-intake.dto.js';
import { CaseDetailDto, CaseListResponseDto, CaseYearsResponseDto } from './dto/case-response.dto.js';
import { ChangeCaseStatusDto } from './dto/change-case-status.dto.js';
import { CreateCaseDto } from './dto/create-case.dto.js';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto.js';
import { ListCasesQueryDto } from './dto/list-cases-query.dto.js';
import { SetCaseDepartmentsDto } from './dto/set-case-departments.dto.js';
import { UpdateCaseDepartmentDto } from './dto/update-case-department.dto.js';
import { UpdateCaseDto } from './dto/update-case.dto.js';

@ApiTags('Cases')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('cases')
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
    private readonly intakeService: CaseIntakeService,
  ) {}

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

  @Post('intake')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CaseIntakeDto })
  @ApiOperation({
    summary: 'Register a request from its file',
    description:
      'Upload the request (PDF/DOCX/DOC). The case number, receipt date and subject are read from the file ' +
      'unless given; check `suggestions` and `warnings`, then correct the case with PATCH if needed.',
  })
  @ApiCreatedResponse({ type: CaseIntakeResponseDto })
  @ApiBadRequestResponse({ description: 'Missing file or invalid fields' })
  @ApiConflictResponse({ description: 'The case number from the file is already used' })
  @ApiPayloadTooLargeResponse({ description: 'File too large' })
  @ApiUnsupportedMediaTypeResponse({ description: 'Not a PDF, DOCX or DOC file' })
  intake(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CaseIntakeDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CaseIntakeResponseDto> {
    return this.intakeService.intake(file, dto, user);
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

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit request data',
    description: 'Changing `receivedAt` recomputes the statutory deadline. Send `null` to clear an optional field.',
  })
  @ApiOkResponse({ type: CaseDetailDto })
  @ApiBadRequestResponse({
    description: 'Invalid body, receipt date moved to another year, or extension no longer valid',
  })
  @ApiNotFoundResponse({ description: 'Case not found' })
  @ApiConflictResponse({ description: 'Case number is already used' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCaseDto): Promise<CaseDetailDto> {
    return this.casesService.update(id, dto);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change the status of a request',
    description: 'Records the change in the status history. RESPONSE_SENT also stores the response date.',
  })
  @ApiOkResponse({ type: CaseDetailDto })
  @ApiBadRequestResponse({ description: 'Invalid body or response date' })
  @ApiNotFoundResponse({ description: 'Case not found' })
  @ApiConflictResponse({ description: 'Transition not allowed, or the case was changed meanwhile' })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeCaseStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CaseDetailDto> {
    return this.casesService.changeStatus(id, dto, user);
  }

  @Post(':id/extension')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extend the response deadline (kwerenda)',
    description: 'Sets the extended deadline (max 2 months from receipt) and moves the case to EXTENDED.',
  })
  @ApiOkResponse({ type: CaseDetailDto })
  @ApiBadRequestResponse({ description: 'Date not after the statutory deadline or beyond 2 months' })
  @ApiNotFoundResponse({ description: 'Case not found' })
  @ApiConflictResponse({ description: 'Case cannot be extended in its current status' })
  extendDeadline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendDeadlineDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CaseDetailDto> {
    return this.casesService.extendDeadline(id, dto, user);
  }

  @Put(':id/departments')
  @ApiOperation({
    summary: 'Set the departments asked for information',
    description:
      'Replaces the list. Newly added departments get today as the request date. ' +
      'A NEW case moves to SENT_TO_DEPARTMENTS. Nothing is sent to the departments by the system.',
  })
  @ApiOkResponse({ type: CaseDetailDto })
  @ApiBadRequestResponse({ description: 'Invalid body or unknown department' })
  @ApiNotFoundResponse({ description: 'Case not found' })
  @ApiConflictResponse({ description: 'The case was changed meanwhile' })
  setDepartments(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCaseDepartmentsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CaseDetailDto> {
    return this.casesService.setDepartments(id, dto, user);
  }

  @Patch(':id/departments/:departmentId')
  @ApiOperation({ summary: "Record (or clear) a department's reply date" })
  @ApiOkResponse({ type: CaseDetailDto })
  @ApiBadRequestResponse({ description: 'Invalid date' })
  @ApiNotFoundResponse({ description: 'Case not found, or the department was not asked about it' })
  updateDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Body() dto: UpdateCaseDepartmentDto,
  ): Promise<CaseDetailDto> {
    return this.casesService.updateDepartment(id, departmentId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a request with its history' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Case not found' })
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.casesService.delete(id);
  }
}
