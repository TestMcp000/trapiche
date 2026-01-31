/**
 * Blog Taxonomy v2 Types
 *
 * Type definitions for Blog Groups, Topics, Tags and their relationships.
 *
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-B1–B5)
 * @see supabase/02_add/21_blog_taxonomy_v2.sql
 */

// =============================================================================
// Blog Group (大分類)
// =============================================================================

export interface BlogGroup {
  id: string;
  slug: string;
  name_zh: string;
  sort_order: number;
  is_visible: boolean;
  /** Whether this group should appear in hamburger_nav auto-generation */
  show_in_nav: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogGroupWithTopics extends BlogGroup {
  topics: BlogTopic[];
}

export interface BlogGroupWithCounts extends BlogGroup {
  topic_count: number;
  post_count: number;
}

// =============================================================================
// Blog Topic (子主題)
// =============================================================================

export interface BlogTopic {
  id: string;
  group_id: string;
  slug: string;
  name_zh: string;
  sort_order: number;
  is_visible: boolean;
  /** Whether this topic should appear in hamburger_nav auto-generation */
  show_in_nav: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogTopicWithGroup extends BlogTopic {
  group: BlogGroup;
}

export interface BlogTopicWithCounts extends BlogTopic {
  post_count: number;
}

// =============================================================================
// Blog Tag (自由標籤)
// =============================================================================

export interface BlogTag {
  id: string;
  slug: string;
  name_zh: string;
  /** Whether this tag should appear in hamburger_nav auto-generation */
  show_in_nav: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogTagWithCounts extends BlogTag {
  post_count: number;
}

// =============================================================================
// Join Table Types
// =============================================================================

export interface PostTopic {
  post_id: string;
  topic_id: string;
  created_at: string;
}

export interface PostTag {
  post_id: string;
  tag_id: string;
  created_at: string;
}

// =============================================================================
// Input Types (for creating/updating)
// =============================================================================

export interface BlogGroupInput {
  slug: string;
  name_zh: string;
  sort_order?: number;
  is_visible?: boolean;
  show_in_nav?: boolean;
}

export interface BlogTopicInput {
  group_id: string;
  slug: string;
  name_zh: string;
  sort_order?: number;
  is_visible?: boolean;
  show_in_nav?: boolean;
}

export interface BlogTagInput {
  slug: string;
  name_zh: string;
  show_in_nav?: boolean;
}

// =============================================================================
// Query Result Types
// =============================================================================

/**
 * Post with taxonomy data (group, topics, tags)
 */
export interface PostWithTaxonomy {
  id: string;
  slug: string;
  group_id: string | null;
  group?: BlogGroup | null;
  topics: BlogTopic[];
  tags: BlogTag[];
}

/**
 * Taxonomy summary for a post (IDs only, for form usage)
 */
export interface PostTaxonomySummary {
  group_id: string | null;
  topic_ids: string[];
  tag_ids: string[];
}
