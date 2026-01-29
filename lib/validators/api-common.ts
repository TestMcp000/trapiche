/**
 * Common API Validators (Pure Functions)
 * 
 * 通用 API 驗證函式，供所有 API routes 使用。
 * 遵循 ARCHITECTURE.md：純函式，無 side effects。
 */

// =============================================================================
// UUID Validation
// =============================================================================

/**
 * UUID v4 格式的正則表達式
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 檢查是否為有效的 UUID v4
 */
export function isValidUUID(id: unknown): boolean {
  return typeof id === 'string' && UUID_V4_REGEX.test(id);
}

// =============================================================================
// Pagination Validation
// =============================================================================

export interface PaginationOptions {
  /** 允許的 limit 值，或最大 limit */
  allowedLimit?: number | number[];
  /** 預設 limit */
  defaultLimit?: number;
  /** 最大 offset */
  maxOffset?: number;
}

export interface PaginationValidationResult {
  valid: boolean;
  limit?: number;
  offset?: number;
  error?: string;
}

/**
 * 驗證分頁參數
 */
export function validatePagination(
  limitStr: string | null,
  offsetStr: string | null,
  options: PaginationOptions = {}
): PaginationValidationResult {
  const { allowedLimit, defaultLimit = 24, maxOffset = 10000 } = options;

  // Parse limit
  const limit = limitStr ? parseInt(limitStr, 10) : defaultLimit;
  if (isNaN(limit) || limit < 1) {
    return { valid: false, error: 'limit 必須為正整數' };
  }

  // Check allowed limits
  if (allowedLimit !== undefined) {
    if (Array.isArray(allowedLimit)) {
      if (!allowedLimit.includes(limit)) {
        return { valid: false, error: `limit 必須是以下其中之一：${allowedLimit.join(', ')}` };
      }
    } else if (limit !== allowedLimit) {
      return { valid: false, error: `limit 必須是 ${allowedLimit}` };
    }
  }

  // Parse offset
  const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
  if (isNaN(offset) || offset < 0) {
    return { valid: false, error: 'offset 必須為非負整數' };
  }
  if (offset > maxOffset) {
    return { valid: false, error: `offset 不得超過 ${maxOffset}` };
  }

  return { valid: true, limit, offset };
}

// =============================================================================
// String Validation
// =============================================================================

/**
 * 檢查是否為非空字串
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 檢查字串長度是否在範圍內
 */
export function isStringInRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

// =============================================================================
// Validation Result Types
// =============================================================================

export interface ValidationResult<T = unknown> {
  valid: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

/**
 * 建立成功的驗證結果
 */
export function validResult<T>(data: T): ValidationResult<T> {
  return { valid: true, data };
}

/**
 * 建立失敗的驗證結果
 */
export function invalidResult<T = never>(error: string): ValidationResult<T> {
  return { valid: false, error };
}

/**
 * 建立含多個錯誤的驗證結果
 */
export function invalidResults<T = never>(errors: Record<string, string>): ValidationResult<T> {
  return { valid: false, errors };
}
