/**
 * Landing Section Types
 *
 * TypeScript definitions for the dynamic landing page system.
 * Mirrors the landing_sections database table and content block types.
 */

// ============================================
// Section Type Enumeration
// ============================================

export type LandingSectionType = 'text' | 'text_image' | 'cards' | 'gallery' | 'cta';

// ============================================
// Content Block Types
// ============================================

/**
 * Pure text content block
 */
export interface TextContent {
  body: string; // Markdown supported
}

/**
 * Split layout with text and image
 */
export interface TextImageContent {
  body: string;
  image_url: string;
  image_alt: string;
  image_position: 'left' | 'right';
}

/**
 * Grid of cards (for services, features)
 */
export interface CardsContent {
  items: Array<{
    title: string;
    description: string;
    image_url?: string;
    image_alt?: string;
    link_url?: string;
  }>;
  columns: 2 | 3 | 4;
}

/**
 * Image grid from Gallery Category or Featured Pins
 */
export interface GalleryContent {
  limit: number; // Max items to show (1-12)
}

/**
 * Call-to-action block
 */
export interface CtaContent {
  body: string;
  button_text: string;
  button_url: string;
  style: 'primary' | 'secondary';
}

/**
 * Union type for all content types
 */
export type LandingSectionContent =
  | TextContent
  | TextImageContent
  | CardsContent
  | GalleryContent
  | CtaContent;

// ============================================
// Section Row Types
// ============================================

/**
 * Full landing section row from database
 */
export interface LandingSection {
  id: string;
  section_key: string;
  section_type: LandingSectionType;
  sort_order: number;
  is_visible: boolean;

  // Localized content
  title_en: string | null;
  title_zh: string | null;
  subtitle_en: string | null;
  subtitle_zh: string | null;
  content_en: LandingSectionContent | null;
  content_zh: LandingSectionContent | null;

  // Gallery integration
  gallery_category_id: string | null;
  gallery_surface: 'home' | 'gallery' | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Input type for creating/updating sections
 */
export interface LandingSectionInput {
  section_key?: string;
  section_type?: LandingSectionType;
  sort_order?: number;
  is_visible?: boolean;
  title_en?: string | null;
  title_zh?: string | null;
  subtitle_en?: string | null;
  subtitle_zh?: string | null;
  content_en?: LandingSectionContent | null;
  content_zh?: LandingSectionContent | null;
  gallery_category_id?: string | null;
  gallery_surface?: 'home' | 'gallery' | null;
}

// ============================================
// Preset Section Keys
// ============================================

export type PresetSectionKey =
  | 'hero'
  | 'about'
  | 'services'
  | 'platforms'
  | 'product_design'
  | 'portfolio'
  | 'contact';

export type CustomSectionKey =
  | 'custom_1'
  | 'custom_2'
  | 'custom_3'
  | 'custom_4'
  | 'custom_5'
  | 'custom_6'
  | 'custom_7'
  | 'custom_8'
  | 'custom_9'
  | 'custom_10';

export type SectionKey = PresetSectionKey | CustomSectionKey;
