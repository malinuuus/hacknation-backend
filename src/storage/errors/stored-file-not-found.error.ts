export class StoredFileNotFoundError extends Error {
  constructor(storageKey: string) {
    super(`Stored file "${storageKey}" not found`);
    this.name = 'StoredFileNotFoundError';
  }
}
