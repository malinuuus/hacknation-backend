import { EMBEDDING_DIMENSIONS } from '../../ai/ai.constants.js';
import { toVectorLiteral } from './vector.helper.js';

describe('toVectorLiteral', () => {
  it('formats a pgvector literal', () => {
    const embedding = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => (i === 0 ? 0.5 : 0));
    expect(toVectorLiteral(embedding).startsWith('[0.5,0,')).toBe(true);
  });

  it('rejects a wrong size or non-finite values', () => {
    expect(() => toVectorLiteral([1, 2])).toThrow(RangeError);
    expect(() => toVectorLiteral(Array.from({ length: EMBEDDING_DIMENSIONS }, () => Number.NaN))).toThrow(RangeError);
  });
});
