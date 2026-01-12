/**
 * Spam IO Facade
 *
 * Re-exports from semantic submodules for backward compatibility.
 * This file maintains the original import paths while delegating
 * to focused submodules.
 *
 * @module lib/spam/io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

// Re-export settings types and functions
export type { CommentSettings } from '@/lib/spam/spam-settings-io';
export {
  getSettings,
  getBlacklist,
  hasApprovedComment,
  safeParseInt,
  safeParseFloat,
} from '@/lib/spam/spam-settings-io';

// Re-export log function
export { logDecision, type LogDecisionParams } from '@/lib/spam/spam-log-io';

// Re-export main spam check pipeline
export type { SpamCheckParams, SpamCheckResult } from '@/lib/spam/spam-check-io';
export type { SpamDecision } from '@/lib/spam/spam-check-io';
export {
  checkForSpam,
  isHoneypotTriggered,
} from '@/lib/spam/spam-check-io';
