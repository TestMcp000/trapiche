/**
 * Hamburger Nav Auto-Generation (Pure)
 *
 * Builds/updates a HamburgerNavV2 structure from DB-controlled "show_in_nav" flags.
 * This module is pure (no DB access) so it can be unit-tested.
 *
 * Design notes:
 * - Blog taxonomy:
 *   - Each selected blog_group becomes a nav group (group.id = blog_groups.slug)
 *   - Each selected blog_topic becomes an item under its group (target: blog_topic)
 *   - Selected blog_tags are placed under a dedicated group (id = BLOG_TAGS_GROUP_ID)
 * - Events:
 *   - Selected event types/tags are inserted into the existing "events" group
 *     (or a new one if missing), while preserving non-filter items (e.g. page links).
 * - Gallery:
 *   - Selected gallery categories are inserted into the "gallery" group (or created).
 *
 * @module lib/site/hamburger-nav-autogen
 */

import type { HamburgerNavGroup, HamburgerNavItem, HamburgerNavV2 } from '@/lib/types/hamburger-nav';
import type { BlogGroup, BlogTag, BlogTopic } from '@/lib/types/blog-taxonomy';
import type { EventTag, EventType } from '@/lib/types/events';
import type { GalleryCategory } from '@/lib/types/gallery';

// =============================================================================
// Constants
// =============================================================================

export const EVENTS_GROUP_ID = 'events';
export const GALLERY_GROUP_ID = 'gallery';
export const BLOG_TAGS_GROUP_ID = 'blog-tags';

const DEFAULT_GROUP_LABELS_ZH = {
    events: '講座／活動',
    gallery: '畫廊',
    blogTags: '標籤',
} as const;

// =============================================================================
// Helpers
// =============================================================================

function sortByNumber(a: number, b: number): number {
    return a - b;
}

function clampIndex(index: number, length: number): number {
    if (index < 0) return 0;
    if (index > length) return length;
    return index;
}

function isEventsFilterItem(item: HamburgerNavItem): boolean {
    return (
        item.target.type === 'events_index' &&
        (item.target.eventType !== undefined || item.target.tag !== undefined)
    );
}

function isGalleryCategoryItem(item: HamburgerNavItem): boolean {
    return item.target.type === 'gallery_category';
}

function buildBlogTopicItem(topic: BlogTopic): HamburgerNavItem {
    return {
        id: `blog-topic:${topic.slug}`,
        label: topic.name_zh,
        target: { type: 'blog_topic', topicSlug: topic.slug },
    };
}

function buildBlogTagItem(tag: BlogTag): HamburgerNavItem {
    return {
        id: `blog-tag:${tag.slug}`,
        label: tag.name_zh,
        target: { type: 'blog_tag', tagSlug: tag.slug },
    };
}

function buildEventTypeItem(type: EventType): HamburgerNavItem {
    return {
        id: `event-type:${type.slug}`,
        label: type.name_zh,
        target: { type: 'events_index', eventType: type.slug },
    };
}

function buildEventTagItem(tag: EventTag): HamburgerNavItem {
    return {
        id: `event-tag:${tag.slug}`,
        label: tag.name_zh,
        target: { type: 'events_index', tag: tag.slug },
    };
}

function buildGalleryCategoryItem(category: GalleryCategory): HamburgerNavItem {
    return {
        id: `gallery-category:${category.slug}`,
        label: category.name_zh || category.name_en,
        target: { type: 'gallery_category', categorySlug: category.slug },
    };
}

// =============================================================================
// Main Builder
// =============================================================================

export interface HamburgerNavAutogenSourceData {
    blogGroups: BlogGroup[];
    blogTopics: BlogTopic[];
    blogTags: BlogTag[];
    eventTypes: EventType[];
    eventTags: EventTag[];
    galleryCategories: GalleryCategory[];
}

/**
 * Build a new HamburgerNavV2 with auto-generated sections merged into `current`.
 */
