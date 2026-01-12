/**
 * Shop Cart Public IO
 *
 * Public read operations for shopping cart items.
 * Uses anonymous Supabase client for caching-safe reads.
 *
 * @module lib/modules/shop/cart-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import { computeLookupKey } from '@/lib/validators/cart';
import type { CartItemRequest, CartItemResponse } from '@/lib/types/shop';

// =============================================================================
// Cart Item Operations
// =============================================================================

/**
 * Get cart items data for the cart API
 * Centralizes the DB query logic from the cart items API route
 *
 * @param items - Array of cart item requests
 * @returns Array of cart item responses with lookupKey strategy
 */
export async function getCartItemsData(
  items: CartItemRequest[]
): Promise<CartItemResponse[]> {
  if (items.length === 0) {
    return [];
  }

  const supabase = createAnonClient();
  const results: CartItemResponse[] = [];

  // Collect all productIds
  const productIds = [...new Set(items.map((item) => item.productId))];

  // Batch query products
  const { data: products } = await supabase
    .from('products')
    .select('id, slug, name_en, name_zh, cover_image_url, category, is_visible')
    .in('id', productIds);

  const productMap = new Map(products?.map((p) => [p.id, p]) ?? []);

  // Batch query variants
  const { data: variants } = await supabase
    .from('product_variants')
    .select('product_id, variant_key, price_cents, compare_at_price_cents, stock, is_enabled, option_values_json')
    .in('product_id', productIds);

  // Build variant lookup map
  interface VariantData {
    product_id: string;
    variant_key: string;
    price_cents: number;
    compare_at_price_cents: number | null;
    stock: number;
    is_enabled: boolean;
    option_values_json: Record<string, string>;
  }
  const variantMap = new Map<string, VariantData>();
  (variants as VariantData[] | null)?.forEach((v) => {
    const key = v.variant_key ? `${v.product_id}::${v.variant_key}` : v.product_id;
    variantMap.set(key, v);
  });

  // Process each cart item
  for (const item of items) {
    // Calculate lookupKey (for client Map lookup)
    const lookupKey = computeLookupKey(item.productId, item.variantKey);
    const product = productMap.get(item.productId);

    // Product not found
    if (!product) {
      results.push({
        lookupKey,
        productId: item.productId,
        resolvedVariantKey: item.variantKey,
        nameEn: null,
        nameZh: null,
        coverImageUrl: null,
        category: null,
        slug: '',
        variant: null,
        available: false,
        errorCode: 'product_not_found',
      });
      continue;
    }

    // Product not visible
    if (!product.is_visible) {
      results.push({
        lookupKey,
        productId: item.productId,
        resolvedVariantKey: item.variantKey,
        nameEn: product.name_en,
        nameZh: product.name_zh,
        coverImageUrl: product.cover_image_url,
        category: product.category,
        slug: product.slug,
        variant: null,
        available: false,
        errorCode: 'not_visible',
      });
      continue;
    }

    // Find variant
    const variantKey = item.variantKey
      ? `${item.productId}::${item.variantKey}`
      : item.productId;
    const variant = variantMap.get(variantKey);

    // Variant not found (try default variant)
    if (!variant) {
      const variantsList = variants as VariantData[] | null;
      const defaultVariant = variantsList?.find(
        (v) => v.product_id === item.productId && v.is_enabled
      );

      if (!defaultVariant) {
        results.push({
          lookupKey,
          productId: item.productId,
          resolvedVariantKey: item.variantKey,
          nameEn: product.name_en,
          nameZh: product.name_zh,
          coverImageUrl: product.cover_image_url,
          category: product.category,
          slug: product.slug,
          variant: null,
          available: false,
          errorCode: 'variant_not_found',
        });
        continue;
      }

      // Use default variant (note: resolvedVariantKey may differ from request)
      results.push({
        lookupKey,
        productId: item.productId,
        resolvedVariantKey: defaultVariant.variant_key,
        nameEn: product.name_en,
        nameZh: product.name_zh,
        coverImageUrl: product.cover_image_url,
        category: product.category,
        slug: product.slug,
        variant: {
          priceCents: defaultVariant.price_cents,
          compareAtPriceCents: defaultVariant.compare_at_price_cents,
          stock: defaultVariant.stock,
          isEnabled: defaultVariant.is_enabled,
          optionValuesJson: defaultVariant.option_values_json as Record<string, string>,
        },
        available: defaultVariant.is_enabled && defaultVariant.stock > 0,
        errorCode: defaultVariant.stock <= 0 ? 'out_of_stock' : undefined,
      });
      continue;
    }

    // Normal case
    const available = variant.is_enabled && variant.stock > 0;
    results.push({
      lookupKey,
      productId: item.productId,
      resolvedVariantKey: item.variantKey,
      nameEn: product.name_en,
      nameZh: product.name_zh,
      coverImageUrl: product.cover_image_url,
      category: product.category,
      slug: product.slug,
      variant: {
        priceCents: variant.price_cents,
        compareAtPriceCents: variant.compare_at_price_cents,
        stock: variant.stock,
        isEnabled: variant.is_enabled,
        optionValuesJson: variant.option_values_json as Record<string, string>,
      },
      available,
      errorCode: !available ? 'out_of_stock' : undefined,
    });
  }

  return results;
}
