import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { TextExtractionService } from './text-extraction.service.js';

@Module({
  imports: [AiModule],
  providers: [TextExtractionService],
  exports: [TextExtractionService],
})
export class TextExtractionModule {}
