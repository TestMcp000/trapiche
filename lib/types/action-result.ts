/**
 * Unified Action Result Types for Server Actions
 *
 * Provides type-safe, i18n-friendly, and security-conscious error handling:
 * - Machine-readable error codes (not free-form strings)
 * - UI maps codes to locale-specific labels
 * - No internal error details exposed to clients
 *
 * @see ARCHITECTURE.md §3.6 - API types must be in lib/types
 * @see uiux_refactor.md §6.1 - Unified Result type + error codes
 */

import { API_ERROR_CODES } from './api-error';

// Re-export base error codes for convenience
export { API_ERROR_CODES };

/**
 * Admin-specific error codes
 * Extends API_ERROR_CODES with admin-only scenarios
 */
export const ADMIN_ERROR_CODES = {
  // Include all base API error codes
  ...API_ERROR_CODES,

  // Auth/Permission
  OWNER_REQUIRED: 'owner_required',

  // CRUD operations
  CREATE_FAILED: 'create_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',

  // Domain-specific
  SLUG_DUPLICATE: 'slug_duplicate',
  CATEGORY_HAS_POSTS: 'category_has_posts',
  RESOURCE_IN_USE: 'resource_in_use',
} as const;

export type ActionErrorCode = typeof ADMIN_ERROR_CODES[keyof typeof ADMIN_ERROR_CODES];

/**
 * Discriminated union for action results
 *
 * Success case: { success: true, data?: T }
 * Error case: { success: false, errorCode: ActionErrorCode }
 *
 * @example
 * // Success with data
 * return { success: true, data: createdCategory };
 *
 * // Success without data (void operations)
 * return { success: true };
 *
 * // Error
 * return { success: false, errorCode: ADMIN_ERROR_CODES.UNAUTHORIZED };
 */
export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; errorCode: ActionErrorCode };

/**
 * Helper to create success result
 */
export function actionSuccess<T>(data?: T): ActionResult<T> {
  return data !== undefined ? { success: true, data } : { success: true };
}

/**
 * Helper to create error result
 */
export function actionError(errorCode: ActionErrorCode): ActionResult<never> {
  return { success: false, errorCode };
}

/**
 * Bilingual error labels for UI display
 * Used by client components to map error codes to locale-specific messages
 */
export const ERROR_LABELS: Record<ActionErrorCode, { en: string; zh: string }> = {
  // Base API errors
  [API_ERROR_CODES.UNAUTHORIZED]: {
    en: 'Please log in to continue',
    zh: '請先登入',
  },
  [API_ERROR_CODES.FORBIDDEN]: {
    en: 'Permission denied',
    zh: '權限不足',
  },
  [API_ERROR_CODES.NOT_FOUND]: {
    en: 'Resource not found',
    zh: '找不到資源',
  },
  [API_ERROR_CODES.VALIDATION_ERROR]: {
    en: 'Invalid input',
    zh: '輸入格式錯誤',
  },
  [API_ERROR_CODES.RATE_LIMITED]: {
    en: 'Too many requests, please try again later',
    zh: '請求過於頻繁，請稍後再試',
  },
  [API_ERROR_CODES.INTERNAL_ERROR]: {
    en: 'An unexpected error occurred',
    zh: '發生錯誤，請稍後再試',
  },
  [API_ERROR_CODES.FEATURE_DISABLED]: {
    en: 'This feature is currently disabled',
    zh: '此功能目前已停用',
  },
  [API_ERROR_CODES.PRODUCT_NOT_FOUND]: {
    en: 'Product not found',
    zh: '找不到商品',
  },
  [API_ERROR_CODES.VARIANT_NOT_FOUND]: {
    en: 'Product variant not found',
    zh: '找不到商品規格',
  },
  [API_ERROR_CODES.OUT_OF_STOCK]: {
    en: 'Item is out of stock',
    zh: '商品缺貨中',
  },
  [API_ERROR_CODES.NOT_VISIBLE]: {
    en: 'Item is not available',
    zh: '商品不可購買',
  },
  [API_ERROR_CODES.INVALID_ITEMS]: {
    en: 'Invalid items in cart',
    zh: '購物車中有無效商品',
  },
  [API_ERROR_CODES.COMMENT_NOT_FOUND]: {
    en: 'Comment not found',
    zh: '找不到留言',
  },
  [API_ERROR_CODES.COMMENT_SPAM]: {
    en: 'Comment detected as spam',
    zh: '留言被判定為垃圾訊息',
  },
  [API_ERROR_CODES.REPORT_THROTTLED]: {
    en: 'Please wait before submitting another report',
    zh: '請稍後再提交舉報',
  },
  [API_ERROR_CODES.INVALID_REPORT_TYPE]: {
    en: 'Invalid report type',
    zh: '無效的舉報類型',
  },

  // Admin-specific errors
  owner_required: {
    en: 'Owner permission required',
    zh: '需要擁有者權限',
  },
  create_failed: {
    en: 'Failed to create',
    zh: '建立失敗',
  },
  update_failed: {
    en: 'Failed to update',
    zh: '更新失敗',
  },
  delete_failed: {
    en: 'Failed to delete',
    zh: '刪除失敗',
  },
  slug_duplicate: {
    en: 'This slug is already in use',
    zh: '此網址代稱已被使用',
  },
  category_has_posts: {
    en: 'Category contains posts, cannot delete',
    zh: '分類下有文章，無法刪除',
  },
  resource_in_use: {
    en: 'Resource is in use',
    zh: '資源使用中',
  },
};

/**
 * Get localized error message for an error code
 *
 * @param errorCode - The error code from action result
 * @param locale - Current locale ('en' | 'zh')
 * @returns Localized error message, falls back to English if not found
 */
export function getErrorLabel(errorCode: ActionErrorCode, locale: string): string {
  const labels = ERROR_LABELS[errorCode];
  if (!labels) {
    return locale === 'zh' ? '發生錯誤' : 'An error occurred';
  }
  return locale === 'zh' ? labels.zh : labels.en;
}
