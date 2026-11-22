export class KnowledgeDocumentNotFoundError extends Error {
  constructor(id: string) {
    super(`Knowledge document "${id}" not found`);
    this.name = 'KnowledgeDocumentNotFoundError';
  }
}
