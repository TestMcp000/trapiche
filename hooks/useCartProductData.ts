'use client';

/**
 * useCartProductData Hook
 *
 * 購物車商品資料抓取 hook（唯一 API 呼叫點）
 *
 * 遵循 ARCHITECTURE.md §3.8：
 * - 作為 Cart/Checkout 商品資料的唯一 API 呼叫點
 * - 使用 lookupKey 策略建 Map
 * - 不直接 import lib/shop.ts（避免 Supabase client 進 bundle）
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  CartStorageItem,
  CartItemResponse,
  CartItemsResponseBody,
} from '@/lib/types/shop';

export interface UseCartProductDataReturn {
  /** 商品資料 Map（以 lookupKey 為 key） */
  productData: Map<string, CartItemResponse>;
  /** 正在載入中 */
  isLoading: boolean;
  /** 錯誤訊息 */
  error: string | null;
  /** 手動重新抓取 */
  refetch: () => Promise<void>;
}

/**
 * 購物車商品資料抓取 Hook
 *
 * 自動根據 cartItems 變化抓取商品資料，
 * 使用 lookupKey 建立 Map 供 UI 快速查找。
 *
 * @param cartItems - 購物車項目（來自 useCart hook）
 * @param isHydrated - 是否已完成 hydration（避免 SSR mismatch）
 */
export function useCartProductData(
  cartItems: CartStorageItem[],
  isHydrated: boolean = true
): UseCartProductDataReturn {
  const [productData, setProductData] = useState<Map<string, CartItemResponse>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track if we've already fetched for current items
  const lastFetchedRef = useRef<string>('');

  /**
   * 抓取商品資料
   */
  const fetchProductData = useCallback(async () => {
    if (cartItems.length === 0) {
      setProductData(new Map());
      setError(null);
      return;
    }

    // Create a signature to avoid duplicate fetches
    const itemsSignature = JSON.stringify(
      cartItems.map((item) => `${item.productId}:${item.variantKey}`)
    );

    // Skip if already fetched for these items
    if (itemsSignature === lastFetchedRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.productId,
            variantKey: item.variantKey,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch product data');
      }

      const data: CartItemsResponseBody = await response.json();
      const newMap = new Map<string, CartItemResponse>();

      // Use lookupKey from API response (matches our request key)
      data.items.forEach((item) => {
        newMap.set(item.lookupKey, item);
      });

      setProductData(newMap);
      lastFetchedRef.current = itemsSignature;
    } catch (err) {
      console.error('Failed to fetch product data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch product data');
    } finally {
      setIsLoading(false);
    }
  }, [cartItems]);

  // Auto-fetch when cart items change (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      fetchProductData();
    }
  }, [isHydrated, fetchProductData]);

  // Manual refetch function (resets signature to force re-fetch)
  const refetch = useCallback(async () => {
    lastFetchedRef.current = ''; // Reset to force re-fetch
    await fetchProductData();
  }, [fetchProductData]);

  return {
    productData,
    isLoading,
    error,
    refetch,
  };
}
