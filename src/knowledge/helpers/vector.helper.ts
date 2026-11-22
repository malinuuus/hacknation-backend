import { EMBEDDING_DIMENSIONS } from '../../ai/ai.constants.js';

/** pgvector text literal, e.g. `[0.1,0.2]`, to be cast with `::vector`. */
export function toVectorLiteral(embedding: number[]): string {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new RangeError(`Expected an embedding of ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`);
  }
  if (!embedding.every(Number.isFinite)) {
    throw new RangeError('The embedding contains a non-finite value');
  }
  return `[${embedding.join(',')}]`;
}
