'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import { generateSlug } from '@/lib/utils/slug';
import { isValidSlug } from '@/lib/validators/slug';
import {
  checkProductSlugExists,
  createProductAdmin,
  updateProductAdmin,
  deleteProductAdmin,
  type ProductDbPayload,
  type VariantDbPayload,
} from '@/lib/modules/shop/admin-io';

// =============================================================================
// Types
// =============================================================================

export interface ProductInput {
  slug?: string;
  nameEn: string | null;
  nameZh: string | null;
  descriptionShortEn: string | null;
  descriptionShortZh: string | null;
  descriptionFullEn: string | null;
  descriptionFullZh: string | null;
  category: string; // Required
  tagsEn: string[];
  tagsZh: string[];
  coverImageUrl: string | null;
  mediaUrls: string[];
  seoTitleEn: string | null;
  seoTitleZh: string | null;
  seoDescriptionEn: string | null;
  seoDescriptionZh: string | null;
  isVisible: boolean;
  sortOrder: number;
}

export interface VariantInput {
  variantKey: string;
  optionValuesJson: Record<string, string>;
  sku: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
  isEnabled: boolean;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  productId?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function validateCategory(category: string): string | null {
  if (!category || category.trim() === '') {
    return 'Category is required';
  }
  // Check if category is URL-safe (single source: lib/validators/slug.ts)
  if (!isValidSlug(category)) {
    return 'Category must be URL-safe (lowercase letters, numbers, and hyphens only)';
  }
  return null;
}

function toProductDbPayload(product: ProductInput, slug: string): ProductDbPayload {
  return {
    slug,
    name_en: product.nameEn,
    name_zh: product.nameZh,
    description_short_en: product.descriptionShortEn,
    description_short_zh: product.descriptionShortZh,
    description_full_en: product.descriptionFullEn,
    description_full_zh: product.descriptionFullZh,
    category: product.category,
    tags_en: product.tagsEn,
    tags_zh: product.tagsZh,
    cover_image_url: product.coverImageUrl,
    media_urls: product.mediaUrls,
    seo_title_en: product.seoTitleEn,
    seo_title_zh: product.seoTitleZh,
    seo_description_en: product.seoDescriptionEn,
    seo_description_zh: product.seoDescriptionZh,
    is_visible: product.isVisible,
    sort_order: product.sortOrder,
  };
}

function toVariantDbPayloads(variants: VariantInput[]): VariantDbPayload[] {
  return variants.map((v) => ({
    variant_key: v.variantKey,
    option_values_json: v.optionValuesJson,
    sku: v.sku,
    price_cents: v.priceCents,
    compare_at_price_cents: v.compareAtPriceCents,
    stock: v.stock,
    is_enabled: v.isEnabled,
  }));
}

// =============================================================================
// Create Product
// =============================================================================

export async function createProduct(
  product: ProductInput,
  variants: VariantInput[]
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // Check admin permission
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate category
    const categoryError = validateCategory(product.category);
    if (categoryError) {
      return { success: false, error: categoryError };
    }

    // Generate slug if not provided
    const slug = product.slug || generateSlug(product.nameEn || product.nameZh || 'product');

    // Check slug uniqueness
    const slugExists = await checkProductSlugExists(slug);
    if (slugExists) {
      return { success: false, error: 'A product with this slug already exists' };
    }

    // Create product via lib
    const result = await createProductAdmin(
      toProductDbPayload(product, slug),
      toVariantDbPayloads(variants)
    );

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Invalidate cache
    revalidateTag('shop', { expire: 0 });
    revalidatePath('/sitemap.xml');

    return { success: true, productId: result.id };
  } catch (error) {
    console.error('Unexpected error in createProduct:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =============================================================================
// Update Product
// =============================================================================

export async function updateProduct(
  productId: string,
  product: ProductInput,
  variants: VariantInput[]
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // Check admin permission
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate category
    const categoryError = validateCategory(product.category);
    if (categoryError) {
      return { success: false, error: categoryError };
    }

    // Generate slug if not provided
    const slug = product.slug || generateSlug(product.nameEn || product.nameZh || 'product');

    // Check slug uniqueness (excluding current product)
    const slugExists = await checkProductSlugExists(slug, productId);
    if (slugExists) {
      return { success: false, error: 'A product with this slug already exists' };
    }

    // Update product via lib
    const result = await updateProductAdmin(
      productId,
      { ...toProductDbPayload(product, slug), updated_at: new Date().toISOString() },
      toVariantDbPayloads(variants)
    );

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Invalidate cache
    revalidateTag('shop', { expire: 0 });
    revalidatePath('/sitemap.xml');

    return { success: true, productId };
  } catch (error) {
    console.error('Unexpected error in updateProduct:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =============================================================================
// Delete Product
// =============================================================================

export async function deleteProduct(productId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // Check admin permission
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Delete product via lib
    const result = await deleteProductAdmin(productId);

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Invalidate cache
    revalidateTag('shop', { expire: 0 });
    revalidatePath('/sitemap.xml');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in deleteProduct:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
