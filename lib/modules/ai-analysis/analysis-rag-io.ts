/**
 * AI Analysis RAG Data Pipeline
 *
 * Server-only module for RAG (Retrieval-Augmented Generation) data retrieval.
 * Uses semantic search to retrieve relevant chunks for analysis.
 *
 * @module lib/modules/ai-analysis/analysis-rag-io
 * @see uiux_refactor.md §6.3.2 item 4
 */

import 'server-only';

import type { AnalysisTemplateId, RAGConfig } from '@/lib/types/ai-analysis';
import { RAG_DEFAULTS } from '@/lib/types/ai-analysis';
import { semanticSearch } from '@/lib/modules/embedding/embedding-io';
import { deidentifyData } from './analysis-pure';

// =============================================================================
// Types
// =============================================================================

/**
 * Retrieved chunk with source information.
 */
export interface RAGChunk {
  /** Content of the retrieved chunk */
  content: string;
  /** Source type (product/post/gallery_item) */
  sourceType: string;
  /** Source ID for reference */
  sourceId: string;
  /** Similarity score (0-1) */
  similarity: number;
  /** Chunk index within the source */
  chunkIndex: number;
}

/**
 * RAG context result with metadata.
 */
export interface RAGContext {
  /** Retrieved and formatted chunks */
  chunks: RAGChunk[];
  /** Total chunks retrieved */
  totalRetrieved: number;
  /** Query used for retrieval */
  query: string;
}

// =============================================================================
// Query Builders
// =============================================================================

/**
 * Build semantic search query from template.
 * Different templates need different retrieval queries.
 */
function buildQueryForTemplate(templateId: AnalysisTemplateId): string {
  // Custom templates don't have predefined queries - they should use their own prompt text
  if (templateId === 'custom') {
    return 'general analysis data patterns recommendations';
  }

  const queries: Record<Exclude<AnalysisTemplateId, 'custom'>, string> = {
    user_behavior: 'user behavior patterns engagement activity comments interactions',
    sales: 'sales revenue products orders transactions pricing performance',
    rfm: 'customer purchase frequency recency monetary value loyalty segmentation',
    content_recommendation: 'content product correlation engagement conversion recommendation',
  };

  return queries[templateId];
}

// =============================================================================
// RAG Data Fetching
// =============================================================================

/**
 * Fetch RAG context for analysis using semantic search.
 * Optionally applies re-ranking for improved precision.
 *
 * @param templateId - Analysis template to tailor retrieval query
 * @param config - RAG configuration (topK, threshold, rerank)
 * @returns Promise<RAGContext> with retrieved chunks
 */
export async function fetchRagContextForAnalysis(
  templateId: AnalysisTemplateId,
  config?: Partial<RAGConfig>
): Promise<RAGContext> {
  const topK = config?.topK ?? RAG_DEFAULTS.TOP_K;
  const threshold = config?.threshold ?? RAG_DEFAULTS.THRESHOLD;

  // Build query from template
  const query = buildQueryForTemplate(templateId);

  // Perform semantic search (coarse retrieval)
  const searchResults = await semanticSearch({
    query,
    limit: topK,
    threshold,
    // Search across all types relevant to analysis
    targetTypes: ['product', 'post', 'gallery_item'],
  });

  // Apply re-ranking if configured (Phase 6.5+)
  let rankedResults = searchResults;
  if (config?.rerank?.enabled !== false) {
    try {
      const { isRerankEnabled, rerank } = await import('@/lib/rerank/io');
      
      if (await isRerankEnabled(config?.rerank)) {
        // Build candidates for re-ranking
        const candidates = searchResults.map((result) => ({
          targetType: result.targetType,
          targetId: result.targetId,
          chunkIndex: result.chunkIndex ?? 0,
          content: `[${result.targetType}:${result.targetId}] (chunk ${result.chunkIndex ?? 0})`,
          coarseScore: result.similarity,
        }));

        // Re-rank candidates
        const reranked = await rerank(query, candidates, {
          ...config?.rerank,
          topN: config?.rerank?.topN ?? 10,
        });

        // Map back to search results format with updated scores
        rankedResults = reranked.map((r) => ({
          targetType: r.targetType,
          targetId: r.targetId,
          similarity: r.fineScore, // Use fine score from re-ranker
          chunkIndex: r.chunkIndex,
        }));
      }
    } catch (error) {
      // Graceful degradation: if re-rank fails, continue with original results
      console.warn('[fetchRagContextForAnalysis] Re-ranking failed, using coarse results:', error);
    }
  }

  // Transform to RAGChunk format
  const chunks: RAGChunk[] = rankedResults.map((result) => ({
    content: `[${result.targetType}:${result.targetId}] (chunk ${result.chunkIndex ?? 0})`,
    sourceType: result.targetType,
    sourceId: result.targetId,
    similarity: result.similarity,
    chunkIndex: result.chunkIndex ?? 0,
  }));

  return {
    chunks,
    totalRetrieved: chunks.length,
    query,
  };
}

/**
 * Build flattened data from RAG context for LLM consumption.
 * Returns deidentified records with source references.
 *
 * @param context - RAG context with retrieved chunks
 * @returns Deidentified records ready for LLM
 */
export function buildRagDataFromContext(
  context: RAGContext
): Record<string, unknown>[] {
  const records = context.chunks.map((chunk) => ({
    _dataType: 'rag_context',
    _sourceType: chunk.sourceType,
    _sourceId: chunk.sourceId,
    _similarity: chunk.similarity,
    _chunkIndex: chunk.chunkIndex,
    content: chunk.content,
  }));

  // Apply deidentification as safety layer
  return deidentifyData(records);
}

/**
 * Check if RAG mode is available.
 * Returns true if semantic search is enabled (embeddings exist).
 */
export async function isRagModeAvailable(): Promise<boolean> {
  try {
    // Import dynamically to avoid circular dependency
    const { isSemanticSearchEnabled } = await import('@/lib/modules/embedding/embedding-io');
    return isSemanticSearchEnabled();
  } catch {
    return false;
  }
}
