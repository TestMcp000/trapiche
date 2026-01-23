/**
 * Canonical URL Builders
 *
 * Single source of truth for generating v2 canonical URLs.
 * All public-facing internal links should use these builders
 * to ensure consistency and prevent SEO drift.
 *
 * @see ARCHITECTURE.md §3.11 (SEO/URL single source; v2 canonical path builders)
 * @see doc/SPEC.md #seo
 */

// =============================================================================
// Blog URL Builders
// =============================================================================

/**
 * Build canonical URL for a blog post.
 * v2 canonical: /{locale}/blog/posts/{slug}
 */
export function buildBlogPostUrl(locale: string, slug: string): string {
    return `/${locale}/blog/posts/${slug}`;
}

/**
 * Build canonical URL for a blog category.
 * v2 canonical: /{locale}/blog/categories/{slug}
 */
export function buildBlogCategoryUrl(
    locale: string,
    categorySlug: string,
    query?: { q?: string; sort?: string }
): string {
    const base = `/${locale}/blog/categories/${categorySlug}`;
    const params = new URLSearchParams();
    if (query?.q) params.set('q', query.q);
    if (query?.sort) params.set('sort', query.sort);
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
}

/**
 * Build URL for blog list (all posts).
 * /{locale}/blog with optional query params
 */
export function buildBlogListUrl(
    locale: string,
    query?: { q?: string; sort?: string }
): string {
    const base = `/${locale}/blog`;
    const params = new URLSearchParams();
    if (query?.q) params.set('q', query.q);
    if (query?.sort) params.set('sort', query.sort);
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
}

// =============================================================================
// Gallery URL Builders
// =============================================================================

/**
 * Build canonical URL for a gallery item.
 * v2 canonical: /{locale}/gallery/items/{categorySlug}/{itemSlug}
 */
export function buildGalleryItemUrl(
    locale: string,
    categorySlug: string,
    itemSlug: string
): string {
    return `/${locale}/gallery/items/${categorySlug}/${itemSlug}`;
}

/**
 * Build canonical URL for a gallery category.
 * v2 canonical: /{locale}/gallery/categories/{slug}
 */
export function buildGalleryCategoryUrl(
    locale: string,
    categorySlug: string,
    query?: { q?: string; tag?: string; sort?: string }
): string {
    const base = `/${locale}/gallery/categories/${categorySlug}`;
    const params = new URLSearchParams();
    if (query?.q) params.set('q', query.q);
    if (query?.tag) params.set('tag', query.tag);
    if (query?.sort) params.set('sort', query.sort);
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
}

/**
 * Build URL for gallery list (all items).
 * /{locale}/gallery with optional query params
 */
export function buildGalleryListUrl(
    locale: string,
    query?: { q?: string; tag?: string; sort?: string }
): string {
    const base = `/${locale}/gallery`;
    const params = new URLSearchParams();
    if (query?.q) params.set('q', query.q);
    if (query?.tag) params.set('tag', query.tag);
    if (query?.sort) params.set('sort', query.sort);
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
}
