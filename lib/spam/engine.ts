/**
 * Spam Decision Engine (Pure Logic)
 * 
 * This module contains ONLY pure decision logic for spam detection.
 * No I/O operations (database, network, filesystem) are allowed here.
 * 
 * The spam-filter.ts module handles all I/O and calls this engine
 * with pre-fetched data to make decisions.
 */

// ========================================
// Types
// ========================================

export type SpamDecision = 'allow' | 'pending' | 'spam' | 'reject' | 'rate_limited';

export interface SpamEngineSettings {
  enableHoneypot: boolean;
  maxLinksBeforeModeration: number;
  moderationMode: 'auto' | 'all' | 'first_time';
  enableAkismet: boolean;
  enableRecaptcha: boolean;
  recaptchaThreshold: number;
}

export interface Blacklist {
  keywords: string[];
  ips: string[];
  emails: string[];
  domains: string[];
}

export interface AkismetResult {
  configured: boolean;
  isSpam: boolean;
  proTip?: string | null;
  error?: string;
}

export interface RecaptchaResult {
  success: boolean;
  score: number;
  error?: string;
}

export interface SpamEngineInput {
  // Pre-sanitized content info
  content: string;
  linkCount: number;
  isRepetitive: boolean;
  
  // User info
  userEmail: string;
  ipHash: string;
  
  // Pre-checked conditions
  honeypotTriggered: boolean;
  rateLimited: boolean;
  hasApprovedBefore: boolean;
  contentRejected: boolean;
  contentRejectReason?: string;
  
  // Settings (pre-fetched from DB)
  settings: SpamEngineSettings;
  
  // Blacklist (pre-fetched from DB)
  blacklist: Blacklist;
  
  // External service results (optional, may not be called)
  akismetResult?: AkismetResult;
  recaptchaResult?: RecaptchaResult;
  recaptchaSecretConfigured?: boolean;
  recaptchaTokenProvided?: boolean;
}

export interface SpamEngineOutput {
  decision: SpamDecision;
  reason: string;
  isApproved: boolean;
  isSpam: boolean;
}

// ========================================
// Local Rule Checks (Pure)
// ========================================

/**
 * Check rate limit condition
 */
export function checkRateLimited(input: SpamEngineInput): SpamEngineOutput | null {
  if (input.rateLimited) {
    return {
      decision: 'rate_limited',
      reason: 'Rate limit exceeded',
      isApproved: false,
      isSpam: false,
    };
  }
  return null;
}

/**
 * Check honeypot condition
 */
export function checkHoneypot(input: SpamEngineInput): SpamEngineOutput | null {
  if (input.settings.enableHoneypot && input.honeypotTriggered) {
    return {
      decision: 'reject',
      reason: 'Bot detected (honeypot)',
      isApproved: false,
      isSpam: true,
    };
  }
  return null;
}

/**
 * Check content validation
 */
export function checkContentValidation(input: SpamEngineInput): SpamEngineOutput | null {
  if (input.contentRejected) {
    return {
      decision: 'reject',
      reason: input.contentRejectReason || 'Content validation failed',
      isApproved: false,
      isSpam: false,
    };
  }
  return null;
}

/**
 * Check blacklist (keywords, IPs, emails, domains)
 */
export function checkBlacklist(input: SpamEngineInput): SpamEngineOutput | null {
  const contentLower = input.content.toLowerCase();
  const emailLower = input.userEmail.toLowerCase();
  const emailDomain = emailLower.split('@')[1];

  // Check keywords
  for (const keyword of input.blacklist.keywords) {
    if (contentLower.includes(keyword)) {
      return {
        decision: 'reject',
        reason: `Blacklisted keyword: ${keyword}`,
        isApproved: false,
        isSpam: true,
      };
    }
  }

  // Check IP
  if (input.blacklist.ips.includes(input.ipHash)) {
    return {
      decision: 'reject',
      reason: 'IP blacklisted',
      isApproved: false,
      isSpam: true,
    };
  }

  // Check email
  if (input.blacklist.emails.includes(emailLower)) {
    return {
      decision: 'reject',
      reason: 'Email blacklisted',
      isApproved: false,
      isSpam: true,
    };
  }

  // Check domain
  if (emailDomain && input.blacklist.domains.includes(emailDomain)) {
    return {
      decision: 'reject',
      reason: `Email domain blacklisted: ${emailDomain}`,
      isApproved: false,
      isSpam: true,
    };
  }

  return null;
}

/**
 * Check for flags that result in pending status
 */
export function checkLocalPendingConditions(input: SpamEngineInput): SpamEngineOutput | null {
  // Repetitive content
  if (input.isRepetitive) {
    return {
      decision: 'pending',
      reason: 'Repetitive content detected',
      isApproved: false,
      isSpam: false,
    };
  }

  // Too many links
  if (input.linkCount > input.settings.maxLinksBeforeModeration) {
    return {
      decision: 'pending',
      reason: `Too many links: ${input.linkCount}`,
      isApproved: false,
      isSpam: false,
    };
  }

  return null;
}

// ========================================
// External Service Checks (Pure)
// ========================================

/**
 * Apply Akismet result to decision
 */
