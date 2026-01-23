/**
 * Judge Metrics IO Module
 * @see doc/specs/completed/DATA_PREPROCESSING.md §5.3
 *
 * Server-only module for querying quality metrics and failed samples
 * from the embeddings table for LLM-as-a-Judge monitoring.
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { EmbeddingTargetType } from '@/lib/types/embedding';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface QualityMetrics {
  totalEmbeddings: number;
  withQualityScore: number;
  passedCount: number;
  incompleteCount: number;
  failedCount: number;
  averageScore: number | null;
  passRate: number;
}

export interface FailedSample {
  targetType: EmbeddingTargetType;
  targetId: string;
  chunkIndex: number;
  chunkContent: string | null;
  qualityScore: number | null;
  preprocessingMetadata: Record<string, unknown> | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quality Metrics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get quality metrics for embeddings.
 */
export async function getQualityMetrics(): Promise<QualityMetrics> {
  const supabase = createAdminClient();

  // Get total and counts by status
  const [
    { count: total },
    { count: withScore },
    { count: passed },
    { count: incomplete },
    { count: failed },
  ] = await Promise.all([
    supabase.from('embeddings').select('*', { count: 'exact', head: true }),
    supabase
      .from('embeddings')
      .select('*', { count: 'exact', head: true })
      .not('quality_score', 'is', null),
    supabase
      .from('embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('quality_status', 'passed'),
    supabase
      .from('embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('quality_status', 'incomplete'),
    supabase
      .from('embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('quality_status', 'failed'),
  ]);

  // Get average score
  const { data: avgData } = await supabase
    .from('embeddings')
    .select('quality_score')
    .not('quality_score', 'is', null);

  let averageScore: number | null = null;
  if (avgData && avgData.length > 0) {
    const sum = avgData.reduce((acc, row) => acc + (row.quality_score ?? 0), 0);
    averageScore = sum / avgData.length;
  }

  const totalCount = total ?? 0;
  const passedCount = passed ?? 0;
  const passRate = totalCount > 0 ? passedCount / totalCount : 0;

  return {
    totalEmbeddings: totalCount,
    withQualityScore: withScore ?? 0,
    passedCount,
    incompleteCount: incomplete ?? 0,
    failedCount: failed ?? 0,
    averageScore,
    passRate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Failed Samples
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get failed samples for inspection.
 */
export async function getFailedSamples(limit: number = 10): Promise<FailedSample[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('embeddings')
    .select('target_type, target_id, chunk_index, chunk_content, quality_score, preprocessing_metadata')
    .eq('quality_status', 'failed')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getFailedSamples] Query error:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    targetType: row.target_type as EmbeddingTargetType,
    targetId: row.target_id,
    chunkIndex: row.chunk_index,
    chunkContent: row.chunk_content,
    qualityScore: row.quality_score,
    preprocessingMetadata: row.preprocessing_metadata,
  }));
}