export function buildHamburgerNavWithAutogen(
    current: HamburgerNavV2,
    source: HamburgerNavAutogenSourceData
): HamburgerNavV2 {
    const existingGroups = current.groups ?? [];

    // Manage a domain when:
    // - There are explicit DB selections (show_in_nav = true), OR
    // - The current nav already contains domain-managed sections/items (so we can remove them when all toggles are OFF).
    const blogGroupSlugs = new Set(source.blogGroups.map((g) => g.slug));
    const hasExistingBlogManagedGroups = existingGroups.some(
        (g) => blogGroupSlugs.has(g.id) || g.id === BLOG_TAGS_GROUP_ID
    );

    const existingEventsGroup = existingGroups.find((g) => g.id === EVENTS_GROUP_ID);
    const hasExistingEventsFilters = (existingEventsGroup?.items ?? []).some(isEventsFilterItem);

    const existingGalleryGroup = existingGroups.find((g) => g.id === GALLERY_GROUP_ID);
    const hasExistingGalleryCategories = (existingGalleryGroup?.items ?? []).some(isGalleryCategoryItem);

    const shouldManageBlog =
        hasExistingBlogManagedGroups ||
        source.blogGroups.some((g) => g.show_in_nav) ||
        source.blogTopics.some((t) => t.show_in_nav) ||
        source.blogTags.some((t) => t.show_in_nav);

    const shouldManageEvents =
        hasExistingEventsFilters ||
        source.eventTypes.some((t) => t.show_in_nav) ||
        source.eventTags.some((t) => t.show_in_nav);

    const shouldManageGallery = hasExistingGalleryCategories || source.galleryCategories.some((c) => c.show_in_nav);

    let nextGroups: HamburgerNavGroup[] = existingGroups.slice();

    // -------------------------------------------------------------------------
    // Blog taxonomy groups (blog_groups + blog_topics)
    // -------------------------------------------------------------------------

    if (shouldManageBlog) {
        // Track insertion point for blog taxonomy groups to preserve prior ordering.
        const existingBlogGroupIndexes: number[] = [];
        let blogTagsIndex: number | null = null;

        for (let i = 0; i < nextGroups.length; i++) {
            const group = nextGroups[i];
            if (blogGroupSlugs.has(group.id)) {
                existingBlogGroupIndexes.push(i);
            }
            if (group.id === BLOG_TAGS_GROUP_ID) {
                blogTagsIndex = i;
            }
        }

        const blogInsertionIndex =
            existingBlogGroupIndexes.length > 0 ? Math.min(...existingBlogGroupIndexes) : 0;

        // Remove all blog taxonomy groups (by slug) and the blog-tags group (reserved).
        nextGroups = nextGroups.filter((g) => !blogGroupSlugs.has(g.id) && g.id !== BLOG_TAGS_GROUP_ID);

        const topicsByGroupId = new Map<string, BlogTopic[]>();
        for (const topic of source.blogTopics) {
            const existing = topicsByGroupId.get(topic.group_id) ?? [];
            existing.push(topic);
            topicsByGroupId.set(topic.group_id, existing);
        }

        const blogTaxonomyGroups: HamburgerNavGroup[] = source.blogGroups
            .filter((g) => g.is_visible && g.show_in_nav)
            .sort((a, b) => sortByNumber(a.sort_order, b.sort_order))
            .map((group) => {
                const topics = (topicsByGroupId.get(group.id) ?? [])
                    .filter((t) => t.is_visible && t.show_in_nav)
                    .sort((a, b) => sortByNumber(a.sort_order, b.sort_order));

                return {
                    id: group.slug,
                    label: group.name_zh,
                    items: topics.map(buildBlogTopicItem),
                };
            });

        nextGroups.splice(clampIndex(blogInsertionIndex, nextGroups.length), 0, ...blogTaxonomyGroups);

        // Blog tags group
        const blogTagItems = source.blogTags
            .filter((t) => t.show_in_nav)
            .slice()
            .sort((a, b) => a.name_zh.localeCompare(b.name_zh, 'zh-Hant'))
            .map(buildBlogTagItem);

        if (blogTagItems.length > 0) {
            const insertAt =
                blogTagsIndex !== null
                    ? clampIndex(blogTagsIndex, nextGroups.length)
                    : clampIndex(blogInsertionIndex + blogTaxonomyGroups.length, nextGroups.length);

            nextGroups.splice(insertAt, 0, {
                id: BLOG_TAGS_GROUP_ID,
                label: DEFAULT_GROUP_LABELS_ZH.blogTags,
                items: blogTagItems,
            });
        }
    }

    // -------------------------------------------------------------------------
    // Events group
    // -------------------------------------------------------------------------

    if (shouldManageEvents) {
        const eventTypeItems = source.eventTypes
            .filter((t) => t.is_visible && t.show_in_nav)
            .slice()
            .sort((a, b) => sortByNumber(a.sort_order, b.sort_order))
            .map(buildEventTypeItem);

        const eventTagItems = source.eventTags
            .filter((t) => t.is_visible && t.show_in_nav)
            .slice()
            .sort((a, b) => sortByNumber(a.sort_order, b.sort_order))
            .map(buildEventTagItem);

        const eventsGroupIndex = nextGroups.findIndex((g) => g.id === EVENTS_GROUP_ID);
        if (eventsGroupIndex >= 0) {
            const existing = nextGroups[eventsGroupIndex];
            const kept = existing.items.filter((item) => !isEventsFilterItem(item));
            nextGroups[eventsGroupIndex] = {
                ...existing,
                items: [...eventTypeItems, ...eventTagItems, ...kept],
            };
        } else if (eventTypeItems.length > 0 || eventTagItems.length > 0) {
            nextGroups.push({
                id: EVENTS_GROUP_ID,
                label: DEFAULT_GROUP_LABELS_ZH.events,
                items: [...eventTypeItems, ...eventTagItems],
            });
        }
    }

    // -------------------------------------------------------------------------
    // Gallery group
    // -------------------------------------------------------------------------

    if (shouldManageGallery) {
        const galleryCategoryItems = source.galleryCategories
            .filter((c) => c.is_visible && c.show_in_nav)
            .slice()
            .sort((a, b) => sortByNumber(a.sort_order, b.sort_order))
            .map(buildGalleryCategoryItem);

        const galleryGroupIndex = nextGroups.findIndex((g) => g.id === GALLERY_GROUP_ID);
        if (galleryGroupIndex >= 0) {
            const existing = nextGroups[galleryGroupIndex];
            const kept = existing.items.filter((item) => !isGalleryCategoryItem(item));
            nextGroups[galleryGroupIndex] = {
                ...existing,
                items: [...galleryCategoryItems, ...kept],
            };
        } else if (galleryCategoryItems.length > 0) {
            nextGroups.push({
                id: GALLERY_GROUP_ID,
                label: DEFAULT_GROUP_LABELS_ZH.gallery,
                items: galleryCategoryItems,
            });
        }
    }

    return {
        version: 2,
        groups: nextGroups,
    };
}
