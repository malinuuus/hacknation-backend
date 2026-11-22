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
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth-cookie.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { attachmentContentDisposition } from '../cases/helpers/file-name.helper.js';
import { CreateKnowledgeDocumentDto } from './dto/create-knowledge-document.dto.js';
import {
  KnowledgeDocumentDetailDto,
  KnowledgeDocumentDto,
  KnowledgeDocumentListResponseDto,
} from './dto/knowledge-document-response.dto.js';
import { ListKnowledgeQueryDto } from './dto/list-knowledge-query.dto.js';
import { KnowledgeSearchResponseDto, SearchKnowledgeDto } from './dto/search-knowledge.dto.js';
import { UpdateKnowledgeDocumentDto } from './dto/update-knowledge-document.dto.js';
import { KnowledgeService } from './knowledge.service.js';

@ApiTags('Knowledge base')
@ApiCookieAuth(ACCESS_TOKEN_COOKIE)
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateKnowledgeDocumentDto })
  @ApiOperation({
    summary: 'Add a file to the knowledge base',
    description:
      'The text is read, split into fragments and embedded, so the AI can use it when matching departments, ' +
      'drafting responses and suggesting anonymisation. Without OPENAI_API_KEY the file is stored as PENDING; ' +
      'reindex it once the key is set.',
  })
  @ApiCreatedResponse({ type: KnowledgeDocumentDto })
  @ApiBadRequestResponse({ description: 'Missing file or invalid fields' })
  @ApiPayloadTooLargeResponse({ description: 'File too large' })
  @ApiUnsupportedMediaTypeResponse({ description: 'Not a PDF, DOCX, DOC or TXT file' })
  create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateKnowledgeDocumentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<KnowledgeDocumentDto> {
    return this.knowledgeService.create(file, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List the knowledge base' })
  @ApiOkResponse({ type: KnowledgeDocumentListResponseDto })
  list(@Query() query: ListKnowledgeQueryDto): Promise<KnowledgeDocumentListResponseDto> {
    return this.knowledgeService.list(query);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search the knowledge base',
    description: 'Returns the fragments the AI would get as context for the query, most similar first.',
  })
  @ApiOkResponse({ type: KnowledgeSearchResponseDto })
  @ApiServiceUnavailableResponse({ description: 'AI not configured; `code` is AI_NOT_CONFIGURED' })
  @ApiBadGatewayResponse({ description: 'The AI request failed; `code` is AI_REQUEST_FAILED' })
  search(@Body() dto: SearchKnowledgeDto): Promise<KnowledgeSearchResponseDto> {
    return this.knowledgeService.search(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a knowledge base file’s details, including its text' })
  @ApiOkResponse({ type: KnowledgeDocumentDetailDto })
  @ApiNotFoundResponse({ description: 'Document not found' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<KnowledgeDocumentDetailDto> {
    return this.knowledgeService.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit the name, category or description' })
  @ApiOkResponse({ type: KnowledgeDocumentDto })
  @ApiNotFoundResponse({ description: 'Document not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKnowledgeDocumentDto,
  ): Promise<KnowledgeDocumentDto> {
    return this.knowledgeService.update(id, dto);
  }

  @Post(':id/reindex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Index a file again',
    description: 'For PENDING or FAILED files. Check `indexStatus` in the response.',
  })
  @ApiOkResponse({ type: KnowledgeDocumentDto })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @ApiServiceUnavailableResponse({ description: 'AI not configured; `code` is AI_NOT_CONFIGURED' })
  reindex(@Param('id', ParseUUIDPipe) id: string): Promise<KnowledgeDocumentDto> {
    return this.knowledgeService.reindex(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download the original file' })
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  )
  @ApiOkResponse({ description: 'The file', schema: { type: 'string', format: 'binary' } })
  @ApiNotFoundResponse({ description: 'Document not found' })
  async download(@Param('id', ParseUUIDPipe) id: string): Promise<StreamableFile> {
    const file = await this.knowledgeService.download(id);
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      length: file.sizeBytes,
      disposition: attachmentContentDisposition(file.fileName),
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a file from the knowledge base' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.knowledgeService.delete(id);
  }
}
