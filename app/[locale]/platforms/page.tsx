import { permanentRedirect } from 'next/navigation';

/**
 * Legacy /platforms route - permanently redirects to /events
 *
 * @see doc/SPEC.md (Legacy: /platforms → /events)
 * @see doc/archive/2026-01-28-step-plan-v15-cms-vnext-nav-blog-taxonomy-events-pages.md (PR-43)
 * @see ARCHITECTURE.md §3.11 (Redirect Contract: canonicalization must use permanent redirect)
 */
export default async function PlatformsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/events`);
}
