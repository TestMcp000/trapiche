/**
 * Reactions IO Layer (Server-only)
 *
 * Centralized IO operations for reactions (likes).
 * Uses admin client to bypass RLS for anonymous reaction tracking.
 *
 * 遵循 ARCHITECTURE.md §3.5：
 * - IO 集中於 lib/reactions/io.ts
 * - API routes 只做 parse → validate → 呼叫 lib → return
 */

import 'server-only';
import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { ReactionTargetType } from '@/lib/types/reactions';

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * Check rate limit for reactions
 * @param ipHash - Hashed IP address
 * @returns true if rate limited, false otherwise
 */
export async function checkReactionRateLimit(ipHash: string): Promise<boolean> {
  const supabase = createAdminClient();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  // Get current count
  const { data: existing } = await supabase
    .from('reaction_rate_limits')
    .select('id, count')
    .eq('ip_hash', ipHash)
    .gte('window_start', windowStart)
    .single();

  if (existing) {
    if (existing.count >= RATE_LIMIT_MAX) {
      return true; // Rate limited
    }
    // Increment count
    await supabase
      .from('reaction_rate_limits')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id);
  } else {
    // Create new entry
    await supabase
      .from('reaction_rate_limits')
      .insert({
        ip_hash: ipHash,
        window_start: new Date().toISOString(),
        count: 1,
      });
  }

  return false; // Not rate limited
}

// =============================================================================
// Toggle Reaction
// =============================================================================

export interface ToggleReactionResult {
  liked: boolean;
  likeCount: number;
}

/**
 * Toggle a reaction (like/unlike)
 * @param targetType - Type of target ('gallery_item' | 'comment')
 * @param targetId - ID of the target
 * @param anonId - Anonymous user ID
 * @returns Whether the target is now liked and the updated like count
 */
export async function toggleReaction(
  targetType: ReactionTargetType,
  targetId: string,
  anonId: string
): Promise<ToggleReactionResult> {
  const supabase = createAdminClient();

  // Try to insert first (on conflict do nothing)
  const { data: insertResult } = await supabase
    .from('reactions')
    .insert({
      target_type: targetType,
      target_id: targetId,
      anon_id: anonId,
    })
    .select('id')
    .single();

  let liked: boolean;

  if (insertResult?.id) {
    // Insert succeeded - now liked
    liked = true;
  } else {
    // Insert failed (conflict) - delete to toggle off
    await supabase
      .from('reactions')
      .delete()
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('anon_id', anonId);
    liked = false;
  }

  // Get updated like count
  const likeCount = await getLikeCount(targetType, targetId);

  return { liked, likeCount };
}

// =============================================================================
// Like Count
// =============================================================================

/**
 * Get current like count for a target
 * @param targetType - Type of target ('gallery_item' | 'comment')
 * @param targetId - ID of the target
 * @returns The like count
 */
export async function getLikeCount(
  targetType: ReactionTargetType,
  targetId: string
): Promise<number> {
  const supabase = createAdminClient();

  if (targetType === 'gallery_item') {
    const { data } = await supabase
      .from('gallery_items')
      .select('like_count')
      .eq('id', targetId)
      .single();
    return data?.like_count ?? 0;
  } else if (targetType === 'comment') {
    const { data } = await supabase
      .from('comments')
      .select('like_count')
      .eq('id', targetId)
      .single();
    return data?.like_count ?? 0;
  }
  return 0;
}

// =============================================================================
// Batch Liked Status
// =============================================================================

/**
 * Get liked item IDs for the given anon_id
 * Used for batch checking likedByMe status in gallery/comments
 * 
 * @param anonId - Anonymous user ID (from cookie)
 * @param targetType - Type of target ('gallery_item' | 'comment')
 * @param targetIds - Array of target IDs to check
 * @returns Set of target IDs that are liked
 */
export async function getAnonLikedItemIds(
  anonId: string | undefined,
  targetType: ReactionTargetType,
  targetIds: string[]
): Promise<Set<string>> {
  if (!anonId || targetIds.length === 0) {
    return new Set();
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('reactions')
    .select('target_id')
    .eq('target_type', targetType)
    .eq('anon_id', anonId)
    .in('target_id', targetIds);

  return new Set((data || []).map(r => r.target_id));
}
