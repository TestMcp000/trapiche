// Blog Types for Personal Blog Sub-Site

export type Visibility = 'draft' | 'private' | 'public';

export interface Category {
  id: string;
  name_en: string;
  name_zh: string;
  slug: string;
  created_at: string;
}

// Category with post count for sidebar display
export interface CategoryWithCount extends Category {
  post_count: number;
}

export interface Post {
  id: string;
  title_en: string;
  title_zh: string | null;
  slug: string;
  content_en: string;
  content_zh: string | null;
  excerpt_en: string | null;
  excerpt_zh: string | null;
  cover_image_url: string | null;
  cover_image_url_en: string | null;
  cover_image_url_zh: string | null;
  cover_image_alt_en: string | null;
  cover_image_alt_zh: string | null;
  category_id: string | null;
  category?: Category;
  visibility: Visibility;
  author_id: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  reading_time_minutes: number | null;
}

export interface PostInput {
  title_en: string;
  title_zh?: string;
  slug: string;
  content_en: string;
  content_zh?: string;
  excerpt_en?: string;
  excerpt_zh?: string;
  cover_image_url?: string;
  cover_image_url_en?: string;
  cover_image_url_zh?: string;
  cover_image_alt_en?: string;
  cover_image_alt_zh?: string;
  category_id?: string;
  visibility: Visibility;
  reading_time_minutes?: number;
}

// For listing posts with less data
export interface PostSummary {
  id: string;
  title_en: string;
  title_zh: string | null;
  slug: string;
  excerpt_en: string | null;
  excerpt_zh: string | null;
  cover_image_url: string | null;
  cover_image_url_en: string | null;
  cover_image_url_zh: string | null;
  cover_image_alt_en: string | null;
  cover_image_alt_zh: string | null;
  category?: Category;
  visibility: Visibility;
  published_at: string | null;
  created_at: string;
  reading_time_minutes: number | null;
}

// Author information for structured data
export interface Author {
  name: string;
  email?: string;
  avatar_url?: string;
  url?: string;
}

// Post with author information (for article pages with JSON-LD)
export interface PostWithAuthor extends Post {
  author?: Author;
}
