import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { AiModule } from '../ai/ai.module.js';
import { AuthModule } from '../auth/auth.module.js';
import type { EnvironmentVariables } from '../config/environment/environment-variables.validation.js';
import { StorageModule } from '../storage/storage.module.js';
import { TextExtractionModule } from '../text-extraction/text-extraction.module.js';
import { KnowledgeIndexer } from './knowledge-indexer.service.js';
import { KnowledgeRetriever } from './knowledge-retriever.service.js';
import { KnowledgeController } from './knowledge.controller.js';
import { KnowledgeRepository } from './knowledge.repository.js';
import { KnowledgeService } from './knowledge.service.js';

const BYTES_PER_MB = 1024 * 1024;

@Module({
  imports: [
    AuthModule,
    AiModule,
    StorageModule,
    TextExtractionModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: {
          fileSize:
            config.getOrThrow<EnvironmentVariables['UPLOAD_MAX_FILE_SIZE_MB']>('UPLOAD_MAX_FILE_SIZE_MB') *
            BYTES_PER_MB,
          files: 1,
          fields: 10,
        },
      }),
    }),
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, KnowledgeRepository, KnowledgeIndexer, KnowledgeRetriever],
  exports: [KnowledgeRetriever],
})
export class KnowledgeModule {}
