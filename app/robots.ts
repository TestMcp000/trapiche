/**
 * robots.txt — MetadataRoute
 *
 * Provides SEO directives for web crawlers.
 *
 * Rules:
 * - Allow all public pages (default)
 * - Disallow /admin/* paths (SEO isolation for admin routes)
 *
 * @see doc/SPEC.md #seo
 * @see ARCHITECTURE.md §3.11 (SEO/URL single source)
 */
import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/admin'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
