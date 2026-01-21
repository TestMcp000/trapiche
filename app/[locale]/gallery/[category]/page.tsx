/**
 * Gallery Category Page (Redirect-Only)
 * 
 * PR-6B: This legacy v1 route (/gallery/[category]) is now redirect-only.
 * All requests are 301 redirected to the v2 canonical path (/gallery/categories/[slug]).
 * 
 * This eliminates duplicate content and ensures consistent URLs.
 */

import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{
    q?: string;
    tag?: string;
    sort?: string;
  }>;
}

// No metadata export - this page only redirects

export default async function GalleryCategoryPage({ params, searchParams }: PageProps) {
  const { locale, category: categorySlug } = await params;
  const query = await searchParams;
  
  // Build canonical URL with preserved query params
  const redirectParams = new URLSearchParams();
  if (query.q) redirectParams.set('q', query.q);
  if (query.tag) redirectParams.set('tag', query.tag);
  if (query.sort) redirectParams.set('sort', query.sort);
  const queryString = redirectParams.toString();
  
  // PR-6B: Redirect to v2 canonical path
  const canonicalUrl = `/${locale}/gallery/categories/${categorySlug}${queryString ? `?${queryString}` : ''}`;
  permanentRedirect(canonicalUrl);
}
