/**
 * Legacy Gallery Category Redirect
 *
 * Redirects legacy /gallery/[category] to canonical /gallery/categories/[slug]
 * Uses permanentRedirect (308) to preserve SEO value.
 *
 * @see doc/SPEC.md #gallery (Gallery routes + legacy redirects)
 * @see ARCHITECTURE.md §3.11 (v2 canonical path builders)
 */

import { permanentRedirect } from "next/navigation";
import { buildGalleryCategoryUrl } from "@/lib/seo/url-builders";

interface LegacyRedirectProps {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{
    q?: string;
    tag?: string;
    sort?: string;
  }>;
}

export default async function LegacyGalleryCategoryRedirect({
  params,
  searchParams,
}: LegacyRedirectProps) {
  const { locale, category: categorySlug } = await params;
  const { q, tag, sort } = await searchParams;

  // Redirect to v2 canonical URL
  const canonicalUrl = buildGalleryCategoryUrl(locale, categorySlug, {
    q,
    tag,
    sort,
  });

  permanentRedirect(canonicalUrl);
}
