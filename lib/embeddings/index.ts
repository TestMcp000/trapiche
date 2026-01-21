/**
 * Embeddings platform facade (server-only).
 *
 * This provides a non-`lib/modules/*` import surface so other modules can
 * reuse embedding/search/queue logic without cross-module imports.
 */

import 'server-only';

export * from '@/lib/modules/embedding/embedding-generate-io';
export * from '@/lib/modules/embedding/embedding-queue-io';
export * from '@/lib/modules/embedding/embedding-lease-io';
export * from '@/lib/modules/embedding/embedding-search-io';
export * from '@/lib/modules/embedding/embedding-target-content-io';
export * from '@/lib/modules/embedding/embedding-pure';

