'use client';

/**
 * useCart Hook
 *
 * 購物車狀態管理 hook（localStorage 持久化）
 *
 * 遵循 refactor.md：
 * - Client-only（localStorage）
 * - 不直接 import lib/shop.ts（避免 Supabase client 進 bundle）
 * - 計算邏輯委託給 pricing.ts（透過 server 回傳的價格計算）
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CartState, CartStorageItem } from '@/lib/types/shop';

const CART_STORAGE_KEY = 'qnl-shop-cart';

/** 預設空購物車 */
const EMPTY_CART: CartState = {
  items: [],
  couponCode: undefined,
};

/**
 * 從 localStorage 讀取購物車
 */
function loadCart(): CartState {
  if (typeof window === 'undefined') {
    return EMPTY_CART;
  }

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) {
      return EMPTY_CART;
    }

    const parsed = JSON.parse(stored) as CartState;

    // 驗證資料結構
    if (!Array.isArray(parsed.items)) {
      return EMPTY_CART;
    }

    return {
      items: parsed.items.filter(
        (item): item is CartStorageItem =>
          typeof item.productId === 'string' &&
          typeof item.quantity === 'number' &&
          item.quantity > 0
      ),
      couponCode: typeof parsed.couponCode === 'string' ? parsed.couponCode : undefined,
    };
  } catch {
    return EMPTY_CART;
  }
}

/**
 * 儲存購物車到 localStorage
 */
function saveCart(cart: CartState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // 忽略 localStorage 錯誤（可能空間不足）
  }
}

export interface UseCartReturn {
  /** 購物車項目 */
  items: CartStorageItem[];
  /** 優惠券代碼 */
  couponCode: string | undefined;
  /** 購物車項目總數量 */
  totalQuantity: number;
  /** 購物車是否為空 */
  isEmpty: boolean;
  /** 是否已完成 hydration（避免 SSR mismatch） */
  isHydrated: boolean;
  /** 新增商品到購物車 */
  addItem: (productId: string, variantKey: string | null, quantity?: number) => void;
  /** 移除商品 */
  removeItem: (productId: string, variantKey: string | null) => void;
  /** 更新數量 */
  updateQuantity: (productId: string, variantKey: string | null, quantity: number) => void;
  /** 設定優惠券代碼 */
  setCouponCode: (code: string | undefined) => void;
  /** 清空購物車 */
  clearCart: () => void;
  /** 取得特定商品的數量 */
  getItemQuantity: (productId: string, variantKey: string | null) => number;
}

/**
 * 購物車 Hook
 *
 * 使用 localStorage 持久化購物車狀態。
 * 透過 isHydrated 避免 SSR/CSR hydration mismatch。
 */
export function useCart(): UseCartReturn {
  const [cart, setCart] = useState<CartState>(() => {
    // Lazy initialization: only runs once on mount
    if (typeof window !== 'undefined') {
      return loadCart();
    }
    return EMPTY_CART;
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark as hydrated on mount
  useEffect(() => {
    // This is the standard hydration pattern - safe to ignore
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHydrated(true);
  }, []);

  // 購物車變更時儲存到 localStorage
  useEffect(() => {
    if (isHydrated) {
      saveCart(cart);
    }
  }, [cart, isHydrated]);

  /**
   * 新增商品到購物車
   */
  const addItem = useCallback(
    (productId: string, variantKey: string | null, quantity: number = 1) => {
      if (quantity <= 0) return;

      setCart((prev) => {
        const existingIndex = prev.items.findIndex(
          (item) => item.productId === productId && item.variantKey === variantKey
        );

        if (existingIndex >= 0) {
          // 更新現有項目數量
          const newItems = [...prev.items];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: newItems[existingIndex].quantity + quantity,
          };
          return { ...prev, items: newItems };
        }

        // 新增項目
        return {
          ...prev,
          items: [...prev.items, { productId, variantKey, quantity }],
        };
      });
    },
    []
  );

  /**
   * 移除商品
   */
  const removeItem = useCallback((productId: string, variantKey: string | null) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter(
        (item) => !(item.productId === productId && item.variantKey === variantKey)
      ),
    }));
  }, []);

  /**
   * 更新數量
   */
  const updateQuantity = useCallback(
    (productId: string, variantKey: string | null, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId, variantKey);
        return;
      }

      setCart((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.productId === productId && item.variantKey === variantKey
            ? { ...item, quantity }
            : item
        ),
      }));
    },
    [removeItem]
  );

  /**
   * 設定優惠券代碼
   */
  const setCouponCode = useCallback((code: string | undefined) => {
    setCart((prev) => ({
      ...prev,
      couponCode: code?.trim() || undefined,
    }));
  }, []);

  /**
   * 清空購物車
   */
  const clearCart = useCallback(() => {
    setCart(EMPTY_CART);
  }, []);

  /**
   * 取得特定商品的數量
   */
  const getItemQuantity = useCallback(
    (productId: string, variantKey: string | null): number => {
      const item = cart.items.find(
        (i) => i.productId === productId && i.variantKey === variantKey
      );
      return item?.quantity ?? 0;
    },
    [cart.items]
  );

  // 計算衍生狀態
  const totalQuantity = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items]
  );

  const isEmpty = useMemo(() => cart.items.length === 0, [cart.items]);

  return {
    items: cart.items,
    couponCode: cart.couponCode,
    totalQuantity,
    isEmpty,
    isHydrated,
    addItem,
    removeItem,
    updateQuantity,
    setCouponCode,
    clearCart,
    getItemQuantity,
  };
}
