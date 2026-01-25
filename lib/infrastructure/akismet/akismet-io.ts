/**
 * Akismet API integration for spam detection
 * 
 * Akismet is a cloud-based spam filtering service that analyzes
 * comments and detects spam based on content, IP, and user behavior.
 * 
 * @see https://akismet.com/developers/
 */

import 'server-only';
import { SITE_URL } from '@/lib/seo/hreflang';

const AKISMET_API_KEY = process.env.AKISMET_API_KEY;
const AKISMET_BLOG_URL = process.env.AKISMET_BLOG_URL || SITE_URL;

const AKISMET_USER_AGENT = (() => {
  try {
    return `${new URL(SITE_URL).hostname}/1.0 | Akismet/1.0`;
  } catch {
    return `site/1.0 | Akismet/1.0`;
  }
})();

export interface AkismetCheckParams {
  user_ip: string;
  user_agent: string;
  comment_content: string;
  comment_author: string;
  comment_author_email: string;
  permalink: string;
  referrer?: string;
}

export interface AkismetResult {
  configured: boolean;  // Whether Akismet API key is configured
  isSpam: boolean;
  proTip?: string | null;  // Akismet's suggestion (e.g., "discard" for obvious spam)
  error?: string;
}

/**
 * Verify the Akismet API key is valid
 */
export async function verifyAkismetKey(): Promise<boolean> {
  if (!AKISMET_API_KEY) {
    console.warn('AKISMET_API_KEY is not configured');
    return false;
  }

  try {
    const response = await fetch('https://rest.akismet.com/1.1/verify-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        key: AKISMET_API_KEY,
        blog: AKISMET_BLOG_URL,
      }).toString(),
    });

    const result = await response.text();
    return result === 'valid';
  } catch (error) {
    console.error('Akismet key verification failed:', error);
    return false;
  }
}

/**
 * Check if a comment is spam using Akismet
 * 
 * @param params - Comment details for spam check
 * @returns Spam detection result
 */
export async function checkSpam(params: AkismetCheckParams): Promise<AkismetResult> {
  if (!AKISMET_API_KEY) {
    console.warn('AKISMET_API_KEY is not configured, skipping spam check');
    return { configured: false, isSpam: false, error: 'not_configured' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(
      `https://${AKISMET_API_KEY}.rest.akismet.com/1.1/comment-check`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': AKISMET_USER_AGENT,
        },
        body: new URLSearchParams({
          blog: AKISMET_BLOG_URL,
          user_ip: params.user_ip,
          user_agent: params.user_agent,
          referrer: params.referrer || '',
          permalink: params.permalink,
          comment_type: 'comment',
          comment_author: params.comment_author,
          comment_author_email: params.comment_author_email,
          comment_content: params.comment_content,
        }).toString(),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    const isSpam = (await response.text()) === 'true';
    const proTip = response.headers.get('X-akismet-pro-tip');

    return { configured: true, isSpam, proTip };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Akismet request timed out');
      return { configured: true, isSpam: false, error: 'timeout' };
    }
    console.error('Akismet check failed:', error);
    return { configured: true, isSpam: false, error: 'request_failed' };
  }
}

/**
 * Report a comment as spam to Akismet (for training)
 * Call this when an admin marks a comment as spam
 */
export async function reportSpam(params: AkismetCheckParams): Promise<boolean> {
  if (!AKISMET_API_KEY) return false;

  try {
    const response = await fetch(
      `https://${AKISMET_API_KEY}.rest.akismet.com/1.1/submit-spam`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': AKISMET_USER_AGENT,
        },
        body: new URLSearchParams({
          blog: AKISMET_BLOG_URL,
          user_ip: params.user_ip,
          user_agent: params.user_agent,
          permalink: params.permalink,
          comment_type: 'comment',
          comment_author: params.comment_author,
          comment_author_email: params.comment_author_email,
          comment_content: params.comment_content,
        }).toString(),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Failed to report spam to Akismet:', error);
    return false;
  }
}

/**
 * Report a comment as ham (not spam) to Akismet (for training)
 * Call this when an admin approves a previously flagged comment
 */
export async function reportHam(params: AkismetCheckParams): Promise<boolean> {
  if (!AKISMET_API_KEY) return false;

  try {
    const response = await fetch(
      `https://${AKISMET_API_KEY}.rest.akismet.com/1.1/submit-ham`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': AKISMET_USER_AGENT,
        },
        body: new URLSearchParams({
          blog: AKISMET_BLOG_URL,
          user_ip: params.user_ip,
          user_agent: params.user_agent,
          permalink: params.permalink,
          comment_type: 'comment',
          comment_author: params.comment_author,
          comment_author_email: params.comment_author_email,
          comment_content: params.comment_content,
        }).toString(),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Failed to report ham to Akismet:', error);
    return false;
  }
}
