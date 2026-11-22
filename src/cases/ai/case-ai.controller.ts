import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { toAiHttpError } from '../../ai/helpers/ai-http-error.helper.js';
import { ACCESS_TOKEN_COOKIE } from '../../auth/auth-cookie.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { DraftResponseDto, GenerateDraftResponseDto } from '../dto/draft-response.dto.js';
import { RedactionSuggestionsRequestDto, RedactionSuggestionsResponseDto } from '../dto/redaction-suggestions.dto.js';
import { DraftResponseService } from './draft-response.service.js';
import { RedactionSuggestionsService } from './redaction-suggestions.service.js';

@ApiTags('Cases – AI')
@ApiCookieAuth(ACCESS_TOKEN_COOKIE)
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiServiceUnavailableResponse({ description: 'AI not configured; `code` is AI_NOT_CONFIGURED' })
@ApiBadGatewayResponse({ description: 'The AI request failed or timed out; `code` is AI_REQUEST_FAILED' })
@UseGuards(JwtAuthGuard)
@Controller('cases/:id')
export class CaseAiController {
  constructor(
    private readonly draftResponseService: DraftResponseService,
    private readonly redactionService: RedactionSuggestionsService,
  ) {}

  @Post('draft-response')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Draft the response with AI',
    description:
      'Answers the questions of the case from the attached department replies (DEPARTMENT_RESPONSE) and ' +
      '`notes`, using the knowledge base for the legal basis and wording. Missing information is marked ' +
      '[UZUPEŁNIJ: …]. Nothing is stored.',
  })
  @ApiOkResponse({ type: DraftResponseDto })
  @ApiBadRequestResponse({ description: 'Unknown question ids, or nothing to answer' })
  @ApiNotFoundResponse({ description: 'Case not found' })
  async draftResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateDraftResponseDto,
  ): Promise<DraftResponseDto> {
    try {
      return await this.draftResponseService.generate(id, dto);
    } catch (error) {
      throw toAiHttpError(error);
    }
  }

  @Post('redaction-suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suggest what to anonymise',
    description:
      'Finds personal data and other protected information in the text (e.g. the draft response), following ' +
      'the anonymisation guidelines from the knowledge base. Every suggested fragment occurs verbatim in the text.',
  })
  @ApiOkResponse({ type: RedactionSuggestionsResponseDto })
  @ApiNotFoundResponse({ description: 'Case not found' })
  async redactionSuggestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RedactionSuggestionsRequestDto,
  ): Promise<RedactionSuggestionsResponseDto> {
    try {
      return await this.redactionService.suggest(id, dto);
    } catch (error) {
      throw toAiHttpError(error);
    }
  }
}
