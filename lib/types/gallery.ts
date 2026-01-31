// Gallery Types for Pinterest-style Gallery

export interface GalleryCategory {
  id: string;
  sort_order: number;
  name_en: string;
  name_zh: string;
  slug: string;
  is_visible: boolean;
  /** Whether this category should appear in hamburger_nav auto-generation */
  show_in_nav: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryCategoryInput {
  sort_order?: number;
  name_en: string;
  name_zh: string;
  slug: string;
  is_visible?: boolean;
  show_in_nav?: boolean;
}

export interface GalleryItem {
  id: string;
  category_id: string;
  title_en: string;
  title_zh: string;
  slug: string;
  description_en: string;
  description_zh: string;
  image_url: string;
  image_width?: number | null;
  image_height?: number | null;
  og_image_format: 'jpg' | 'png';
  image_alt_en: string | null;
  image_alt_zh: string | null;
  material_en: string | null;
  material_zh: string | null;
  tags_en: string[];
  tags_zh: string[];
  is_visible: boolean;
  like_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: GalleryCategory;
}

export interface GalleryItemInput {
  category_id: string;
  title_en: string;
  title_zh: string;
  slug: string;
  description_en?: string;
  description_zh?: string;
  image_url: string;
  image_width?: number | null;
  image_height?: number | null;
  og_image_format?: 'jpg' | 'png';
  image_alt_en?: string;
  image_alt_zh?: string;
  material_en?: string;
  material_zh?: string;
  tags_en?: string[];
  tags_zh?: string[];
  is_visible?: boolean;
}

export interface GalleryPin {
  id: string;
  surface: GalleryPinSurface;
  item_id: string;
  sort_order: number;
  created_at: string;
  // Joined fields
  item?: GalleryItem;
}

export type GalleryPinSurface = 'home' | 'gallery' | 'hero';

export type GalleryListSort = 'newest' | 'popular' | 'featured';

export interface GalleryListParams {
  limit?: number;
  offset?: number;
  categorySlug?: string;
  q?: string;
  tag?: string;
  sort?: GalleryListSort;
}

export interface GalleryListResult {
  items: GalleryItem[];
  total: number;
}

// =============================================================================
// API Response Types (for GET /api/gallery/items)
// =============================================================================

/**
 * Gallery item with likedByMe status (for API response)
 */
export interface GalleryItemWithLikedByMe extends GalleryItem {
  likedByMe: boolean;
}

/**
 * GET /api/gallery/items response
 * 
 * 用於 infinite scroll 分頁載入
 */
export interface GalleryItemsApiResponse {
  items: GalleryItemWithLikedByMe[];
  nextOffset: number;
  hasMore: boolean;
  total: number;
}

// =============================================================================
// Gallery Hotspots Types (PR-5)
// =============================================================================

/**
 * Hotspot row from DB (gallery_hotspots table)
 * Normalized coordinates x/y in range [0, 1]
 */
export interface GalleryHotspot {
  id: string;
  item_id: string;
  x: number;
  y: number;
  media: string;
  preview: string | null;
  symbolism: string | null;
  description_md: string;
  read_more_url: string | null;
  sort_order: number | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Public DTO for hotspots (excludes admin-only fields)
 * Used in public pages (Home Hero, Gallery item detail)
 */
export interface GalleryHotspotPublic {
  id: string;
  x: number;
  y: number;
  media: string;
  preview: string | null;
  symbolism: string | null;
  description_md: string;
  read_more_url: string | null;
}

/**
 * Admin input for create/update hotspot
 */
export interface GalleryHotspotInput {
  x: number;
  y: number;
  media: string;
  preview?: string | null;
  symbolism?: string | null;
  description_md: string;
  read_more_url?: string | null;
  is_visible?: boolean;
}

/**
 * Reorder input for admin reorder operation
 * ordered_ids: complete list of hotspot IDs in desired order
 */
export interface GalleryHotspotReorderInput {
  item_id: string;
  ordered_ids: string[];
}
