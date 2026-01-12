/**
 * Shop Import IO Module (Server-only)
 *
 * Orchestrates shop data import operations.
 * Imports products with variants and coupons.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §4
 * @see uiux_refactor.md §6.1.3 Phase 2
 */
import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { parseProductsJson } from './parsers/products-json';
import { parseCouponsJson } from './parsers/coupons-json';
import { validateProduct, validateCoupon } from './validators/shop';

// =============================================================================
// Types
// =============================================================================

/** Individual item preview in import */
export interface ImportPreviewItem {
  slug: string;
  name?: string;
  valid: boolean;
  errors?: Record<string, string>;
}

/** Products import preview result */
export interface ProductsImportPreview {
  success: boolean;
  error?: string;
  products: {
    total: number;
    valid: number;
    items: ImportPreviewItem[];
  };
}

/** Coupons import preview result */
export interface CouponsImportPreview {
  success: boolean;
  error?: string;
  coupons: {
    total: number;
    valid: number;
    items: ImportPreviewItem[];
  };
}

/** Import apply result */
export interface ShopImportResult {
  success: boolean;
  error?: string;
  imported: number;
  errors: Array<{ slug: string; error: string }>;
}

// =============================================================================
// Products Import
// =============================================================================

/**
 * Preview a products import without writing to database.
 */
export async function previewProductsImport(
  jsonString: string
): Promise<ProductsImportPreview> {
  const parseResult = parseProductsJson(jsonString);

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
      products: { total: 0, valid: 0, items: [] },
    };
  }

  const products = parseResult.data;
  const productPreviews: ImportPreviewItem[] = [];
  let validCount = 0;

  for (const product of products) {
    const validationResult = validateProduct(product);
    
    if (validationResult.valid) {
      validCount++;
      productPreviews.push({
        slug: product.slug,
        name: product.name_en ?? undefined,
        valid: true,
      });
    } else {
      productPreviews.push({
        slug: product.slug,
        name: product.name_en ?? undefined,
        valid: false,
        errors: Object.fromEntries(
          validationResult.errors.map((e) => [e.field, e.message])
        ),
      });
    }
  }

  return {
    success: true,
    products: {
      total: products.length,
      valid: validCount,
      items: productPreviews,
    },
  };
}

/**
 * Apply a products import to the database.
 */
export async function applyProductsImport(
  jsonString: string
): Promise<ShopImportResult> {
  const parseResult = parseProductsJson(jsonString);

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
      imported: 0,
      errors: [],
    };
  }

  const supabase = await createClient();
  const errors: Array<{ slug: string; error: string }> = [];
  let imported = 0;

  for (const product of parseResult.data) {
    try {
      // Upsert product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .upsert({
          slug: product.slug,
          name_en: product.name_en,
          name_zh: product.name_zh,
          description_short_en: product.description_short_en,
          description_short_zh: product.description_short_zh,
          description_full_en: product.description_full_en,
          description_full_zh: product.description_full_zh,
          category: product.category,
          cover_image_url: product.cover_image_url,
          media_urls: product.media_urls,
          tags_en: product.tags_en,
          tags_zh: product.tags_zh,
          is_visible: product.is_visible,
          sort_order: product.sort_order,
        }, { onConflict: 'slug' })
        .select('id')
        .single();

      if (productError || !productData) {
        errors.push({ slug: product.slug, error: productError?.message ?? 'Failed to insert product' });
        continue;
      }

      // Upsert variants
      for (const variant of product.variants) {
        const { error: variantError } = await supabase
          .from('product_variants')
          .upsert({
            product_id: productData.id,
            variant_key: variant.variant_key,
            option_values_json: variant.option_values,
            sku: variant.sku,
            price_cents: variant.price_cents,
            compare_at_price_cents: variant.compare_at_price_cents,
            stock: variant.stock,
            is_enabled: variant.is_enabled,
          }, { onConflict: 'product_id,variant_key' });

        if (variantError) {
          errors.push({ slug: `${product.slug}/${variant.variant_key}`, error: variantError.message });
        }
      }

      imported++;
    } catch (error) {
      errors.push({ slug: product.slug, error: String(error) });
    }
  }

  return {
    success: errors.length === 0,
    imported,
    errors,
  };
}

// =============================================================================
// Coupons Import
// =============================================================================

/**
 * Preview a coupons import without writing to database.
 */
export async function previewCouponsImport(
  jsonString: string
): Promise<CouponsImportPreview> {
  const parseResult = parseCouponsJson(jsonString);

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
      coupons: { total: 0, valid: 0, items: [] },
    };
  }

  const coupons = parseResult.data;
  const couponPreviews: ImportPreviewItem[] = [];
  let validCount = 0;

  for (const coupon of coupons) {
    const validationResult = validateCoupon(coupon);
    
    if (validationResult.valid) {
      validCount++;
      couponPreviews.push({
        slug: coupon.code,
        valid: true,
      });
    } else {
      couponPreviews.push({
        slug: coupon.code,
        valid: false,
        errors: Object.fromEntries(
          validationResult.errors.map((e) => [e.field, e.message])
        ),
      });
    }
  }

  return {
    success: true,
    coupons: {
      total: coupons.length,
      valid: validCount,
      items: couponPreviews,
    },
  };
}

/**
 * Apply a coupons import to the database.
 */
export async function applyCouponsImport(
  jsonString: string
): Promise<ShopImportResult> {
  const parseResult = parseCouponsJson(jsonString);

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
      imported: 0,
      errors: [],
    };
  }

  const supabase = await createClient();
  const errors: Array<{ slug: string; error: string }> = [];
  let imported = 0;

  for (const coupon of parseResult.data) {
    const { error } = await supabase
      .from('coupons')
      .upsert({
        code: coupon.code,
        type: coupon.discount_type,
        value: coupon.discount_value,
        min_subtotal_cents: coupon.min_order_cents,
        max_usage_count: coupon.max_uses,
        starts_at: coupon.starts_at,
        expires_at: coupon.expires_at,
        is_active: coupon.is_active,
      }, { onConflict: 'code' });

    if (error) {
      errors.push({ slug: coupon.code, error: error.message });
    } else {
      imported++;
    }
  }

  return {
    success: errors.length === 0,
    imported,
    errors,
  };
}
