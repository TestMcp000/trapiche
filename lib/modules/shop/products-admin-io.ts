/**
 * Shop Products Admin IO Facade
 *
 * Re-exports from semantic submodules for backward compatibility.
 * This file maintains the original import paths while delegating
 * to focused submodules.
 *
 * @module lib/modules/shop/products-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

// Re-export types and transforms from pure module
export type { ProductDbPayload, VariantDbPayload } from '@/lib/modules/shop/products-transform';
export {
  transformProductToSummary,
  transformProductToDetail,
} from '@/lib/modules/shop/products-transform';

// Re-export read operations
export {
  getAllProducts,
  getProductById,
  checkProductSlugExists,
} from '@/lib/modules/shop/products-read-admin-io';

// Re-export write operations
export {
  createProductAdmin,
  updateProductAdmin,
  deleteProductAdmin,
} from '@/lib/modules/shop/products-write-admin-io';
