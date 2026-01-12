/**
 * Post-auth redirect helpers
 *
 * Used to preserve the intended post-login destination across OAuth redirects.
 * This is necessary because some providers / Supabase settings may fall back to Site URL,
 * which can drop custom query params like `next`.
 * 
 * @module lib/modules/auth/post-auth-redirect
 */

export const POST_AUTH_REDIRECT_COOKIE = 'qn_post_auth_redirect';
export const POST_AUTH_REDIRECT_MAX_AGE_SECONDS = 60 * 10; // 10 minutes

export function decodeCookiePath(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * Ensure redirect target is a safe, same-origin path.
 * Disallows protocol-relative URLs ("//evil.com") and backslashes.
 */
export function sanitizeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//')) return null;
  if (trimmed.includes('\\')) return null;
  if (/[\r\n]/.test(trimmed)) return null;
  return trimmed;
}
