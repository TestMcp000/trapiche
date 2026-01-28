/**
 * FAQ Types
 *
 * Type definitions for the FAQ domain.
 *
 * @module lib/types/faq
 * @see doc/SPEC.md (FAQ: /faq + /admin/faqs)
 * @see doc/archive/2026-01-28-step-plan-v15-cms-vnext-nav-blog-taxonomy-events-pages.md (PR-38)
 */

// =============================================================================
// FAQ
// =============================================================================

/**
 * Full FAQ data from database
 */
export interface FAQ {
    id: string;
    question_zh: string;
    answer_zh: string;
    sort_order: number;
    is_visible: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * FAQ for public display (lighter payload)
 */
export interface FAQPublic {
    id: string;
    question_zh: string;
    answer_zh: string;
    sort_order: number;
}

/**
 * FAQ input for admin create/update
 */
export interface FAQInput {
    question_zh: string;
    answer_zh: string;
    sort_order?: number;
    is_visible?: boolean;
}

/**
 * FAQ for sitemap
 */
export interface FAQForSitemap {
    updated_at: string;
}