export function applyAkismetResult(
  input: SpamEngineInput,
  currentDecision: SpamDecision
): SpamEngineOutput | null {
  // Skip if Akismet is disabled or already rejected
  if (!input.settings.enableAkismet || currentDecision === 'reject') {
    return null;
  }

  // Skip if no result (not called)
  if (!input.akismetResult) {
    return null;
  }

  // Skip if not configured or error
  if (!input.akismetResult.configured || input.akismetResult.error) {
    return null;
  }

  // Process spam detection
  if (input.akismetResult.isSpam) {
    if (input.akismetResult.proTip === 'discard') {
      return {
        decision: 'spam',
        reason: 'Flagged by Akismet (high confidence)',
        isApproved: false,
        isSpam: true,
      };
    } else {
      return {
        decision: 'pending',
        reason: 'Flagged by Akismet',
        isApproved: false,
        isSpam: false,
      };
    }
  }

  return null;
}

/**
 * Apply reCAPTCHA result to decision
 */
export function applyRecaptchaResult(
  input: SpamEngineInput,
  currentDecision: SpamDecision
): SpamEngineOutput | null {
  // Skip if reCAPTCHA is disabled or already rejected/spam
  if (!input.settings.enableRecaptcha || currentDecision === 'reject' || currentDecision === 'spam') {
    return null;
  }

  // Check for misconfiguration
  if (input.recaptchaSecretConfigured === false) {
    return {
      decision: 'pending',
      reason: 'reCAPTCHA misconfigured (missing secret key)',
      isApproved: false,
      isSpam: false,
    };
  }

  // Check for missing token
  if (input.recaptchaTokenProvided === false) {
    return {
      decision: 'pending',
      reason: 'reCAPTCHA token missing',
      isApproved: false,
      isSpam: false,
    };
  }

  // Skip if no result
  if (!input.recaptchaResult) {
    return null;
  }

  // Check score
  const threshold = input.settings.recaptchaThreshold;
  if (!input.recaptchaResult.success || input.recaptchaResult.score < threshold) {
    const reason = input.recaptchaResult.error === 'not_configured'
      ? 'reCAPTCHA misconfigured'
      : `Low reCAPTCHA score: ${input.recaptchaResult.score}`;
    return {
      decision: 'pending',
      reason,
      isApproved: false,
      isSpam: false,
    };
  }

  return null;
}

// ========================================
// Moderation Mode (Pure)
// ========================================

/**
 * Apply moderation mode to final decision
 */
export function applyModerationMode(input: SpamEngineInput): SpamEngineOutput | null {
  switch (input.settings.moderationMode) {
    case 'all':
      return {
        decision: 'pending',
        reason: 'All comments require moderation',
        isApproved: false,
        isSpam: false,
      };

    case 'first_time':
      if (!input.hasApprovedBefore) {
        return {
          decision: 'pending',
          reason: 'First-time commenter',
          isApproved: false,
          isSpam: false,
        };
      }
      break;

    case 'auto':
    default:
      break;
  }

  return null;
}

// ========================================
// Main Decision Pipeline (Pure)
// ========================================

/**
 * Run all local checks (before external services)
 * This is the first stage of the decision pipeline.
 */
export function runLocalChecks(input: SpamEngineInput): SpamEngineOutput {
  // Check in order of severity
  const checks = [
    checkRateLimited,
    checkHoneypot,
    checkContentValidation,
    checkBlacklist,
    checkLocalPendingConditions,
  ];

  for (const check of checks) {
    const result = check(input);
    if (result) {
      return result;
    }
  }

  // Default: allow (pending external checks and moderation mode)
  return {
    decision: 'allow',
    reason: 'Passed local checks',
    isApproved: true,
    isSpam: false,
  };
}

/**
 * Apply external service results and moderation mode
 * This is the second stage of the decision pipeline.
 */
export function applyExternalAndModeration(
  input: SpamEngineInput,
  localResult: SpamEngineOutput
): SpamEngineOutput {
  // If already rejected, don't override
  if (localResult.decision === 'reject' || localResult.decision === 'rate_limited') {
    return localResult;
  }

  // Apply Akismet
  const akismetResult = applyAkismetResult(input, localResult.decision);
  if (akismetResult) {
    return akismetResult;
  }

  // Apply reCAPTCHA
  const recaptchaResult = applyRecaptchaResult(input, localResult.decision);
  if (recaptchaResult) {
    return recaptchaResult;
  }

  // If still pending from local checks, keep that decision
  if (localResult.decision === 'pending') {
    return localResult;
  }

  // Apply moderation mode
  const moderationResult = applyModerationMode(input);
  if (moderationResult) {
    return moderationResult;
  }

  // All checks passed!
  return {
    decision: 'allow',
    reason: 'Passed all checks',
    isApproved: true,
    isSpam: false,
  };
}

/**
 * Full decision pipeline (pure)
 * 
 * Combines local checks with external service results and moderation mode.
 * This is the main entry point for the spam engine.
 */
export function runSpamDecision(input: SpamEngineInput): SpamEngineOutput {
  const localResult = runLocalChecks(input);
  return applyExternalAndModeration(input, localResult);
}
