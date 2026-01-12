/**
 * Reports Runner IO Layer (Server-only)
 *
 * Contains the background execution logic for running reports.
 * Extracted from app/api/reports/run/route.ts to follow ARCHITECTURE.md §3.7:
 * "API routes only do parse → validate → call lib → return"
 *
 * Functions:
 * - runReportInBackground: Orchestrates report execution
 * - checkLinks: Performs link validation on site pages
 * - checkSchema: Validates JSON-LD structured data
 */

import 'server-only';
import { SITE_URL } from '@/lib/seo/hreflang';
import { updateReportStatus } from './admin-io';
import type { ReportType } from '@/lib/types/reports';

// =============================================================================
// Link Checker
// =============================================================================

/**
 * Simple link checker - fetches main pages and checks for 4xx/5xx responses.
 * 
 * @param siteUrl - Base URL to check
 * @returns Summary object with broken links and stats
 */
export async function checkLinks(siteUrl: string): Promise<Record<string, unknown>> {
  const pagesToCheck = [
    '',
    '/en',
    '/zh',
    '/en/blog',
    '/zh/blog',
    '/en/about',
    '/zh/about',
    '/en/services',
    '/zh/services',
    '/en/contact',
    '/zh/contact',
    '/en/privacy',
    '/zh/privacy',
  ];

  const results: { url: string; status: number; ok: boolean }[] = [];
  const brokenLinks: string[] = [];

  for (const path of pagesToCheck) {
    try {
      const url = `${siteUrl}${path}`;
      const response = await fetch(url, { 
        method: 'HEAD',
        redirect: 'follow',
      });
      
      results.push({
        url,
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        brokenLinks.push(`${url} (${response.status})`);
      }
    } catch (_e) {
      results.push({
        url: `${siteUrl}${path}`,
        status: 0,
        ok: false,
      });
      brokenLinks.push(`${siteUrl}${path} (fetch error)`);
    }
  }

  return {
    totalChecked: results.length,
    brokenCount: brokenLinks.length,
    brokenLinks: brokenLinks.slice(0, 20),
    allPassed: brokenLinks.length === 0,
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// Schema Checker
// =============================================================================

/**
 * JSON-LD Schema checker - validates structured data on site pages.
 * 
 * @param siteUrl - Base URL to check
 * @returns Summary object with schema validation results
 */
export async function checkSchema(siteUrl: string): Promise<Record<string, unknown>> {
  const pagesToCheck = [
    { path: '/en', name: 'Homepage (EN)' },
    { path: '/zh', name: 'Homepage (ZH)' },
  ];

  const results: { page: string; hasSchema: boolean; types: string[]; errors: string[] }[] = [];
  const errors: string[] = [];

  for (const { path, name } of pagesToCheck) {
    try {
      const url = `${siteUrl}${path}`;
      const response = await fetch(url);
      const html = await response.text();

      // Extract JSON-LD scripts
      const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
      
      if (!jsonLdMatches || jsonLdMatches.length === 0) {
        results.push({
          page: name,
          hasSchema: false,
          types: [],
          errors: ['No JSON-LD found'],
        });
        errors.push(`${name}: No JSON-LD found`);
        continue;
      }

      const types: string[] = [];
      const pageErrors: string[] = [];

      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
          const parsed = JSON.parse(jsonContent);

          // Check for @context and @type
          if (!parsed['@context']) {
            pageErrors.push('Missing @context');
          }

          if (parsed['@graph']) {
            // Handle @graph format
            for (const item of parsed['@graph']) {
              if (item['@type']) {
                types.push(item['@type']);
              }
            }
          } else if (parsed['@type']) {
            types.push(parsed['@type']);
          } else {
            pageErrors.push('Missing @type');
          }
        } catch {
          pageErrors.push('Invalid JSON in JSON-LD');
        }
      }

      results.push({
        page: name,
        hasSchema: true,
        types,
        errors: pageErrors,
      });

      if (pageErrors.length > 0) {
        errors.push(...pageErrors.map(e => `${name}: ${e}`));
      }
    } catch (_e) {
      results.push({
        page: name,
        hasSchema: false,
        types: [],
        errors: ['Failed to fetch page'],
      });
      errors.push(`${name}: Failed to fetch`);
    }
  }

  return {
    pagesChecked: results.length,
    allValid: errors.length === 0,
    results,
    errors: errors.slice(0, 20),
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// Background Runner
// =============================================================================

/**
 * Background job runner for reports.
 * Executes the appropriate check based on report type and updates status.
 * 
 * Note: This function is called without await to run in background.
 * In production, this would be handled by a separate worker/cron.
 * 
 * @param reportId - Report ID to update
 * @param type - Report type to run
 */
export async function runReportInBackground(
  reportId: string, 
  type: ReportType
): Promise<void> {
  try {
    // Update status to running
    await updateReportStatus(reportId, 'running');

    let summary: Record<string, unknown> = {};
    let error: string | null = null;

    switch (type) {
      case 'lighthouse':
        // Simplified: just record that we would run Lighthouse
        // Full implementation would require puppeteer/playwright
        summary = {
          note: 'Lighthouse requires headless browser - run manually with npm run lighthouse',
          siteUrl: SITE_URL,
          timestamp: new Date().toISOString(),
        };
        break;

      case 'links':
        // Run linkinator-style check
        try {
          const linksResult = await checkLinks(SITE_URL);
          summary = linksResult;
        } catch (e) {
          error = e instanceof Error ? e.message : 'Link check failed';
        }
        break;

      case 'schema':
        // Check JSON-LD schema
        try {
          const schemaResult = await checkSchema(SITE_URL);
          summary = schemaResult;
        } catch (e) {
          error = e instanceof Error ? e.message : 'Schema check failed';
        }
        break;
    }

    // Update report with results
    await updateReportStatus(
      reportId,
      error ? 'failed' : 'success',
      summary,
      error
    );

  } catch (err) {
    console.error('Background job error:', err);
    await updateReportStatus(
      reportId,
      'failed',
      null,
      err instanceof Error ? err.message : 'Unknown error'
    );
  }
}
