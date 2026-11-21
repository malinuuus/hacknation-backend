import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { CaseDocumentsService } from './case-documents.service.js';
import { CaseDocumentDetailDto, CaseDocumentDto } from './dto/case-document-response.dto.js';
import { UploadCaseDocumentDto } from './dto/upload-case-document.dto.js';
import { attachmentContentDisposition } from './helpers/file-name.helper.js';

@ApiTags('Case documents')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('cases/:caseId/documents')
export class CaseDocumentsController {
  constructor(private readonly documentsService: CaseDocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadCaseDocumentDto })
  @ApiOperation({
    summary: 'Attach a file to a request',
    description:
      'E.g. a department reply (DEPARTMENT_RESPONSE). Its text is read for later search and drafting. ' +
      'The file type is checked by content.',
  })
  @ApiCreatedResponse({ type: CaseDocumentDto })
  @ApiBadRequestResponse({ description: 'Missing file, or department not asked about the case' })
  @ApiNotFoundResponse({ description: 'Case not found' })
  @ApiPayloadTooLargeResponse({ description: 'File too large' })
  @ApiUnsupportedMediaTypeResponse({ description: 'Not a PDF, DOCX or DOC file' })
  upload(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadCaseDocumentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CaseDocumentDto> {
    return this.documentsService.upload(caseId, file, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List the files of a request' })
  @ApiOkResponse({ type: [CaseDocumentDto] })
  @ApiNotFoundResponse({ description: 'Case not found' })
  list(@Param('caseId', ParseUUIDPipe) caseId: string): Promise<CaseDocumentDto[]> {
    return this.documentsService.list(caseId);
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get a file’s details, including the text read from it' })
  @ApiOkResponse({ type: CaseDocumentDetailDto })
  @ApiNotFoundResponse({ description: 'Document not found' })
  get(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<CaseDocumentDetailDto> {
    return this.documentsService.get(caseId, documentId);
  }

  @Get(':documentId/download')
  @ApiOperation({ summary: 'Download the original file' })
  @ApiProduces('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  @ApiOkResponse({ description: 'The file', schema: { type: 'string', format: 'binary' } })
  @ApiNotFoundResponse({ description: 'Document not found' })
  async download(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<StreamableFile> {
    const file = await this.documentsService.download(caseId, documentId);
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      length: file.sizeBytes,
      disposition: attachmentContentDisposition(file.fileName),
    });
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  delete(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<void> {
    return this.documentsService.delete(caseId, documentId);
  }
}
