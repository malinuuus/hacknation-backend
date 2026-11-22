export class AiNotConfiguredError extends Error {
  constructor() {
    super('AI is not configured: set OPENAI_API_KEY to use this feature');
    this.name = 'AiNotConfiguredError';
  }
}
