import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { z } from 'zod';
import type { EnvironmentVariables } from '../config/environment/environment-variables.validation.js';
import { EMBEDDING_DIMENSIONS } from './ai.constants.js';
import { AiNotConfiguredError } from './errors/ai-not-configured.error.js';
import { AiRequestFailedError } from './errors/ai-request-failed.error.js';
import type { StructuredPrompt } from './interfaces/structured-prompt.interface.js';

const MAX_RETRIES = 2;
const EMBEDDING_BATCH_SIZE = 256;

/**
 * The single entry point to the language model (OpenAI through LangChain).
 * Works without an API key: `isConfigured()` is then false and every call
 * throws `AiNotConfiguredError`, so the rest of the app keeps running.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly embeddingModel: string;
  private readonly timeout: number;
  private chat?: ChatOpenAI;
  private embeddings?: OpenAIEmbeddings;

  constructor(config: ConfigService) {
    this.apiKey = config.get<EnvironmentVariables['OPENAI_API_KEY']>('OPENAI_API_KEY');
    this.model = config.getOrThrow<EnvironmentVariables['OPENAI_MODEL']>('OPENAI_MODEL');
    this.embeddingModel = config.getOrThrow<EnvironmentVariables['OPENAI_EMBEDDING_MODEL']>('OPENAI_EMBEDDING_MODEL');
    this.timeout = config.getOrThrow<EnvironmentVariables['OPENAI_TIMEOUT_MS']>('OPENAI_TIMEOUT_MS');
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Asks the model for an answer matching `schema` (OpenAI structured outputs).
   *
   * @param name Identifies the call in logs and in the schema sent to OpenAI.
   * @throws {AiNotConfiguredError}
   * @throws {AiRequestFailedError}
   */
  async structured<T extends Record<string, unknown>>(
    name: string,
    schema: z.ZodType<T>,
    prompt: StructuredPrompt,
  ): Promise<T> {
    const model = this.getChat().withStructuredOutput<T>(schema, { name, method: 'jsonSchema', strict: true });
    const startedAt = Date.now();
    try {
      const result = await model.invoke([new SystemMessage(prompt.system), new HumanMessage(prompt.user)]);
      this.logger.log(`${name}: answered in ${Date.now() - startedAt} ms`);
      return result;
    } catch (error) {
      this.logger.warn(`${name}: failed after ${Date.now() - startedAt} ms: ${String(error)}`);
      throw new AiRequestFailedError(name, error);
    }
  }

  /**
   * @throws {AiNotConfiguredError}
   * @throws {AiRequestFailedError}
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }
    const embeddings = this.getEmbeddings();
    try {
      return await embeddings.embedDocuments(texts);
    } catch (error) {
      throw new AiRequestFailedError('embedDocuments', error);
    }
  }

  /**
   * @throws {AiNotConfiguredError}
   * @throws {AiRequestFailedError}
   */
  async embedQuery(text: string): Promise<number[]> {
    const embeddings = this.getEmbeddings();
    try {
      return await embeddings.embedQuery(text);
    } catch (error) {
      throw new AiRequestFailedError('embedQuery', error);
    }
  }

  private getChat(): ChatOpenAI {
    this.chat ??= new ChatOpenAI({
      apiKey: this.requireApiKey(),
      model: this.model,
      temperature: 0,
      timeout: this.timeout,
      maxRetries: MAX_RETRIES,
    });
    return this.chat;
  }

  private getEmbeddings(): OpenAIEmbeddings {
    this.embeddings ??= new OpenAIEmbeddings({
      apiKey: this.requireApiKey(),
      model: this.embeddingModel,
      dimensions: EMBEDDING_DIMENSIONS,
      batchSize: EMBEDDING_BATCH_SIZE,
      timeout: this.timeout,
      maxRetries: MAX_RETRIES,
    });
    return this.embeddings;
  }

  private requireApiKey(): string {
    if (!this.apiKey) {
      throw new AiNotConfiguredError();
    }
    return this.apiKey;
  }
}
