import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/environment/environment-variables.validation.js';
import { StoredFileNotFoundError } from './errors/stored-file-not-found.error.js';
import type { StoredFile } from './interfaces/stored-file.interface.js';

const STORAGE_KEY = /^[0-9a-f-]{36}$/;

/**
 * Keeps uploaded files on the local disk under UPLOAD_DIR, named by a random
 * key, so the app needs no external service and works offline. Files are
 * never served directly; callers stream them after checking access.
 */
@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = path.resolve(config.getOrThrow<EnvironmentVariables['UPLOAD_DIR']>('UPLOAD_DIR'));
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.root, { recursive: true });
  }

  async save(content: Buffer): Promise<StoredFile> {
    const storageKey = randomUUID();
    const filePath = this.pathFor(storageKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, { flag: 'wx' });

    return {
      storageKey,
      sizeBytes: content.length,
      sha256: createHash('sha256').update(content).digest('hex'),
    };
  }

  /** @throws {StoredFileNotFoundError} */
  async openReadStream(storageKey: string): Promise<ReadStream> {
    const filePath = this.pathFor(storageKey);
    try {
      await access(filePath);
    } catch {
      throw new StoredFileNotFoundError(storageKey);
    }
    return createReadStream(filePath);
  }

  /** Best effort: a missing file is not an error, other failures are logged. */
  async delete(storageKey: string): Promise<void> {
    try {
      await rm(this.pathFor(storageKey), { force: true });
    } catch (error) {
      this.logger.warn(`Could not delete stored file ${storageKey}: ${String(error)}`);
    }
  }

  async deleteMany(storageKeys: string[]): Promise<void> {
    await Promise.all(storageKeys.map((key) => this.delete(key)));
  }

  /** Two-level fan-out (ab/abcdef…) keeps directories small with many files. */
  private pathFor(storageKey: string): string {
    if (!STORAGE_KEY.test(storageKey)) {
      throw new Error(`Invalid storage key "${storageKey}"`);
    }
    return path.join(this.root, storageKey.slice(0, 2), storageKey);
  }
}
