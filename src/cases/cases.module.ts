import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { AiModule } from '../ai/ai.module.js';
import { AuthModule } from '../auth/auth.module.js';
import type { EnvironmentVariables } from '../config/environment/environment-variables.validation.js';
import { DepartmentsModule } from '../departments/departments.module.js';
import { KnowledgeModule } from '../knowledge/knowledge.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { TextExtractionModule } from '../text-extraction/text-extraction.module.js';
import { CaseAiController } from './ai/case-ai.controller.js';
import { DraftResponseService } from './ai/draft-response.service.js';
import { RedactionSuggestionsService } from './ai/redaction-suggestions.service.js';
import { RequestExtractionService } from './ai/request-extraction.service.js';
import { CaseAnalysisService } from './case-analysis.service.js';
import { CaseDocumentsController } from './case-documents.controller.js';
import { CaseDocumentsRepository } from './case-documents.repository.js';
import { CaseDocumentsService } from './case-documents.service.js';
import { CasesController } from './cases.controller.js';
import { CasesRepository } from './cases.repository.js';
import { CasesService } from './cases.service.js';

const BYTES_PER_MB = 1024 * 1024;

@Module({
  imports: [
    AuthModule,
    AiModule,
    DepartmentsModule,
    KnowledgeModule,
    StorageModule,
    TextExtractionModule,
    // files are kept in memory only while being checked, then written by FileStorageService.
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: {
          fileSize:
            config.getOrThrow<EnvironmentVariables['UPLOAD_MAX_FILE_SIZE_MB']>('UPLOAD_MAX_FILE_SIZE_MB') *
            BYTES_PER_MB,
          files: 1,
          fields: 20,
        },
      }),
    }),
  ],
  controllers: [CasesController, CaseDocumentsController, CaseAiController],
  providers: [
    CasesService,
    CasesRepository,
    CaseDocumentsService,
    CaseDocumentsRepository,
    CaseAnalysisService,
    RequestExtractionService,
    DraftResponseService,
    RedactionSuggestionsService,
  ],
})
export class CasesModule {}
