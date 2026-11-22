/** Machine-readable `code` of AI errors in HTTP responses. */
export enum AiErrorCode {
  /** 503: OPENAI_API_KEY is not set. */
  NotConfigured = 'AI_NOT_CONFIGURED',
  /** 502: the OpenAI request failed or timed out. */
  RequestFailed = 'AI_REQUEST_FAILED',
}
