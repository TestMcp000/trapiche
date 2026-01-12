/**
 * Site URL Single Source
 *
 * Single source of truth for the canonical site URL (used by SEO, workers, and server-only IO).
 *
 * Rules:
 * - Dev: falls back to http://localhost:3000 when NEXT_PUBLIC_SITE_URL is not set.
 * - Production: NEXT_PUBLIC_SITE_URL is required (fail fast to avoid silent SEO / worker URL drift).
 * - Always strip trailing slash for consistency.
 *
 * @see doc/SPEC.md (SEO → URL Single Source)
 * @see doc/runbook/deployment.md (env vars)
 */

const DEV_FALLBACK_URL = 'http://localhost:3000';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

export function getSiteUrl(): string {
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envSiteUrl) {
    return stripTrailingSlash(envSiteUrl);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[Site URL] NEXT_PUBLIC_SITE_URL is required in production. ' +
        'See doc/runbook/deployment.md for setup details.'
    );
  }

  return DEV_FALLBACK_URL;
}

export const SITE_URL = getSiteUrl();

