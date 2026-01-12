/**
 * Shop Products Public IO Facade
 *
 * Re-exports from semantic submodules for backward compatibility.
 *
 * @module lib/modules/shop/products-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

// Re-export transforms from shared module
export {
  transformProductToSummary,
  transformProductToDetail,
} from '@/lib/modules/shop/products-transform';

// Re-export public product operations
export {
  getVisibleProducts,
  getVisibleProductByCategoryAndSlug,
} from '@/lib/modules/shop/products-public-io';

// Re-export public category operations
export {
  getVisibleProductCategories,
  getVisibleProductsForSitemap,
} from '@/lib/modules/shop/categories-public-io';
