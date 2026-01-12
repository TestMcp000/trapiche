/**
 * Page View Analytics API Route
 *
 * Public ingestion endpoint for page view tracking.
 * Accepts POST requests from sendBeacon/fetch.
 *
 * Security assumptions (see doc/SECURITY.md):
 * - No auth required (public endpoint)
 * - Input validation only (path format, locale, excluded paths)
 * - No PII stored (privacy-first design)
 *
 * @see lib/analytics/pageviews-io.ts - Server-side recording
 * @see lib/validators/page-views.ts - Request validation
 * @see ARCHITECTURE.md §3.7 - API Route IO constraints
 */

import { NextResponse } from 'next/server';
import { validatePageViewRequest } from '@/lib/validators/page-views';
import { recordPageView } from '@/lib/analytics/pageviews-io';

// =============================================================================
// POST /api/analytics/pageview
// =============================================================================

/**
 * Record a page view.
 *
 * Request body: { path: string; locale: 'en' | 'zh' }
 *
 * Responses:
 * - 204: Success (no content, prevents client retry spam)
 * - 400: Validation error
 * - 500: Server error
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate request
    const validation = validatePageViewRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { path, locale } = validation.data!;

    // Record page view
    await recordPageView(path, locale);

    // Return 204 No Content (success, no body)
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[pageview route] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
