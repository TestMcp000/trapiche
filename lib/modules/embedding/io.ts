/**
 * Embedding Module IO Facade
 * @see doc/specs/completed/SUPABASE_AI.md
 * @see uiux_refactor.md §6.3
 *
 * Main facade for embedding module.
 * Re-exports all functions from embedding-io.ts.
 */
import 'server-only';

// Re-export everything from the main embedding IO facade
export * from './embedding-io';

// Re-export pure functions separately (they can be imported from here or directly)
export {
  stripHtml,
  stripMarkdown,
  stripHtmlAndMarkdown,
  normalizeWhitespace,
  estimateTokenCount,
  truncateToTokenLimit,
  hashContent,
  composeProductContent,
  composePostContent,
  composeGalleryItemContent,
  composeCommentContent,
  composeEmbeddingContent,
  prepareContentForEmbedding,
} from './embedding-pure';
