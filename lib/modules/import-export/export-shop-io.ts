/**
 * Shop Export IO Module (Server-only)
 *
 * Orchestrates shop data export operations.
 * Exports products, coupons, orders, and members as JSON or CSV.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.5, §2.6, §2.7, §2.8
 * @see uiux_refactor.md §6.1.3 Phase 2, §4 item 2
 */
import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { formatProductsToJsonString, type ProductWithVariants } from './formatters/products-json';
import { formatCouponsToJsonString } from './formatters/coupons-json';
import { formatOrdersToJsonString, type OrderWithItems } from './formatters/orders-json';
import { formatMembersToJsonString } from './formatters/members-json';
import { formatProductsToCsv } from './formatters/csv/products-csv';
import { formatCouponsToCsv } from './formatters/csv/coupons-csv';
import { formatOrdersToCsv } from './formatters/csv/orders-csv';
import { formatMembersToCsv } from './formatters/csv/members-csv';
import type { CouponRow, CustomerProfileRow } from '@/lib/types/shop';

// =============================================================================
// Types
// =============================================================================

/** Supported export formats */
export type ShopExportFormat = 'json' | 'csv';

/** Result of a shop export operation */
export interface ShopExportResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  stats?: {
    count: number;
    bundleSizeBytes: number;
  };
}

/** Export options with format */
export interface ShopExportOptions {
  format?: ShopExportFormat;
  includeSensitive?: boolean;
}

/** Export options for sensitive data (legacy, kept for backward compatibility) */
export interface SensitiveExportOptions {
  includeSensitive?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Storage bucket for exports */
const EXPORTS_BUCKET = 'exports';

/** Signed URL expiration (24 hours in seconds) */
const SIGNED_URL_EXPIRY = 60 * 60 * 24;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Upload text content to Supabase Storage and return a signed URL.
 */
async function uploadTextToStorage(
  content: string,
  filename: string,
  contentType: string
): Promise<{ url: string; sizeBytes: number } | { error: string }> {
  const supabase = await createClient();
  const buffer = Buffer.from(content, 'utf-8');

  const { error: uploadError } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .upload(filename, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .createSignedUrl(filename, SIGNED_URL_EXPIRY);

  if (signedError || !signedData?.signedUrl) {
    return { error: `Failed to create download URL: ${signedError?.message ?? 'Unknown error'}` };
  }

  return { url: signedData.signedUrl, sizeBytes: buffer.length };
}

/** Generate timestamped filename */
function generateFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${timestamp}.${extension}`;
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Export all products with variants as a downloadable file.
 */
export async function exportProductsBundle(
  options: ShopExportOptions = {}
): Promise<ShopExportResult> {
  const format = options.format ?? 'json';

  try {
    const supabase = await createClient();

    // Fetch products with variants
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*, variants:product_variants(*)');

    if (productsError) {
      return { success: false, error: productsError.message };
    }

    const typedProducts = products as ProductWithVariants[];

    // Format based on requested format
    const content = format === 'csv'
      ? formatProductsToCsv(typedProducts)
      : formatProductsToJsonString(typedProducts);

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = generateFilename('products', format);

    const uploadResult = await uploadTextToStorage(content, filename, contentType);

    if ('error' in uploadResult) {
      return { success: false, error: uploadResult.error };
    }

    return {
      success: true,
      downloadUrl: uploadResult.url,
      stats: {
        count: products?.length ?? 0,
        bundleSizeBytes: uploadResult.sizeBytes,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Export failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Export all coupons as a downloadable file.
 */
export async function exportCouponsBundle(
  options: ShopExportOptions = {}
): Promise<ShopExportResult> {
  const format = options.format ?? 'json';

  try {
    const supabase = await createClient();

    const { data: coupons, error: couponsError } = await supabase
      .from('coupons')
      .select('*');

    if (couponsError) {
      return { success: false, error: couponsError.message };
    }

    const typedCoupons = coupons as CouponRow[];

    const content = format === 'csv'
      ? formatCouponsToCsv(typedCoupons)
      : formatCouponsToJsonString(typedCoupons);

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = generateFilename('coupons', format);

    const uploadResult = await uploadTextToStorage(content, filename, contentType);

    if ('error' in uploadResult) {
      return { success: false, error: uploadResult.error };
    }

    return {
      success: true,
      downloadUrl: uploadResult.url,
      stats: {
        count: coupons?.length ?? 0,
        bundleSizeBytes: uploadResult.sizeBytes,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Export failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Export all orders as a downloadable file (export-only).
 */
export async function exportOrdersBundle(
  options: ShopExportOptions = {}
): Promise<ShopExportResult> {
  const format = options.format ?? 'json';

  try {
    const supabase = await createClient();

    // Fetch orders with items
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*, items:order_items(*)');

    if (ordersError) {
      return { success: false, error: ordersError.message };
    }

    // Build product slug map
    const { data: products } = await supabase
      .from('products')
      .select('id, slug');

    const productSlugMap = new Map(
      (products ?? []).map((p) => [p.id, p.slug])
    );

    const typedOrders = orders as OrderWithItems[];

    const content = format === 'csv'
      ? formatOrdersToCsv(typedOrders, productSlugMap, { includeSensitive: options.includeSensitive })
      : formatOrdersToJsonString(typedOrders, productSlugMap, { includeSensitive: options.includeSensitive });

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = generateFilename('orders', format);

    const uploadResult = await uploadTextToStorage(content, filename, contentType);

    if ('error' in uploadResult) {
      return { success: false, error: uploadResult.error };
    }

    return {
      success: true,
      downloadUrl: uploadResult.url,
      stats: {
        count: orders?.length ?? 0,
        bundleSizeBytes: uploadResult.sizeBytes,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Export failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Export all members as a downloadable file (export-only).
 */
export async function exportMembersBundle(
  options: ShopExportOptions = {}
): Promise<ShopExportResult> {
  const format = options.format ?? 'json';

  try {
    const supabase = await createClient();

    const { data: members, error: membersError } = await supabase
      .from('customer_profiles')
      .select('*');

    if (membersError) {
      return { success: false, error: membersError.message };
    }

    const typedMembers = members as CustomerProfileRow[];

    const content = format === 'csv'
      ? formatMembersToCsv(typedMembers, { includeSensitive: options.includeSensitive })
      : formatMembersToJsonString(typedMembers, { includeSensitive: options.includeSensitive });

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = generateFilename('members', format);

    const uploadResult = await uploadTextToStorage(content, filename, contentType);

    if ('error' in uploadResult) {
      return { success: false, error: uploadResult.error };
    }

    return {
      success: true,
      downloadUrl: uploadResult.url,
      stats: {
        count: members?.length ?? 0,
        bundleSizeBytes: uploadResult.sizeBytes,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Export failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
