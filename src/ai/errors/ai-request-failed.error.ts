export class AiRequestFailedError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`The AI request failed (${operation}): ${cause instanceof Error ? cause.message : String(cause)}`, {
      cause,
    });
    this.name = 'AiRequestFailedError';
  }
}
