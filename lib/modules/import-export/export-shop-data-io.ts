/**
 * Shop Export Data IO Module (Server-only)
 *
 * Handles data fetching for shop exports with job tracking.
 * Provides pure data-fetching functions that can be called by server actions.
 *
 * @see uiux_refactor.md §4 item 3 - Job History / Audit Trail / Re-download
 * @see ARCHITECTURE.md §3.13 - Data Intelligence Platform (Module A)
 */
import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { ProductWithVariants } from './formatters/products-json';
import type { OrderWithItems } from './formatters/orders-json';
import type { CouponRow, CustomerProfileRow } from '@/lib/types/shop';

// =============================================================================
// Products Data Fetching
// =============================================================================

/**
 * Fetch all products with variants for export.
 */
export async function fetchProductsForExport(): Promise<ProductWithVariants[]> {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from('products')
    .select('*, variants:product_variants(*)');

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return (products ?? []) as ProductWithVariants[];
}

// =============================================================================
// Coupons Data Fetching
// =============================================================================

/**
 * Fetch all coupons for export.
 */
export async function fetchCouponsForExport(): Promise<CouponRow[]> {
  const supabase = await createClient();

  const { data: coupons, error } = await supabase
    .from('coupons')
    .select('*');

  if (error) {
    throw new Error(`Failed to fetch coupons: ${error.message}`);
  }

  return (coupons ?? []) as CouponRow[];
}

// =============================================================================
// Orders Data Fetching
// =============================================================================

/** Orders export data with product slug mapping */
export interface OrdersExportData {
  orders: OrderWithItems[];
  productSlugMap: Map<string, string>;
}

/**
 * Fetch all orders with items and product slug mapping for export.
 */
export async function fetchOrdersForExport(): Promise<OrdersExportData> {
  const supabase = await createClient();

  // Fetch orders with items
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*, items:order_items(*)');

  if (ordersError) {
    throw new Error(`Failed to fetch orders: ${ordersError.message}`);
  }

  // Build product slug map
  const { data: products } = await supabase
    .from('products')
    .select('id, slug');

  const productSlugMap = new Map(
    (products ?? []).map((p) => [p.id, p.slug])
  );

  return {
    orders: (orders ?? []) as OrderWithItems[],
    productSlugMap,
  };
}

// =============================================================================
// Members Data Fetching
// =============================================================================

/**
 * Fetch all members (customer profiles) for export.
 */
export async function fetchMembersForExport(): Promise<CustomerProfileRow[]> {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from('customer_profiles')
    .select('*');

  if (error) {
    throw new Error(`Failed to fetch members: ${error.message}`);
  }

  return (members ?? []) as CustomerProfileRow[];
}
