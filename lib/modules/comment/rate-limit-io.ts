/**
 * Rate limiting for comments
 * 
 * Uses database-based rate limiting to prevent comment spam.
 * Tracks comments per IP hash per target within a time window.
 * 
 * IMPORTANT: Uses createAdminClient (service_role) because 
 * comment_rate_limits has no authenticated INSERT policy (server-only table).
 */

import 'server-only';
import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import { hashIP, getClientIP } from '@/lib/security/ip';
import type { CommentTargetType } from '@/lib/types/comments';


// Re-export for backwards compatibility
export { hashIP, getClientIP };

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const DEFAULT_MAX_COMMENTS = 3; // Default max comments per window

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  error?: string;
}

/**
 * Check rate limit for a comment submission
 * 
 * @param ipHash - SHA256 hash of the client IP
 * @param targetType - The target type ('post' or 'gallery_item')
 * @param targetId - The target ID (post ID or gallery item ID)
 * @param maxComments - Maximum comments allowed per window
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  ipHash: string,
  targetType: CommentTargetType,
  targetId: string,
  maxComments: number = DEFAULT_MAX_COMMENTS
): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  try {
    // Get current count for this IP/target in the current window
    const { data, error } = await supabase
      .from('comment_rate_limits')
      .select('count, window_start')
      .eq('ip_hash', ipHash)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows found", which is fine
      console.error('Rate limit check error:', error);
      return {
        allowed: true, // Fail open to not block legitimate users
        remaining: maxComments,
        resetTime: new Date(Date.now() + RATE_LIMIT_WINDOW_MS),
        error: error.message,
      };
    }

    const currentCount = data?.count || 0;
    const remaining = Math.max(0, maxComments - currentCount);
    const resetTime = data?.window_start 
      ? new Date(new Date(data.window_start).getTime() + RATE_LIMIT_WINDOW_MS)
      : new Date(Date.now() + RATE_LIMIT_WINDOW_MS);

    return {
      allowed: currentCount < maxComments,
      remaining,
      resetTime,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return {
      allowed: true, // Fail open
      remaining: maxComments,
      resetTime: new Date(Date.now() + RATE_LIMIT_WINDOW_MS),
      error: 'Rate limit check failed',
    };
  }
}

/**
 * Increment the rate limit counter for an IP/target
 * 
 * @param ipHash - SHA256 hash of the client IP
 * @param targetType - The target type ('post' or 'gallery_item')
 * @param targetId - The target ID (post ID or gallery item ID)
 */
export async function incrementRateLimit(
  ipHash: string,
  targetType: CommentTargetType,
  targetId: string
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  try {
    // Check for existing record in current window
    const { data: existing } = await supabase
      .from('comment_rate_limits')
      .select('id, count')
      .eq('ip_hash', ipHash)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      // Update existing record
      await supabase
        .from('comment_rate_limits')
        .update({ count: existing.count + 1 })
        .eq('id', existing.id);
    } else {
      // Create new record
      await supabase
        .from('comment_rate_limits')
        .insert({
          ip_hash: ipHash,
          target_type: targetType,
          target_id: targetId,
          window_start: now.toISOString(),
          count: 1,
        });
    }
  } catch (error) {
    console.error('Failed to increment rate limit:', error);
  }
}

/**
 * Clean up old rate limit records
 * Should be called periodically (e.g., via cron)
 */
export async function cleanupRateLimits(): Promise<number> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS * 60); // Keep last hour

  try {
    const { data, error } = await supabase
      .from('comment_rate_limits')
      .delete()
      .lt('window_start', cutoff.toISOString())
      .select('id');

    if (error) {
      console.error('Rate limit cleanup error:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Rate limit cleanup failed:', error);
    return 0;
  }
}

