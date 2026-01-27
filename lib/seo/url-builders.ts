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

/**
 * Build canonical URL for a blog group (taxonomy v2).
 * v2 canonical: /{locale}/blog/groups/{slug}
 */
export function buildBlogGroupUrl(
    locale: string,
    groupSlug: string,
    query?: { q?: string; sort?: string }
): string {
    const base = `/${locale}/blog/groups/${groupSlug}`;
    const params = new URLSearchParams();
    if (query?.q) params.set('q', query.q);
    if (query?.sort) params.set('sort', query.sort);
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
}

/**
 * Build canonical URL for a blog topic (taxonomy v2).
 * Maps to /blog/categories/[slug] for backward compatibility.
 * v2 canonical: /{locale}/blog/categories/{slug}
 */
export function buildBlogTopicUrl(
    locale: string,
    topicSlug: string,
    query?: { q?: string; sort?: string }
): string {
    // Topics use /blog/categories/[slug] for backward compatibility
    return buildBlogCategoryUrl(locale, topicSlug, query);
}

/**
 * Build canonical URL for a blog tag (taxonomy v2).
 * v2 canonical: /{locale}/blog/tags/{slug}
 */
export function buildBlogTagUrl(
    locale: string,
    tagSlug: string,
    query?: { sort?: string }
): string {
    const base = `/${locale}/blog/tags/${tagSlug}`;
    const params = new URLSearchParams();
    if (query?.sort) params.set('sort', query.sort);
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
}

// =============================================================================
// Events URL Builders
// =============================================================================

/**
 * Build URL for events list.
 * /{locale}/events with optional query params
 */
export function buildEventsListUrl(
    locale: string,
    query?: { type?: string; q?: string; sort?: string }
): string {
    const base = `/${locale}/events`;
    const params = new URLSearchParams();
    if (query?.type) params.set('type', query.type);
    if (query?.q) params.set('q', query.q);
    if (query?.sort) params.set('sort', query.sort);
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
}

/**
 * Build canonical URL for a single event.
 * /{locale}/events/{slug}
 */
export function buildEventDetailUrl(
    locale: string,
    slug: string
): string {
    return `/${locale}/events/${slug}`;
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
// =============================================================================
// FAQ URL Builders
// =============================================================================

/**
 * Build URL for FAQ page.
 * /{locale}/faq
 */
export function buildFAQUrl(locale: string): string {
    return `/${locale}/faq`;
}

// =============================================================================
// Contact URL Builders
// =============================================================================

/**
 * Build URL for contact page.
 * /{locale}/contact
 */
export function buildContactUrl(locale: string): string {
    return `/${locale}/contact`;
}