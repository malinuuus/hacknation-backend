import type { ReadStream } from 'node:fs';

export interface KnowledgeDownload {
  stream: ReadStream;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
