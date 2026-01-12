'use client';

/**
 * Page View Tracker Client Component
 *
 * Tracks page views on SPA navigation using sendBeacon.
 * Feature-gated via NEXT_PUBLIC_ENABLE_PAGEVIEWS.
 *
 * Features:
 * - Monitors pathname changes via usePathname()
 * - Uses sendBeacon for reliable delivery (with fetch fallback)
 * - Debounces duplicate sends for same path
 * - Excludes admin paths from tracking
 *
 * @see app/api/analytics/pageview/route.ts - Ingestion endpoint
 * @see lib/validators/page-views.ts - Path parsing logic
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { parsePathname } from '@/lib/validators/page-views';

// =============================================================================
// Configuration
// =============================================================================

/** API endpoint for page view recording */
const PAGEVIEW_API_URL = '/api/analytics/pageview';

/** Paths to exclude from tracking (checked on client) */
const EXCLUDED_CLIENT_PATTERNS = ['/admin'] as const;

// =============================================================================
// Component
// =============================================================================

/**
 * Client-side page view tracker.
 * Mount in layout to track all public page views.
 */
export function PageViewTrackerClient(): null {
  const pathname = usePathname();
  
  // Track sent paths to prevent duplicates in same session
  const sentPathsRef = useRef<Set<string>>(new Set());
  // Track if initial mount has been handled
  const initialMountRef = useRef(true);

  useEffect(() => {
    // Feature gate: only track when explicitly enabled
    if (process.env.NEXT_PUBLIC_ENABLE_PAGEVIEWS !== 'true') {
      return;
    }

    // Skip if pathname is null/undefined
    if (!pathname) return;

    // Exclude admin paths (client-side check)
    if (EXCLUDED_CLIENT_PATTERNS.some((pattern) => pathname.includes(pattern))) {
      return;
    }

    // Parse pathname to extract locale and canonical path
    const parsed = parsePathname(pathname);
    if (!parsed) {
      // Could not parse locale from pathname
      return;
    }

    const { locale, path } = parsed;

    // Create a unique key for deduplication
    const pathKey = `${locale}:${path}`;

    // Skip if already sent this session (debounce)
    if (sentPathsRef.current.has(pathKey)) {
      return;
    }

    // Mark as sent
    sentPathsRef.current.add(pathKey);

    // Skip initial mount to avoid double-counting on hydration
    // (the server already knows about the initial page load)
    if (initialMountRef.current) {
      initialMountRef.current = false;
      // Still track initial page on client for SPA consistency
      // Remove this return if you don't want to track initial load
    }

    // Send page view request
    sendPageView(path, locale);
  }, [pathname]);

  // Component renders nothing
  return null;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Sends a page view request using sendBeacon with fetch fallback.
 */
function sendPageView(path: string, locale: 'en' | 'zh'): void {
  const payload = JSON.stringify({ path, locale });

  // Try sendBeacon first (more reliable for page unload)
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    const sent = navigator.sendBeacon(PAGEVIEW_API_URL, blob);
    
    if (sent) {
      return;
    }
    // Fall through to fetch if sendBeacon fails
  }

  // Fallback to fetch with keepalive
  fetch(PAGEVIEW_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Silently ignore errors (non-critical analytics)
  });
}

export default PageViewTrackerClient;
