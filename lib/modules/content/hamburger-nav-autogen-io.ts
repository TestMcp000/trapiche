/**
 * Hamburger Nav Auto-Generation IO (Server-only)
 *
 * Syncs `site_content(section_key='hamburger_nav')` from DB-controlled `show_in_nav` flags
 * across blog taxonomy, events, and gallery.
 *
 * Responsibilities:
 * - Fetch source rows (admin-visible) from domain tables
 * - Merge into existing nav (preserving manual groups/items where applicable)
 * - Validate structure (pure) and deep-validate targets (DB existence)
 * - Persist to `site_content` (content_en/content_zh mirrored for single-language site)
 *
 * @module lib/modules/content/hamburger-nav-autogen-io
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { deepValidateHamburgerNav } from '@/lib/modules/content/hamburger-nav-publish-io';
import { getSiteContent, updateSiteContent } from '@/lib/modules/content/site-content-io';
import { buildHamburgerNavWithAutogen } from '@/lib/site/hamburger-nav-autogen';
import type { HamburgerNavV2 } from '@/lib/types/hamburger-nav';
import type { BlogGroup, BlogTag, BlogTopic } from '@/lib/types/blog-taxonomy';
import type { EventTag, EventType } from '@/lib/types/events';
import type { GalleryCategory } from '@/lib/types/gallery';
import { parseHamburgerNav } from '@/lib/validators/hamburger-nav';

const SECTION_KEY = 'hamburger_nav';

const EMPTY_NAV: HamburgerNavV2 = { version: 2, groups: [] };

function stableStringify(value: unknown): string {
    return JSON.stringify(value, (_key, v) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            const obj = v as Record<string, unknown>;
            const sorted: Record<string, unknown> = {};
            for (const key of Object.keys(obj).sort()) {
                sorted[key] = obj[key];
            }
            return sorted;
        }
        return v;
    });
}

export interface SyncHamburgerNavAutogenResult {
    updated: boolean;
    nav: HamburgerNavV2;
}

/**
 * Sync hamburger nav from domain "show_in_nav" flags.
 *
 * Throws on validation/DB errors so callers can map to ActionResult.
 */
export async function syncHamburgerNavAutogen(
    userId?: string
): Promise<SyncHamburgerNavAutogenResult> {
    const supabase = await createClient();

    // Load current nav (draft/published share the same content fields).
    const siteContent = await getSiteContent(SECTION_KEY);
    const currentParsed = siteContent?.content_zh
        ? parseHamburgerNav(siteContent.content_zh)
        : { nav: null, errors: [] };

    const currentNav = currentParsed.nav ?? EMPTY_NAV;

    // Fetch source data
    const [
        blogGroupsRes,
        blogTopicsRes,
        blogTagsRes,
        eventTypesRes,
        eventTagsRes,
        galleryCategoriesRes,
    ] = await Promise.all([
        supabase
            .from('blog_groups')
            .select('id, slug, name_zh, sort_order, is_visible, show_in_nav, created_at, updated_at')
            .order('sort_order', { ascending: true }),
        supabase
            .from('blog_topics')
            .select('id, group_id, slug, name_zh, sort_order, is_visible, show_in_nav, created_at, updated_at')
            .order('sort_order', { ascending: true }),
        supabase
            .from('blog_tags')
            .select('id, slug, name_zh, show_in_nav, created_at, updated_at')
            .order('name_zh', { ascending: true }),
        supabase
            .from('event_types')
            .select('id, slug, name_zh, sort_order, is_visible, show_in_nav, created_at, updated_at')
            .order('sort_order', { ascending: true }),
        supabase
            .from('event_tags')
            .select('id, slug, name_zh, sort_order, is_visible, show_in_nav, created_at, updated_at')
            .order('sort_order', { ascending: true }),
        supabase
            .from('gallery_categories')
            .select('id, sort_order, name_en, name_zh, slug, is_visible, show_in_nav, created_at, updated_at')
            .order('sort_order', { ascending: true }),
    ]);

    if (blogGroupsRes.error) throw new Error(blogGroupsRes.error.message);
    if (blogTopicsRes.error) throw new Error(blogTopicsRes.error.message);
    if (blogTagsRes.error) throw new Error(blogTagsRes.error.message);
    if (eventTypesRes.error) throw new Error(eventTypesRes.error.message);
    if (eventTagsRes.error) throw new Error(eventTagsRes.error.message);
    if (galleryCategoriesRes.error) throw new Error(galleryCategoriesRes.error.message);

    const nextNav = buildHamburgerNavWithAutogen(currentNav, {
        blogGroups: (blogGroupsRes.data ?? []) as BlogGroup[],
        blogTopics: (blogTopicsRes.data ?? []) as BlogTopic[],
        blogTags: (blogTagsRes.data ?? []) as BlogTag[],
        eventTypes: (eventTypesRes.data ?? []) as EventType[],
        eventTags: (eventTagsRes.data ?? []) as EventTag[],
        galleryCategories: (galleryCategoriesRes.data ?? []) as GalleryCategory[],
    });

    // Validate structure (pure)
    const parsed = parseHamburgerNav(nextNav as unknown as Record<string, unknown>);
    if (!parsed.nav || parsed.errors.length > 0) {
        const messages = parsed.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
        throw new Error(`Invalid hamburger_nav generated: ${messages}`);
    }

    // Deep validate targets (DB existence + public/visible constraints)
    const deep = await deepValidateHamburgerNav(parsed.nav);
    if (!deep.valid) {
        const messages = deep.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
        throw new Error(`Deep validation failed for hamburger_nav: ${messages}`);
    }

    // No-op if unchanged
    if (stableStringify(currentNav) === stableStringify(parsed.nav)) {
        return { updated: false, nav: parsed.nav };
    }

    // Persist (single-language site: mirror content)
    const updated = await updateSiteContent(
        SECTION_KEY,
        parsed.nav as unknown as Record<string, unknown>,
        parsed.nav as unknown as Record<string, unknown>,
        userId
    );

    if (!updated) {
        throw new Error('Failed to update site_content for hamburger_nav');
    }

    return { updated: true, nav: parsed.nav };
}

