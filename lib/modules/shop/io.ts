/**
 * Shop IO Layer (Facade)
 *
 * Thin re-export module that provides backward compatibility.
 * All implementations are in capability-focused submodules.
 *
 * @module lib/modules/shop/io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 *
 * Submodules:
 * - products-io.ts: Public product reads
 * - cart-io.ts: Cart item data
 * - settings-io.ts: Public shop settings
 * - coupons-io.ts: Coupon validation
 */

import 'server-only';

// =============================================================================
// Products
// =============================================================================

export {
  // Transform helpers
  transformProductToSummary,
  transformProductToDetail,
  // Read operations
  getVisibleProducts,
  getVisibleProductByCategoryAndSlug,
  getVisibleProductCategories,
  getVisibleProductsForSitemap,
} from './products-io';

// =============================================================================
// Shop Settings
// =============================================================================

export {
  getShopSettings,
} from './settings-io';

// =============================================================================
// Cart
// =============================================================================

export {
  getCartItemsData,
} from './cart-io';

// =============================================================================
// Coupons
// =============================================================================

export {
  getCouponByCode,
} from './coupons-io';
