import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { AiErrorCode } from '../enums/ai-error-code.enum.js';
import { AiNotConfiguredError } from '../errors/ai-not-configured.error.js';
import { AiRequestFailedError } from '../errors/ai-request-failed.error.js';

export function toAiHttpError(error: unknown): unknown {
  if (error instanceof AiNotConfiguredError) {
    return new ServiceUnavailableException({
      statusCode: 503,
      error: 'Service Unavailable',
      message: error.message,
      code: AiErrorCode.NotConfigured,
    });
  }
  if (error instanceof AiRequestFailedError) {
    return new BadGatewayException({
      statusCode: 502,
      error: 'Bad Gateway',
      message: 'The AI service did not respond correctly; try again',
      code: AiErrorCode.RequestFailed,
    });
  }
  return error;
}
