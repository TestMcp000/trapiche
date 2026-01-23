/**
 * Judge Write IO Module
 * @see doc/specs/completed/DATA_PREPROCESSING.md §5.3
 *
 * Server-only module for persisting quality scores from LLM-as-a-Judge
 * evaluations to the embeddings table.
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { EmbeddingTargetType } from '@/lib/types/embedding';
import type { JudgeResult } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Quality Score Persistence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive quality status from score.
 * - >= 0.7: passed
 * - >= 0.5: incomplete
 * - < 0.5: failed
 */
function deriveQualityStatus(score: number): 'passed' | 'incomplete' | 'failed' {
  if (score >= 0.7) {
    return 'passed';
  }
  if (score >= 0.5) {
    return 'incomplete';
  }
  return 'failed';
}

/**
 * Update quality score in embeddings table.
 *
 * @param targetType - Embedding target type
 * @param targetId - Target entity ID
 * @param chunkIndex - Chunk index (0 for single chunk)
 * @param result - Judge result
 */
export async function updateEmbeddingQualityScore(
  targetType: EmbeddingTargetType,
  targetId: string,
  chunkIndex: number,
  result: JudgeResult
): Promise<{ success: boolean; error?: string }> {
  if (!result.success || result.score === undefined) {
    return { success: false, error: 'Invalid judge result' };
  }

  const supabase = createAdminClient();
  const qualityStatus = deriveQualityStatus(result.score);

  const { error } = await supabase
    .from('embeddings')
    .update({
      quality_score: result.score,
      quality_status: qualityStatus,
      quality_check_at: new Date().toISOString(),
      preprocessing_metadata: {
        judge_model: result.model,
        judge_reason: result.reason,
        judge_standalone: result.standalone,
      },
    })
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('chunk_index', chunkIndex);

  if (error) {
    console.error('[updateEmbeddingQualityScore] Update error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Batch update quality scores for multiple chunks.
 */
export async function updateEmbeddingQualityScoresBatch(
  targetType: EmbeddingTargetType,
  targetId: string,
  results: Array<{ chunkIndex: number; result: JudgeResult }>
): Promise<{ updated: number; failed: number }> {
  let updated = 0;
  let failed = 0;

  for (const { chunkIndex, result } of results) {
    const updateResult = await updateEmbeddingQualityScore(
      targetType,
      targetId,
      chunkIndex,
      result
    );

    if (updateResult.success) {
      updated++;
    } else {
      failed++;
    }
  }

  return { updated, failed };
}
