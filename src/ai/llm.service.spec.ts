import type { ConfigService } from '@nestjs/config';
import { AiNotConfiguredError } from './errors/ai-not-configured.error.js';
import { LlmService } from './llm.service.js';

const config = (apiKey?: string) =>
  ({
    get: () => apiKey,
    getOrThrow: (key: string) =>
      ({ OPENAI_MODEL: 'gpt-4.1-mini', OPENAI_EMBEDDING_MODEL: 'text-embedding-3-small', OPENAI_TIMEOUT_MS: 1000 })[
        key
      ],
  }) as unknown as ConfigService;

describe('LlmService without an API key', () => {
  const llm = new LlmService(config());

  it('reports that it is not configured', () => {
    expect(llm.isConfigured()).toBe(false);
    expect(new LlmService(config('sk-test')).isConfigured()).toBe(true);
  });

  it('throws AiNotConfiguredError, not a request failure', async () => {
    await expect(llm.embedQuery('pytanie')).rejects.toBeInstanceOf(AiNotConfiguredError);
    await expect(llm.embedDocuments(['tekst'])).rejects.toBeInstanceOf(AiNotConfiguredError);
  });
});
