/**
 * Shop Admin IO Layer (Facade)
 *
 * Thin re-export module that provides backward compatibility.
 * All implementations are in capability-focused submodules.
 *
 * @module lib/modules/shop/admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 *
 * Submodules:
 * - products-admin-io.ts: Product CRUD operations
 * - orders-admin-io.ts: Order management
 * - customers-admin-io.ts: Customer/member management
 * - coupons-admin-io.ts: Coupon management
 * - shop-settings-admin-io.ts: Shop settings
 * - payment-config-admin-io.ts: Payment provider config (vault access)
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
  getAllProducts,
  getProductById,
  // Write operations
  checkProductSlugExists,
  createProductAdmin,
  updateProductAdmin,
  deleteProductAdmin,
  // Types
  type ProductDbPayload,
  type VariantDbPayload,
} from './products-admin-io';

// =============================================================================
// Orders
// =============================================================================

export {
  // Transform helpers
  transformOrderToSummary,
  transformOrderToDetail,
  // Read operations
  getAllOrders,
  getOrderById,
  // Write operations
  getOrderStatusAdmin,
  updateShippingAdmin,
  cancelOrderAdmin,
  markRefundAdmin,
  markOrderCompleteAdmin,
  writeAuditLogAdmin,
  // Types
  type OrderListParams,
} from './orders-admin-io';

// =============================================================================
// Customers
// =============================================================================

export {
  // Transform helpers
  transformProfileToSummary,
  transformProfileToDetail,
  // Read operations
  getCustomerList,
  getCustomerById,
} from './customers-admin-io';

// =============================================================================
// Coupons
// =============================================================================

export {
  // Read operations
  getAllCoupons,
  // Write operations
  checkCouponCodeExists,
  createCouponAdmin,
  updateCouponAdmin,
  toggleCouponActiveAdmin,
  // Types
  type CouponDbPayload,
} from './coupons-admin-io';

// =============================================================================
// Shop Settings
// =============================================================================

export {
  // Read operations
  getShopSettingsAdmin,
  // Write operations
  updateShopSettingsAdmin,
  // Types
  type ShopSettingsDbPayload,
} from './shop-settings-admin-io';

// =============================================================================
// Payment Provider Config
// =============================================================================

export {
  // Read operations
  getPaymentProviderConfigAdmin,
  getAllPaymentProviderConfigsAdmin,
  // Write operations
  upsertPaymentProviderConfigAdmin,
  storePaymentSecretAdmin,
  updatePaymentSecretAdmin,
  // Types
  type PaymentProviderConfigRow,
  type PaymentProviderConfigDbPayload,
} from './payment-config-admin-io';
