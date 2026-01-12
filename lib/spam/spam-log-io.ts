/**
 * Spam Log IO
 *
 * Database operations for logging spam decisions.
 *
 * @module lib/spam/spam-log-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { SpamDecision } from '@/lib/spam/engine';
import type { CommentTargetType } from '@/lib/types/comments';

export interface LogDecisionParams {
  commentId?: string;
  targetType: CommentTargetType;
  targetId: string;
  reason: string;
  linkCount: number;
  akismetTip?: string;
  recaptchaScore?: number;
  ipHash: string;
}

/**
 * Log spam decision for observation and tuning
 */
export async function logDecision(
  decision: SpamDecision,
  params: LogDecisionParams
): Promise<void> {
  // Phase 5.2 §B: Use admin client for spam_decision_log (no authenticated INSERT policy)
  const supabase = createAdminClient();

  await supabase.from('spam_decision_log').insert({
    comment_id: params.commentId,
    target_type: params.targetType,
    target_id: params.targetId,
    decision,
    reason: params.reason,
    link_count: params.linkCount,
    akismet_tip: params.akismetTip,
    recaptcha_score: params.recaptchaScore,
    ip_hash: params.ipHash,
  });
}
