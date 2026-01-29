/**
 * Nav Resolver
 *
 * Pure function to resolve hamburger nav targets to canonical hrefs.
 * Does not perform any DB queries - just maps targets to URLs.
 *
 * @module lib/site/nav-resolver
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (Implementation Contract B)
 */

import type {
    HamburgerNavV2,
    HamburgerNavGroup,
    HamburgerNavItem,
    NavTarget,
    ResolvedHamburgerNav,
    ResolvedNavGroup,
    ResolvedNavItem,
} from '@/lib/types/hamburger-nav';

// =============================================================================
// Query String Builder
// =============================================================================

/**
 * Build query string from target parameters
 */
function buildQueryString(params: Record<string, string | undefined>): string {
    const entries = Object.entries(params)
        .filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== '')
        .sort(([a], [b]) => a.localeCompare(b));

    if (entries.length === 0) return '';

    const searchParams = new URLSearchParams();
    for (const [key, value] of entries) {
        searchParams.set(key, value);
    }

    return `?${searchParams.toString()}`;
}

// =============================================================================
// Target Resolvers
// =============================================================================

/**
 * Resolve a nav target to a canonical href
 */
function resolveTarget(target: NavTarget, locale: string): { href: string; isExternal: boolean } {
    switch (target.type) {
        case 'blog_index': {
            const query = buildQueryString({
                q: target.q,
                sort: target.sort,
                page: target.page,
            });
            return { href: `/${locale}/blog${query}`, isExternal: false };
        }

        case 'blog_category': {
            const query = buildQueryString({
                q: target.q,
                sort: target.sort,
                page: target.page,
            });
            return { href: `/${locale}/blog/categories/${target.categorySlug}${query}`, isExternal: false };
        }

        case 'blog_post': {
            return { href: `/${locale}/blog/posts/${target.postSlug}`, isExternal: false };
        }

        case 'blog_group': {
            const query = buildQueryString({
                q: target.q,
                sort: target.sort,
                page: target.page,
            });
            return { href: `/${locale}/blog/groups/${target.groupSlug}${query}`, isExternal: false };
        }

        case 'blog_topic': {
            // blog_topic maps to /blog/categories/[slug] for backward compatibility
            const query = buildQueryString({
                q: target.q,
                sort: target.sort,
                page: target.page,
            });
            return { href: `/${locale}/blog/categories/${target.topicSlug}${query}`, isExternal: false };
        }

        case 'blog_tag': {
            const query = buildQueryString({
                sort: target.sort,
                page: target.page,
            });
            return { href: `/${locale}/blog/tags/${target.tagSlug}${query}`, isExternal: false };
        }

        case 'gallery_index': {
            const query = buildQueryString({
                q: target.q,
                tag: target.tag,
                sort: target.sort,
                page: target.page,
            });
            return { href: `/${locale}/gallery${query}`, isExternal: false };
        }

        case 'gallery_category': {
            const query = buildQueryString({
                q: target.q,
                tag: target.tag,
                sort: target.sort,
                page: target.page,
            });
            return { href: `/${locale}/gallery/categories/${target.categorySlug}${query}`, isExternal: false };
        }

        case 'gallery_item': {
            return {
                href: `/${locale}/gallery/items/${target.categorySlug}/${target.itemSlug}`,
                isExternal: false,
            };
        }

        case 'events_index': {
            const query = buildQueryString({
                type: target.eventType,
                tag: target.tag,
                q: target.q,
                sort: target.sort,
                page: target.page,
            });
            return { href: `/${locale}/events${query}`, isExternal: false };
        }

        case 'event_detail': {
            return { href: `/${locale}/events/${target.eventSlug}`, isExternal: false };
        }

        case 'faq_index': {
            return { href: `/${locale}/faq`, isExternal: false };
        }

        case 'page': {
            const normalizedPath = target.path === '/' ? '' : target.path;
            const hash = target.hash ? (target.hash.startsWith('#') ? target.hash : `#${target.hash}`) : '';
            return { href: `/${locale}${normalizedPath}${hash}`, isExternal: false };
        }

        case 'anchor': {
            const normalizedHash = target.hash.startsWith('#') ? target.hash : `#${target.hash}`;
            return { href: normalizedHash, isExternal: false };
        }

        case 'external': {
            return { href: target.url, isExternal: true };
        }

        default: {
            // TypeScript exhaustiveness check
            const _exhaustive: never = target;
            return { href: '#', isExternal: false };
        }
    }
}

/**
 * Resolve a nav item to a render-ready item
 */
function resolveNavItem(item: HamburgerNavItem, locale: string): ResolvedNavItem {
    const { href, isExternal } = resolveTarget(item.target, locale);

    const resolved: ResolvedNavItem = {
        id: item.id,
        label: item.label,
        href,
        isExternal,
    };

    if (isExternal) {
        resolved.externalAttrs = {
            target: '_blank',
            rel: 'noopener noreferrer',
        };
    }

    return resolved;
}

/**
 * Resolve a nav group to a render-ready group
 */
function resolveNavGroup(group: HamburgerNavGroup, locale: string): ResolvedNavGroup {
    return {
        id: group.id,
        label: group.label,
        items: group.items.map(item => resolveNavItem(item, locale)),
    };
}

// =============================================================================
// Main Resolver
// =============================================================================

/**
 * Resolve a complete hamburger nav to render-ready format
 *
 * @param nav - The hamburger nav v2 structure
 * @param locale - The current locale for URL prefixing
 * @returns Resolved nav with computed hrefs
 */
export function resolveHamburgerNav(
    nav: HamburgerNavV2,
    locale: string
): ResolvedHamburgerNav {
    return {
        version: 2,
        groups: nav.groups.map(group => resolveNavGroup(group, locale)),
    };
}

/**
 * Resolve a single nav target to href (utility export)
 */
export function resolveNavTarget(target: NavTarget, locale: string): string {
    return resolveTarget(target, locale).href;
}

/**
 * Check if a target is external
 */
export function isExternalTarget(target: NavTarget): boolean {
    return target.type === 'external';
}
