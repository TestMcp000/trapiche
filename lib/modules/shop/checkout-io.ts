/**
 * Checkout I/O Layer
 *
 * Server-side IO helpers for checkout-related database queries.
 * Uses anonymous Supabase client for public reads (no cookies, safe for caching).
 *
 * Follows ARCHITECTURE.md and uiux_refactor.md:
 * - IO boundaries: All DB queries centralized in lib shop checkout-io.ts
 * - Server action only orchestrates, does not query directly
 */
import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';

// =============================================================================
// Types for Checkout IO (minimal DTOs)
// =============================================================================

/**
 * Minimal product data for checkout validation
 * Only fields needed to validate and process an order
 */
export interface CheckoutProduct {
  id: string;
  slug: string;
  name_en: string | null;
  name_zh: string | null;
  is_visible: boolean;
}

/**
 * Minimal variant data for checkout validation and pricing
 * Only fields needed to calculate price and validate stock
 */
export interface CheckoutVariant {
  id: string;
  product_id: string;
  variant_key: string;
  price_cents: number;
  stock: number;
  is_enabled: boolean;
  option_values_json: Record<string, unknown>;
  sku: string | null;
}

// =============================================================================
// Checkout IO Functions
// =============================================================================

/**
 * Get products by IDs for checkout validation
 *
 * Returns minimal product data needed for checkout:
 * - id, slug: identification
 * - name_en, name_zh: display in order
 * - is_visible: validation (only visible products can be ordered)
 *
 * @param productIds - Array of product UUIDs
 * @returns Array of CheckoutProduct (may be empty if none found)
 */
export async function getCheckoutProductsByIds(
  productIds: string[]
): Promise<CheckoutProduct[]> {
  if (productIds.length === 0) {
    return [];
  }

  const { data, error } = await createAnonClient()
    .from('products')
    .select('id, slug, name_en, name_zh, is_visible')
    .in('id', productIds);

  if (error) {
    console.error('[checkout-io] Error fetching products:', error);
    return [];
  }

  return (data ?? []) as CheckoutProduct[];
}

/**
 * Get enabled variants by product IDs for checkout
 *
 * Returns minimal variant data needed for checkout:
 * - id, product_id, variant_key: identification
 * - price_cents: server-side price calculation (never trust client)
 * - stock: inventory validation
 * - is_enabled: validation (only enabled variants can be ordered)
 * - option_values_json: order line item details
 * - sku: order line item reference
 *
 * Only returns is_enabled=true variants (disabled ones cannot be ordered)
 *
 * @param productIds - Array of product UUIDs
 * @returns Array of CheckoutVariant (may be empty if none found)
 */
export async function getCheckoutEnabledVariantsByProductIds(
  productIds: string[]
): Promise<CheckoutVariant[]> {
  if (productIds.length === 0) {
    return [];
  }

  const { data, error } = await createAnonClient()
    .from('product_variants')
    .select('id, product_id, variant_key, price_cents, stock, is_enabled, option_values_json, sku')
    .in('product_id', productIds)
    .eq('is_enabled', true);

  if (error) {
    console.error('[checkout-io] Error fetching variants:', error);
    return [];
  }

  return (data ?? []) as CheckoutVariant[];
}
