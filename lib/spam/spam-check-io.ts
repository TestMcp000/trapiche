/**
 * Spam Check IO
 *
 * Main spam check pipeline and related operations.
 *
 * @module lib/spam/spam-check-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { checkSpam as akismetCheck, type AkismetCheckParams } from '@/lib/infrastructure/akismet/akismet-io';
import { verifyRecaptcha } from '@/lib/spam/recaptcha-io';
import { sanitizeContent, isRepetitive } from '@/lib/security/sanitize';
import { checkRateLimit, incrementRateLimit, hashIP, getClientIP } from '@/lib/modules/comment/rate-limit-io';
import {
  runSpamDecision,
  type SpamEngineInput,
  type SpamEngineSettings,
  type SpamDecision,
} from '@/lib/spam/engine';
import { getSettings, getBlacklist, hasApprovedComment, type CommentSettings } from '@/lib/spam/spam-settings-io';
import { logDecision } from '@/lib/spam/spam-log-io';
import type { CommentTargetType } from '@/lib/types/comments';

export type { SpamDecision };

export interface SpamCheckParams {
  content: string;
  userDisplayName: string;
  userEmail: string;
  targetType: CommentTargetType;
  targetId: string;
  userId: string;
  userAgent: string;
  headers: Headers;
  permalink: string;
  honeypotValue?: string;
  recaptchaToken?: string;
}

export interface SpamCheckResult {
  decision: SpamDecision;
  content: string;           // Sanitized content
  linkCount: number;
  ipHash: string;
  spamScore?: number;        // reCAPTCHA score if applicable
  spamReason?: string;       // Why it was flagged
  akismetTip?: string;       // Akismet suggestion
  isApproved: boolean;       // Should be displayed immediately
  isSpam: boolean;           // Should be marked as spam
}

/**
 * Convert settings to spam engine format
 */
function toEngineSettings(settings: CommentSettings): SpamEngineSettings {
  return {
    enableHoneypot: settings.enableHoneypot,
    maxLinksBeforeModeration: settings.maxLinksBeforeModeration,
    moderationMode: settings.moderationMode,
    enableAkismet: settings.enableAkismet,
    enableRecaptcha: settings.enableRecaptcha,
    recaptchaThreshold: settings.recaptchaThreshold,
  };
}

/**
 * Main spam check pipeline
 *
 * Runs all checks in order and returns a decision
 */
