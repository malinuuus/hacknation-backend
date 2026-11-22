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
  ApiConflictResponse,
  ApiConsumes,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { CaseAnalysisService } from './case-analysis.service.js';
import { CasesService } from './cases.service.js';
import { CaseAnalysisResponseDto } from './dto/case-analysis-response.dto.js';
import { CaseCalendarQueryDto, CaseCalendarResponseDto } from './dto/case-calendar.dto.js';
import { CaseNumberCheckQueryDto, CaseNumberCheckResponseDto } from './dto/case-number-check.dto.js';
import { CaseDetailDto, CaseListResponseDto, CaseYearsResponseDto } from './dto/case-response.dto.js';
import { ChangeCaseStatusDto } from './dto/change-case-status.dto.js';
import { CreateCaseFormDto } from './dto/create-case-form.dto.js';
import { CreateCaseDto } from './dto/create-case.dto.js';
import { DeadlinePreviewQueryDto, DeadlinePreviewResponseDto } from './dto/deadline-preview.dto.js';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto.js';
import { ListCasesQueryDto } from './dto/list-cases-query.dto.js';
import { SetCaseDepartmentsDto } from './dto/set-case-departments.dto.js';
import { SetCaseQuestionsDto } from './dto/set-case-questions.dto.js';
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
    private readonly analysisService: CaseAnalysisService,
  ) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({
    summary: 'Read a request file before registering it',
    description:
      'Upload the request (PDF/DOCX/DOC) to get its text and the case number, receipt date and subject found ' +
      'in it, for prefilling the form. Nothing is stored: register the confirmed data with `POST /cases`.',
  })
  @ApiOkResponse({ type: CaseAnalysisResponseDto })
  @ApiBadRequestResponse({ description: 'Missing file' })
  @ApiPayloadTooLargeResponse({ description: 'File too large' })
  @ApiUnsupportedMediaTypeResponse({ description: 'Not a PDF, DOCX or DOC file' })
  analyze(@UploadedFile() file: Express.Multer.File | undefined): Promise<CaseAnalysisResponseDto> {
    return this.analysisService.analyze(file);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({ type: CreateCaseFormDto })
  @ApiOperation({
    summary: 'Register a new request',
    description:
      'Send the data confirmed by the official, as JSON or as multipart/form-data with the request `file`, ' +
      'which is attached to the case. Assigns the next sequence number of the year and computes the ' +
      '14-day statutory deadline.',
  })
  @ApiCreatedResponse({ type: CaseDetailDto })
  @ApiBadRequestResponse({ description: 'Invalid body, future receipt date or unknown assignee' })
  @ApiConflictResponse({
    description:
      'Case number or its sequence number is already used; `code` is CASE_NUMBER_TAKEN or SEQUENCE_NUMBER_TAKEN',
  })
  @ApiPayloadTooLargeResponse({ description: 'File too large' })
  @ApiUnsupportedMediaTypeResponse({ description: 'Not a PDF, DOCX or DOC file' })
  create(
    @Body() dto: CreateCaseDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<CaseDetailDto> {
    return this.casesService.create(dto, user, file);
  }

  @Get()
  @ApiOperation({
    summary: 'List the request register for a year',
    description:
      'Filter by status, extension and text; sort by receipt or by the nearest deadline (oldest received ' +
      'first by default). Each row carries `urgency` and `daysLeft` for highlighting.',
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

  @Get('calendar')
  @ApiOperation({
    summary: 'Cases by deadline for the calendar',
    description:
      'Every case whose deadline in force (the extended deadline, otherwise the statutory one) falls between ' +
      '`from` and `to`, inclusive, regardless of the receipt year. Answered cases are included. ' +
      'The range can be at most 93 days.',
  })
  @ApiOkResponse({ type: CaseCalendarResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid date, `to` before `from`, or range longer than 93 days' })
  calendar(@Query() query: CaseCalendarQueryDto): Promise<CaseCalendarResponseDto> {
    return this.casesService.calendar(query);
  }

  @Get('deadline-preview')
  @ApiOperation({
    summary: 'Preview the deadline for a receipt date',
    description:
      'The statutory deadline `POST /cases` would compute (14 days, moved past weekends and public ' +
      'holidays) and the latest extended deadline, for showing in the form before saving.',
  })
  @ApiOkResponse({ type: DeadlinePreviewResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or future date' })
  previewDeadline(@Query() query: DeadlinePreviewQueryDto): DeadlinePreviewResponseDto {
    return this.casesService.previewDeadline(query);
  }

  @Get('case-number-check')
  @ApiOperation({
    summary: 'Check whether a case number is free',
    description:
      'For validating the case number field before saving: `available: false` with the `conflict` that ' +
      '`POST /cases` or `PATCH /cases/:id` would return as 409.',
  })
  @ApiOkResponse({ type: CaseNumberCheckResponseDto })
  checkCaseNumber(@Query() query: CaseNumberCheckQueryDto): Promise<CaseNumberCheckResponseDto> {
    return this.casesService.checkCaseNumber(query);
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
    description:
      'Sets or changes the extended deadline (max 2 months from receipt). The status does not change; ' +
      'the extension is recorded in the history.',
  })
  @ApiOkResponse({ type: CaseDetailDto })
  @ApiBadRequestResponse({ description: 'Date not after the statutory deadline or beyond 2 months' })
  @ApiNotFoundResponse({ description: 'Case not found' })
  @ApiConflictResponse({ description: 'The response was already sent, or the case was changed meanwhile' })
  extendDeadline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendDeadlineDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CaseDetailDto> {
    return this.casesService.extendDeadline(id, dto, user);
  }

  @Delete(':id/extension')
  @ApiOperation({
    summary: 'Withdraw the deadline extension',
    description: 'For an extension set by mistake: the statutory deadline applies again.',
  })
  @ApiOkResponse({ type: CaseDetailDto })
  @ApiNotFoundResponse({ description: 'Case not found' })
  @ApiConflictResponse({
    description: 'Not extended, the response was already sent, or the case was changed meanwhile',
  })
  cancelExtension(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<CaseDetailDto> {
    return this.casesService.cancelExtension(id, user);
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

  @Put(':id/questions')
  @ApiOperation({
    summary: 'Set the questions of a request',
    description:
      'Replaces the list with the questions confirmed by the official (e.g. suggested by `POST /cases/analyze`), ' +
      'each optionally assigned to the department that answers it.',
  })
  @ApiOkResponse({ type: CaseDetailDto })
  @ApiBadRequestResponse({ description: 'Invalid body or unknown department' })
  @ApiNotFoundResponse({ description: 'Case not found' })
  setQuestions(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetCaseQuestionsDto): Promise<CaseDetailDto> {
    return this.casesService.setQuestions(id, dto);
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
