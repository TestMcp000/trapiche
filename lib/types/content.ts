// Site Content Types for CMS

export interface SiteContent {
  id: string;
  section_key: string;
  content_en: Record<string, unknown>;
  content_zh: Record<string, unknown>;
  is_published: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface PortfolioItem {
  id: string;
  sort_order: number;
  title_en: string;
  title_zh: string;
  description_en: string | null;
  description_zh: string | null;
  url: string | null;
  status: 'live' | 'development' | 'archived';
  badge_color: string;
  is_featured: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface PortfolioItemInput {
  sort_order?: number;
  title_en: string;
  title_zh: string;
  description_en?: string;
  description_zh?: string;
  url?: string;
  status?: 'live' | 'development' | 'archived';
  badge_color?: string;
  is_featured?: boolean;
  is_visible?: boolean;
}

export interface Service {
  id: string;
  sort_order: number;
  title_en: string;
  title_zh: string;
  description_en: string | null;
  description_zh: string | null;
  icon: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceInput {
  sort_order?: number;
  title_en: string;
  title_zh: string;
  description_en?: string;
  description_zh?: string;
  icon?: string;
  is_visible?: boolean;
}

export interface CompanySetting {
  id: string;
  key: string;
  value: string;
  label_en: string | null;
  label_zh: string | null;
  category: string;
  updated_at: string;
}

export interface ContentHistory {
  id: string;
  content_type: 'site_content' | 'portfolio' | 'service' | 'setting' | 'gallery_category' | 'gallery_item' | 'gallery_pin';
  content_id: string;
  action: 'create' | 'update' | 'publish' | 'unpublish' | 'delete';
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown>;
  changed_by: string | null;
  changed_at: string;
}

// =============================================================================
// Upload Signature API Types (for /api/upload-signature)
// =============================================================================

export interface UploadSignatureResponse {
  signature: string;
  timestamp: number;
  cloudName: string;
  folder: string;
}

export interface UploadSignatureErrorResponse {
  error: string;
}
