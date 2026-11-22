/** Whether the AI took part in reading a request file. */
export enum AiAnalysisStatus {
  /** Suggestions combine the AI and pattern matching. */
  Used = 'USED',
  /** OPENAI_API_KEY is not set: pattern matching only, no questions or departments. */
  NotConfigured = 'NOT_CONFIGURED',
  /** The AI request failed: pattern matching only. */
  Failed = 'FAILED',
  /** No text could be read from the file, so there was nothing to analyse. */
  SkippedNoText = 'SKIPPED_NO_TEXT',
}
