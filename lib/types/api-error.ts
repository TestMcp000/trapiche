/**
 * API Error Response Types
 *
 * 統一的 API 錯誤回傳格式，作為所有 API endpoints 的 Single Source of Truth。
 * 
 * 遵循 ARCHITECTURE.md §3.6：
 * - 所有 API request/response types 必須定義在 lib/types/*
 * - API routes 不得 export interface 給 client 用
 */

/**
 * 標準 API 錯誤回應
 * 
 * @property error - 使用者可讀的錯誤訊息（必填）
 * @property code - 錯誤代碼，供 UI 分支判斷（可選）
 * @property message - Debug 用的詳細訊息（可選，不應暴露敏感資訊）
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  message?: string;
}

/**
 * 標準 API 成功回應（含資料）
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * API 回應（成功或錯誤）
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 判斷是否為錯誤回應
 */
export function isApiError(response: ApiResponse): response is ApiErrorResponse {
  return 'error' in response;
}

/**
 * 常用錯誤代碼
 */
export const API_ERROR_CODES = {
  // 通用
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  VALIDATION_ERROR: 'validation_error',
  RATE_LIMITED: 'rate_limited',
  INTERNAL_ERROR: 'internal_error',
  
  // Feature gate
  FEATURE_DISABLED: 'feature_disabled',
  
  // Cart/Shop
  PRODUCT_NOT_FOUND: 'product_not_found',
  VARIANT_NOT_FOUND: 'variant_not_found',
  OUT_OF_STOCK: 'out_of_stock',
  NOT_VISIBLE: 'not_visible',
  INVALID_ITEMS: 'invalid_items',
  
  // Comments
  COMMENT_NOT_FOUND: 'comment_not_found',
  COMMENT_SPAM: 'comment_spam',
  
  // Reports
  REPORT_THROTTLED: 'report_throttled',
  INVALID_REPORT_TYPE: 'invalid_report_type',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];
