/**
 * @file tests/preprocessing-idempotency.test.ts
 * @description Unit tests for preprocessing idempotency pure functions.
 * @see lib/modules/preprocessing/idempotency.ts
 * @see ARCHITECTURE.md §4.3 - Pure modules
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  compareChunksForIdempotency,
  type ChunkHashPair,
  type ExistingChunkInfo,
} from '@/lib/modules/preprocessing/idempotency';

describe('compareChunksForIdempotency', () => {
  it('returns true when chunks match exactly', () => {
    const existing: ExistingChunkInfo[] = [
      { chunkIndex: 0, contentHash: 'hash-a', qualityStatus: 'passed' },
      { chunkIndex: 1, contentHash: 'hash-b', qualityStatus: 'passed' },
    ];
    const newChunks: ChunkHashPair[] = [
      { text: 'text-a', hash: 'hash-a' },
      { text: 'text-b', hash: 'hash-b' },
    ];

    const result = compareChunksForIdempotency(existing, newChunks);
    assert.strictEqual(result, true);
  });

  it('returns false when chunk count differs (more new chunks)', () => {
    const existing: ExistingChunkInfo[] = [
      { chunkIndex: 0, contentHash: 'hash-a', qualityStatus: 'passed' },
    ];
    const newChunks: ChunkHashPair[] = [
      { text: 'text-a', hash: 'hash-a' },
      { text: 'text-b', hash: 'hash-b' },
    ];

    const result = compareChunksForIdempotency(existing, newChunks);
    assert.strictEqual(result, false);
  });

  it('returns false when chunk count differs (fewer new chunks)', () => {
    const existing: ExistingChunkInfo[] = [
      { chunkIndex: 0, contentHash: 'hash-a', qualityStatus: 'passed' },
      { chunkIndex: 1, contentHash: 'hash-b', qualityStatus: 'passed' },
    ];
    const newChunks: ChunkHashPair[] = [{ text: 'text-a', hash: 'hash-a' }];

    const result = compareChunksForIdempotency(existing, newChunks);
    assert.strictEqual(result, false);
  });

  it('returns false when content hash differs', () => {
    const existing: ExistingChunkInfo[] = [
      { chunkIndex: 0, contentHash: 'hash-a', qualityStatus: 'passed' },
      { chunkIndex: 1, contentHash: 'hash-b', qualityStatus: 'passed' },
    ];
    const newChunks: ChunkHashPair[] = [
      { text: 'text-a', hash: 'hash-a' },
      { text: 'text-b-modified', hash: 'hash-b-modified' },
    ];

    const result = compareChunksForIdempotency(existing, newChunks);
    assert.strictEqual(result, false);
  });

  it('returns false when quality status is not passed', () => {
    const existing: ExistingChunkInfo[] = [
      { chunkIndex: 0, contentHash: 'hash-a', qualityStatus: 'passed' },
      { chunkIndex: 1, contentHash: 'hash-b', qualityStatus: 'failed' },
    ];
    const newChunks: ChunkHashPair[] = [
      { text: 'text-a', hash: 'hash-a' },
      { text: 'text-b', hash: 'hash-b' },
    ];

    const result = compareChunksForIdempotency(existing, newChunks);
    assert.strictEqual(result, false);
  });

  it('returns false when quality status is incomplete', () => {
    const existing: ExistingChunkInfo[] = [
      { chunkIndex: 0, contentHash: 'hash-a', qualityStatus: 'incomplete' },
    ];
    const newChunks: ChunkHashPair[] = [{ text: 'text-a', hash: 'hash-a' }];

    const result = compareChunksForIdempotency(existing, newChunks);
    assert.strictEqual(result, false);
  });

  it('returns false when existing chunk index is missing', () => {
    const existing: ExistingChunkInfo[] = [
      { chunkIndex: 0, contentHash: 'hash-a', qualityStatus: 'passed' },
      { chunkIndex: 2, contentHash: 'hash-c', qualityStatus: 'passed' }, // Missing index 1
    ];
    const newChunks: ChunkHashPair[] = [
      { text: 'text-a', hash: 'hash-a' },
      { text: 'text-b', hash: 'hash-b' },
    ];

    const result = compareChunksForIdempotency(existing, newChunks);
    assert.strictEqual(result, false);
  });

  it('handles empty arrays (both empty)', () => {
    const existing: ExistingChunkInfo[] = [];
    const newChunks: ChunkHashPair[] = [];

    const result = compareChunksForIdempotency(existing, newChunks);
    assert.strictEqual(result, true);
  });

  it('returns false when existing is empty but new has chunks', () => {
    const existing: ExistingChunkInfo[] = [];
    const newChunks: ChunkHashPair[] = [{ text: 'text-a', hash: 'hash-a' }];

    const result = compareChunksForIdempotency(existing, newChunks);
    assert.strictEqual(result, false);
  });

  it('returns false when new is empty but existing has chunks', () => {
    const existing: ExistingChunkInfo[] = [
      { chunkIndex: 0, contentHash: 'hash-a', qualityStatus: 'passed' },
    ];
    const newChunks: ChunkHashPair[] = [];

    const result = compareChunksForIdempotency(existing, newChunks);
    assert.strictEqual(result, false);
  });

  it('handles unordered existing chunks correctly', () => {
    // Existing chunks may not be in order
    const existing: ExistingChunkInfo[] = [
      { chunkIndex: 2, contentHash: 'hash-c', qualityStatus: 'passed' },
      { chunkIndex: 0, contentHash: 'hash-a', qualityStatus: 'passed' },
      { chunkIndex: 1, contentHash: 'hash-b', qualityStatus: 'passed' },
    ];
    const newChunks: ChunkHashPair[] = [
      { text: 'text-a', hash: 'hash-a' },
      { text: 'text-b', hash: 'hash-b' },
      { text: 'text-c', hash: 'hash-c' },
    ];

    const result = compareChunksForIdempotency(existing, newChunks);
    assert.strictEqual(result, true);
  });
});
