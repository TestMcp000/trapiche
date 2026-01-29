/**
 * Gallery API Validators (Pure Functions)
 * 
 * 驗證 Gallery Items API 的查詢參數。
 * 遵循 ARCHITECTURE.md：純函式，無 side effects。
 */

import { validatePagination, type ValidationResult, validResult, invalidResult } from './api-common';
import type { GalleryListSort, GalleryListParams } from '@/lib/types/gallery';

// =============================================================================
// Constants
// =============================================================================

/** Gallery API 固定頁面大小 */
export const GALLERY_PAGE_SIZE = 24;

/** 允許的排序選項 */
export const VALID_GALLERY_SORTS: readonly GalleryListSort[] = ['newest', 'popular', 'featured'];

// =============================================================================
// Gallery Items Query Validation
// =============================================================================

/**
 * 驗證 Gallery Items API 查詢參數
 */
export function validateGalleryItemsQuery(
  searchParams: URLSearchParams
): ValidationResult<GalleryListParams> {
  // Validate pagination (limit must be exactly 24)
  const paginationResult = validatePagination(
    searchParams.get('limit'),
    searchParams.get('offset'),
    { allowedLimit: GALLERY_PAGE_SIZE }
  );

  if (!paginationResult.valid) {
    return invalidResult(paginationResult.error!);
  }

  // Validate sort
  const sortParam = searchParams.get('sort');
  let sort: GalleryListSort = 'newest';
  if (sortParam) {
    if (!VALID_GALLERY_SORTS.includes(sortParam as GalleryListSort)) {
      return invalidResult(`sort 必須是以下其中之一：${VALID_GALLERY_SORTS.join(', ')}`);
    }
    sort = sortParam as GalleryListSort;
  }

  // Other optional params (category, q, tag) don't need strict validation
  const categorySlug = searchParams.get('category') || undefined;
  const q = searchParams.get('q') || undefined;
  const tag = searchParams.get('tag') || undefined;

  return validResult({
    limit: paginationResult.limit,
    offset: paginationResult.offset,
    categorySlug,
    q,
    tag,
    sort,
  });
}
