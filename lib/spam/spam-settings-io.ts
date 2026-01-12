/**
 * Spam Settings IO
 *
 * Database operations for spam filter settings and blacklists.
 *
 * @module lib/spam/spam-settings-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { Blacklist } from '@/lib/spam/engine';

export interface CommentSettings {
  moderationMode: 'auto' | 'all' | 'first_time';
  maxLinksBeforeModeration: number;
  enableHoneypot: boolean;
  enableAkismet: boolean;
  enableRecaptcha: boolean;
  recaptchaThreshold: number;
  rateLimitPerMinute: number;
  maxContentLength: number;
}

/**
 * Safe parse integer with fallback and clamp
 */
export function safeParseInt(value: string | undefined, defaultValue: number, min: number, max: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Safe parse float with fallback and clamp
 */
export function safeParseFloat(value: string | undefined, defaultValue: number, min: number, max: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Get comment settings from database with safe parsing
 */
export async function getSettings(): Promise<CommentSettings> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('comment_settings')
    .select('key, value');

  const settings: Record<string, string> = {};
  data?.forEach(row => {
    settings[row.key] = row.value;
  });

  // Validate moderation_mode
  const validModes = ['auto', 'all', 'first_time'];
  const moderationMode = validModes.includes(settings.moderation_mode)
    ? (settings.moderation_mode as CommentSettings['moderationMode'])
    : 'auto';

  return {
    moderationMode,
    maxLinksBeforeModeration: safeParseInt(settings.max_links_before_moderation, 2, 0, 20),
    enableHoneypot: settings.enable_honeypot !== 'false',
    enableAkismet: settings.enable_akismet !== 'false',
    enableRecaptcha: settings.enable_recaptcha === 'true',
    recaptchaThreshold: safeParseFloat(settings.recaptcha_threshold, 0.5, 0, 1),
    rateLimitPerMinute: safeParseInt(settings.rate_limit_per_minute, 3, 1, 20),
    maxContentLength: safeParseInt(settings.max_content_length, 4000, 100, 10000),
  };
}

/**
 * Get blacklist items from database
 */
export async function getBlacklist(): Promise<Blacklist> {
  // Phase 5.2 §B: Use admin client for comment_blacklist (admin-only table)
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('comment_blacklist')
    .select('type, value');

  const blacklist: Blacklist = {
    keywords: [],
    ips: [],
    emails: [],
    domains: [],
  };

  data?.forEach(item => {
    switch (item.type) {
      case 'keyword':
        blacklist.keywords.push(item.value.toLowerCase());
        break;
      case 'ip':
        blacklist.ips.push(item.value);
        break;
      case 'email':
        blacklist.emails.push(item.value.toLowerCase());
        break;
      case 'domain':
        blacklist.domains.push(item.value.toLowerCase());
        break;
    }
  });

  return blacklist;
}

/**
 * Check if user has had a comment approved before
 */
export async function hasApprovedComment(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('comments')
    .select('id')
    .eq('user_id', userId)
    .eq('is_approved', true)
    .limit(1)
    .single();

  return !!data;
}
