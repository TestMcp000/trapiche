/**
 * Hamburger Nav V2 Types
 *
 * Type definitions for the hamburger navigation menu with typed targets.
 * Targets are resolved to canonical hrefs at render time by the nav-resolver.
 *
 * @module lib/types/hamburger-nav
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (FR-9)
 */

// =============================================================================
// Nav Target Types (Discriminated Union)
// =============================================================================

/**
 * All allowed target types for hamburger nav items
 */
export type NavTargetType =
    | 'blog_index'
    | 'blog_category'
    | 'blog_post'
    | 'blog_group'
    | 'blog_topic'
    | 'blog_tag'
    | 'gallery_index'
    | 'gallery_category'
    | 'gallery_item'
    | 'events_index'
    | 'event_detail'
    | 'faq_index'
    | 'page'
    | 'anchor'
    | 'external';

/**
 * Allowed query parameters for blog/gallery indexes
 */
export interface NavQueryParams {
    q?: string;
    tag?: string;
    sort?: string;
    page?: string;
}

/**
 * Blog index target
 */
export interface NavTargetBlogIndex {
    type: 'blog_index';
    q?: string;
    sort?: string;
    page?: string;
}

/**
 * Blog category target
 */
export interface NavTargetBlogCategory {
    type: 'blog_category';
    categorySlug: string;
    q?: string;
    sort?: string;
    page?: string;
}

/**
 * Blog post target
 */
export interface NavTargetBlogPost {
    type: 'blog_post';
    postSlug: string;
}

/**
 * Blog group target (taxonomy v2)
 */
export interface NavTargetBlogGroup {
    type: 'blog_group';
    groupSlug: string;
    q?: string;
    sort?: string;
    page?: string;
}

/**
 * Blog topic target (taxonomy v2 - maps to /blog/categories/[slug])
 */
export interface NavTargetBlogTopic {
    type: 'blog_topic';
    topicSlug: string;
    q?: string;
    sort?: string;
    page?: string;
}

/**
 * Blog tag target (taxonomy v2)
 */
export interface NavTargetBlogTag {
    type: 'blog_tag';
    tagSlug: string;
    sort?: string;
    page?: string;
}

/**
 * Gallery index target
 */
export interface NavTargetGalleryIndex {
    type: 'gallery_index';
    q?: string;
    tag?: string;
    sort?: string;
    page?: string;
}

/**
 * Gallery category target
 */
export interface NavTargetGalleryCategory {
    type: 'gallery_category';
    categorySlug: string;
    q?: string;
    tag?: string;
    sort?: string;
    page?: string;
}

/**
 * Gallery item target
 */
export interface NavTargetGalleryItem {
    type: 'gallery_item';
    categorySlug: string;
    itemSlug: string;
}

/**
 * Internal page target
 */
export interface NavTargetPage {
    type: 'page';
    path: string;
    hash?: string;
}

/**
 * Anchor target (same page)
 */
export interface NavTargetAnchor {
    type: 'anchor';
    hash: string;
}

/**
 * External URL target
 */
export interface NavTargetExternal {
    type: 'external';
    url: string;
}

/**
 * Events index target
 */
export interface NavTargetEventsIndex {
    type: 'events_index';
    eventType?: string;
    q?: string;
    sort?: string;
    page?: string;
}

/**
 * Event detail target
 */
export interface NavTargetEventDetail {
    type: 'event_detail';
    eventSlug: string;
}

/**
 * FAQ index target
 */
export interface NavTargetFAQIndex {
    type: 'faq_index';
}

/**
 * Union of all nav target types
 */
export type NavTarget =
    | NavTargetBlogIndex
    | NavTargetBlogCategory
    | NavTargetBlogPost
    | NavTargetBlogGroup
    | NavTargetBlogTopic
    | NavTargetBlogTag
    | NavTargetGalleryIndex
    | NavTargetGalleryCategory
    | NavTargetGalleryItem
    | NavTargetEventsIndex
    | NavTargetEventDetail
    | NavTargetFAQIndex
    | NavTargetPage
    | NavTargetAnchor
    | NavTargetExternal;

// =============================================================================
// Hamburger Nav Structure
// =============================================================================

/**
 * Navigation item within a group
 */
export interface HamburgerNavItem {
    id: string;
    label: string;
    target: NavTarget;
}

/**
 * Navigation group (accordion section)
 */
export interface HamburgerNavGroup {
    id: string;
    label: string;
    items: HamburgerNavItem[];
}

/**
 * Complete hamburger nav structure (v2)
 */
export interface HamburgerNavV2 {
    version: 2;
    groups: HamburgerNavGroup[];
}

// =============================================================================
// Resolved Nav Types (Render-Ready)
// =============================================================================

/**
 * Resolved navigation item with computed href
 */
export interface ResolvedNavItem {
    id: string;
    label: string;
    href: string;
    isExternal: boolean;
    /** Only set for external links */
    externalAttrs?: {
        target: '_blank';
        rel: 'noopener noreferrer';
    };
}

/**
 * Resolved navigation group
 */
export interface ResolvedNavGroup {
    id: string;
    label: string;
    items: ResolvedNavItem[];
}

/**
 * Resolved hamburger nav ready for rendering
 */
export interface ResolvedHamburgerNav {
    version: 2;
    groups: ResolvedNavGroup[];
}

// =============================================================================
// Validation Types
// =============================================================================

/**
 * Validation error with JSON path for precise error location
 */
export interface NavValidationError {
    path: string;
    message: string;
}

/**
 * Validation result
 */
export interface NavValidationResult {
    valid: boolean;
    errors: NavValidationError[];
}

/**
 * Deep validation error (includes DB-related errors)
 */
export interface NavDeepValidationError extends NavValidationError {
    targetType?: NavTargetType;
    targetSlug?: string;
}

/**
 * Deep validation result (for publish)
 */
export interface NavDeepValidationResult {
    valid: boolean;
    errors: NavDeepValidationError[];
}