export async function checkForSpam(params: SpamCheckParams): Promise<SpamCheckResult> {
  // ========================================
  // Phase 1: Gather all data (I/O)
  // ========================================
  const [settings, blacklist, clientIP] = await Promise.all([
    getSettings(),
    getBlacklist(),
    Promise.resolve(getClientIP(params.headers)),
  ]);

  const ipHash = hashIP(clientIP);

  // Check rate limit
  const rateLimit = await checkRateLimit(ipHash, params.targetType, params.targetId, settings.rateLimitPerMinute);

  // Check if user has approved comments before (for first_time mode)
  const hasApprovedBefore = settings.moderationMode === 'first_time'
    ? await hasApprovedComment(params.userId)
    : true;

  // Sanitize content
  const sanitized = sanitizeContent(params.content, settings.maxContentLength);
  const isContentRepetitive = !sanitized.rejected && isRepetitive(sanitized.content);

  // ========================================
  // Phase 2: Run local checks (Pure)
  // ========================================
  const engineInput: SpamEngineInput = {
    content: sanitized.content,
    linkCount: sanitized.linkCount,
    isRepetitive: isContentRepetitive,
    userEmail: params.userEmail,
    ipHash,
    honeypotTriggered: !!(params.honeypotValue?.trim()),
    rateLimited: !rateLimit.allowed,
    hasApprovedBefore,
    contentRejected: sanitized.rejected,
    contentRejectReason: sanitized.rejectReason,
    settings: toEngineSettings(settings),
    blacklist,
  };

  // Check if we can short-circuit (rate limit, honeypot, content validation, blacklist)
  // These don't need external services
  const shortCircuitDecisions: SpamDecision[] = ['rate_limited', 'reject'];

  // Do a preliminary run to check for short-circuits
  const preliminaryResult = runSpamDecision(engineInput);

  if (shortCircuitDecisions.includes(preliminaryResult.decision)) {
    await logDecision(preliminaryResult.decision, {
      targetType: params.targetType,
      targetId: params.targetId,
      reason: preliminaryResult.reason,
      linkCount: sanitized.linkCount,
      ipHash,
    });

    return {
      decision: preliminaryResult.decision,
      content: sanitized.content,
      linkCount: sanitized.linkCount,
      ipHash,
      spamReason: preliminaryResult.reason,
      isApproved: preliminaryResult.isApproved,
      isSpam: preliminaryResult.isSpam,
    };
  }

  // ========================================
  // Phase 3: External service calls (I/O)
  // ========================================
  let akismetResult: SpamEngineInput['akismetResult'];
  let recaptchaResult: SpamEngineInput['recaptchaResult'];
  let recaptchaScore: number | undefined;
  let akismetTip: string | undefined;

  // Akismet check
  if (settings.enableAkismet) {
    const akismetParams: AkismetCheckParams = {
      user_ip: clientIP,
      user_agent: params.userAgent,
      comment_content: sanitized.content,
      comment_author: params.userDisplayName,
      comment_author_email: params.userEmail,
      permalink: params.permalink,
    };

    const result = await akismetCheck(akismetParams);
    akismetResult = {
      configured: result.configured,
      isSpam: result.isSpam,
      proTip: result.proTip,
      error: result.error,
    };
    akismetTip = result.proTip || undefined;

    // Log if Akismet is unavailable
    if (!result.configured) {
      console.warn('Akismet enabled but not configured, skipping check');
    } else if (result.error) {
      console.warn('Akismet unavailable:', result.error);
    }
  }

  // reCAPTCHA check
  const recaptchaSecretConfigured = !!process.env.RECAPTCHA_SECRET_KEY;
  const recaptchaTokenProvided = !!params.recaptchaToken;

  if (settings.enableRecaptcha && recaptchaSecretConfigured && recaptchaTokenProvided) {
    const result = await verifyRecaptcha(params.recaptchaToken!, 'submit_comment');
    recaptchaResult = {
      success: result.success,
      score: result.score,
      error: result.error,
    };
    recaptchaScore = result.score;
  }

  // ========================================
  // Phase 4: Final decision with external results (Pure)
  // ========================================
  const finalInput: SpamEngineInput = {
    ...engineInput,
    akismetResult,
    recaptchaResult,
    recaptchaSecretConfigured: settings.enableRecaptcha ? recaptchaSecretConfigured : undefined,
    recaptchaTokenProvided: settings.enableRecaptcha ? recaptchaTokenProvided : undefined,
  };

  const finalResult = runSpamDecision(finalInput);

  // ========================================
  // Phase 5: Log and finalize (I/O)
  // ========================================
  await logDecision(finalResult.decision, {
    targetType: params.targetType,
    targetId: params.targetId,
    reason: finalResult.reason,
    linkCount: sanitized.linkCount,
    akismetTip,
    recaptchaScore,
    ipHash,
  });

  // Increment rate limit counter
  await incrementRateLimit(ipHash, params.targetType, params.targetId);

  return {
    decision: finalResult.decision,
    content: sanitized.content,
    linkCount: sanitized.linkCount,
    ipHash,
    spamScore: recaptchaScore,
    spamReason: finalResult.reason,
    akismetTip,
    isApproved: finalResult.isApproved,
    isSpam: finalResult.isSpam,
  };
}

/**
 * Quick honeypot check (for client validation feedback)
 */
export function isHoneypotTriggered(value: string | undefined): boolean {
  return !!(value && value.trim());
}
