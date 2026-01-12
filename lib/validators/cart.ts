/**
 * Cart API Validators (Pure Functions)
 * 
 * 驗證 Cart Items API 的 request。
 * 遵循 ARCHITECTURE.md：純函式，無 side effects。
 */

import { isValidUUID, type ValidationResult, validResult, invalidResult } from './api-common';
import type { CartItemRequest, CartItemsRequestBody } from '@/lib/types/shop';

// =============================================================================
// Cart Items Request Validation
// =============================================================================

/**
 * Variant key 格式驗證（允許 null 或字串）
 */
function isValidVariantKey(variantKey: unknown): boolean {
  return variantKey === null || typeof variantKey === 'string';
}

/**
 * 驗證單一購物車項目
 */
export function validateCartItemRequest(item: unknown): ValidationResult<CartItemRequest> {
  if (!item || typeof item !== 'object') {
    return invalidResult('Each item must be an object');
  }

  const { productId, variantKey } = item as Record<string, unknown>;

  if (!isValidUUID(productId)) {
    return invalidResult('productId must be a valid UUID');
  }

  if (!isValidVariantKey(variantKey)) {
    return invalidResult('variantKey must be a string or null');
  }

  return validResult({
    productId: productId as string,
    variantKey: (variantKey as string | null) ?? null,
  });
}

/**
 * 驗證購物車項目請求體
 */
export function validateCartItemsRequest(body: unknown): ValidationResult<CartItemsRequestBody> {
  if (!body || typeof body !== 'object') {
    return invalidResult('Request body must be an object');
  }

  const { items } = body as Record<string, unknown>;

  if (!Array.isArray(items)) {
    return invalidResult('items must be an array');
  }

  if (items.length === 0) {
    // 空陣列是允許的，返回空結果
    return validResult({ items: [] });
  }

  if (items.length > 100) {
    return invalidResult('items array must not exceed 100 items');
  }

  const validatedItems: CartItemRequest[] = [];
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = validateCartItemRequest(items[i]);
    if (result.valid && result.data) {
      validatedItems.push(result.data);
    } else {
      errors.push(`Item ${i}: ${result.error}`);
    }
  }

  if (errors.length > 0) {
    return invalidResult(errors.join('; '));
  }

  return validResult({ items: validatedItems });
}

// =============================================================================
// Lookup Key Utilities
// =============================================================================

/**
 * 計算 lookupKey（用於 Map 查找）
 * 
 * @param productId - 商品 ID
 * @param variantKey - 變體 key（可為 null）
 * @returns lookupKey 格式：`${productId}::${variantKey}` 或 `${productId}`
 */
export function computeLookupKey(productId: string, variantKey: string | null): string {
  return variantKey ? `${productId}::${variantKey}` : productId;
}
