/**
 * Judge IO Module (LLM-as-a-Judge)
 * @see doc/specs/completed/DATA_PREPROCESSING.md §5.3
 * @see uiux_refactor.md §6.4.2
 *
 * Server-only module for calling the judge-preprocessing Edge Function
 * and updating quality scores in the database.
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { EmbeddingTargetType } from '@/lib/types/embedding';
import type { JudgeRequest, JudgeResult, QualifiedChunk, EnrichmentContext } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default sample rate for judge evaluation (20% per PRD §5.5).
 */
const DEFAULT_SAMPLE_RATE = 0.2;

/**
 * Minimum content count for sampling (below this, check all).
 */
const MIN_CONTENT_FOR_SAMPLING = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function Client
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call the judge-preprocessing Edge Function.
 * 
 * @param request - Judge request with chunk content and context
 * @returns Judge result with score, standalone flag, and reason
 */
export async function judgeChunk(request: JudgeRequest): Promise<JudgeResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[judgeChunk] Supabase URL or Anon Key not configured');
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/judge-preprocessing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[judgeChunk] Edge Function error:', response.status, errorText);
      return { success: false, error: `Edge Function error: ${response.status}` };
    }

    const result: JudgeResult = await response.json();
    return result;
  } catch (error) {
    console.error('[judgeChunk] Network error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Processing with Sampling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine if content should be sampled for judge evaluation.
 * Per PRD §5.5: sample by original content, not by chunks.
 * 
 * @param totalContent - Total number of content items
 * @param sampleRate - Sample rate (0-1)
 * @returns Whether this content should be judged
 */
export function shouldSampleContent(
  totalContent: number,
  sampleRate: number = DEFAULT_SAMPLE_RATE
): boolean {
  // Check all if below minimum
  if (totalContent < MIN_CONTENT_FOR_SAMPLING) {
    return true;
  }
  
  // Random sampling
  return Math.random() < sampleRate;
}

/**
 * Judge chunks for a single content item.
 * If sampled, all chunks for this content are judged together.
 * 
 * @param chunks - Chunks from preprocessing
 * @param context - Enrichment context with title/category
 * @param isSampled - Whether this content was selected for sampling
 * @returns Chunks with judge results (if sampled)
 */
export async function judgeChunksForContent(
  chunks: QualifiedChunk[],
  context: EnrichmentContext,
  isSampled: boolean
): Promise<{ chunks: QualifiedChunk[]; judged: boolean; results: JudgeResult[] }> {
  if (!isSampled || chunks.length === 0) {
    return { chunks, judged: false, results: [] };
  }

  const results: JudgeResult[] = [];

  // Judge each chunk
  for (const chunk of chunks) {
    // Only judge passed/incomplete chunks (not failed)
    if (chunk.qualityStatus === 'failed') {
      continue;
    }

    const request: JudgeRequest = {
      chunkContent: chunk.text,
      title: context.parentTitle,
      category: context.category,
      targetType: context.targetType,
    };

    const result = await judgeChunk(request);
    results.push(result);

    // Update chunk quality based on judge result
    if (result.success && result.score !== undefined) {
      chunk.qualityScore = result.score;
      
      // Update status based on score threshold (0.7 per PRD §5.4)
      if (result.score >= 0.7) {
        chunk.qualityStatus = 'passed';
      } else if (result.score >= 0.5) {
        chunk.qualityStatus = 'incomplete';
      } else {
        chunk.qualityStatus = 'failed';
      }
    }
  }

  return { chunks, judged: true, results };
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Updates
// ─────────────────────────────────────────────────────────────────────────────

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

  // Determine quality status from score
  let qualityStatus: 'passed' | 'incomplete' | 'failed';
  if (result.score >= 0.7) {
    qualityStatus = 'passed';
  } else if (result.score >= 0.5) {
    qualityStatus = 'incomplete';
  } else {
    qualityStatus = 'failed';
  }

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

// ─────────────────────────────────────────────────────────────────────────────
// Quality Metrics
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
    supabase.from('embeddings').select('*', { count: 'exact', head: true }).not('quality_score', 'is', null),
    supabase.from('embeddings').select('*', { count: 'exact', head: true }).eq('quality_status', 'passed'),
    supabase.from('embeddings').select('*', { count: 'exact', head: true }).eq('quality_status', 'incomplete'),
    supabase.from('embeddings').select('*', { count: 'exact', head: true }).eq('quality_status', 'failed'),
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

export interface FailedSample {
  targetType: EmbeddingTargetType;
  targetId: string;
  chunkIndex: number;
  chunkContent: string | null;
  qualityScore: number | null;
  preprocessingMetadata: Record<string, unknown> | null;
}

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
