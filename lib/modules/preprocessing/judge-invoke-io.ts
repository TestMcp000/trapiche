/**
 * Judge Invoke IO Module
 * @see doc/specs/completed/DATA_PREPROCESSING.md §5.3
 *
 * Server-only module for calling the judge-preprocessing Edge Function.
 * Handles LLM-as-a-Judge invocation and content sampling logic.
 */
import 'server-only';

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
        Authorization: `Bearer ${supabaseAnonKey}`,
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
// Sampling Logic
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

// ─────────────────────────────────────────────────────────────────────────────
// Batch Processing
// ─────────────────────────────────────────────────────────────────────────────

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
