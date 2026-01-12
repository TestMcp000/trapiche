'use client';

/**
 * Cart Content Component
 *
 * Client component for displaying and managing shopping cart items.
 *
 * 遵循 ARCHITECTURE.md §3.8：
 * - Client component（需要 localStorage + 互動）
 * - 商品資料透過 useCartProductData hook 取得（唯一 API 呼叫點）
 * - 金額計算委託給 lib/modules/shop/pricing.ts
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/hooks/useCart';
import { useCartProductData } from '@/hooks/useCartProductData';
import { formatPrice, calculateCart } from '@/lib/modules/shop/pricing';
import { computeLookupKey } from '@/lib/validators/cart';
import type { CartItem } from '@/lib/types/shop';

interface CartContentProps {
  locale: string;
}

export function CartContent({ locale }: CartContentProps) {
  const {
    items: cartItems,
    couponCode,
    isEmpty,
    isHydrated,
    updateQuantity,
    removeItem,
    setCouponCode,
  } = useCart();

  // Use centralized hook for product data fetching
  const { productData, isLoading } = useCartProductData(cartItems, isHydrated);

  // Initialize coupon input - using lazy initializer to avoid hydration mismatch
  // Note: couponCode comes from cart hook which handles hydration
  const [couponInput, setCouponInput] = useState('');

  // Build CartItem array for pricing calculation
  const pricingItems: CartItem[] = useMemo(() => {
    return cartItems
      .map((item) => {
        const key = computeLookupKey(item.productId, item.variantKey);
        const data = productData.get(key);
        if (!data?.variant) return null;
        return {
          variantKey: key,
          quantity: item.quantity,
          unitPriceCents: data.variant.priceCents,
        };
      })
      .filter((item): item is CartItem => item !== null);
  }, [cartItems, productData]);

  // Calculate cart totals
  const calculation = useMemo(() => {
    return calculateCart(pricingItems, null); // TODO: Add coupon support
  }, [pricingItems]);

  // Handler for quantity changes
  const handleQuantityChange = (
    productId: string,
    variantKey: string | null,
    newQuantity: number
  ) => {
    if (newQuantity <= 0) {
      removeItem(productId, variantKey);
    } else {
      updateQuantity(productId, variantKey, newQuantity);
    }
  };

  // Handler for applying coupon
  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (code) {
      setCouponCode(code);
    }
  };

  // Handler for removing coupon
  const handleRemoveCoupon = () => {
    setCouponCode(undefined);
    setCouponInput('');
  };

  // Localized strings
  const t = {
    title: locale === 'zh' ? '購物車' : 'Shopping Cart',
    emptyCart: locale === 'zh' ? '您的購物車是空的' : 'Your cart is empty',
    startShopping: locale === 'zh' ? '開始購物' : 'Start Shopping',
    checkout: locale === 'zh' ? '前往結帳' : 'Proceed to Checkout',
    subtotal: locale === 'zh' ? '小計' : 'Subtotal',
    discount: locale === 'zh' ? '折扣' : 'Discount',
    total: locale === 'zh' ? '總計' : 'Total',
    quantity: locale === 'zh' ? '數量' : 'Quantity',
    remove: locale === 'zh' ? '移除' : 'Remove',
    outOfStock: locale === 'zh' ? '已售完' : 'Out of Stock',
    unavailable: locale === 'zh' ? '無法購買' : 'Unavailable',
    couponCode: locale === 'zh' ? '優惠碼' : 'Coupon Code',
    apply: locale === 'zh' ? '套用' : 'Apply',
    loading: locale === 'zh' ? '載入中...' : 'Loading...',
  };

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <div className="text-center py-16">
        <div className="animate-pulse">
          <div className="w-24 h-24 mx-auto bg-surface rounded-lg mb-4" />
          <div className="h-4 w-32 mx-auto bg-surface rounded" />
        </div>
      </div>
    );
  }

  // Show empty cart state
  if (isEmpty) {
    return (
      <div className="text-center py-16 bg-surface rounded-lg">
        <svg
          className="mx-auto w-24 h-24 text-secondary opacity-50 mb-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p className="text-lg text-secondary mb-6">{t.emptyCart}</p>
        <Link
          href={`/${locale}/shop`}
          className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t.startShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        {isLoading && cartItems.length > 0 && (
          <div className="text-center py-4 text-secondary">{t.loading}</div>
        )}

        {cartItems.map((item) => {
          const key = computeLookupKey(item.productId, item.variantKey);
          const data = productData.get(key);
          const name = locale === 'zh' ? data?.nameZh : data?.nameEn;
          const displayName = name || data?.nameEn || data?.nameZh || 'Unknown Product';
          const isAvailable = data?.available ?? false;
          const price = data?.variant?.priceCents ?? 0;
          const comparePrice = data?.variant?.compareAtPriceCents;
          const stock = data?.variant?.stock ?? 0;

          // Build product link
          const productLink =
            data?.category && data?.slug
              ? `/${locale}/shop/${data.category}/${data.slug}`
              : '#';

          return (
            <div
              key={key}
              className={`flex gap-4 p-4 bg-surface rounded-lg ${
                !isAvailable ? 'opacity-60' : ''
              }`}
            >
              {/* Product Image */}
              <Link href={productLink} className="flex-shrink-0">
                <div className="relative w-24 h-24 bg-background rounded-lg overflow-hidden">
                  {data?.coverImageUrl ? (
                    <Image
                      src={data.coverImageUrl}
                      alt={displayName}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary">
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </Link>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <Link href={productLink}>
                  <h3 className="font-medium text-foreground hover:text-primary truncate">
                    {displayName}
                  </h3>
                </Link>

                {/* Variant options */}
                {data?.variant?.optionValuesJson &&
                  Object.keys(data.variant.optionValuesJson).length > 0 && (
                    <p className="text-sm text-secondary mt-1">
                      {Object.entries(data.variant.optionValuesJson)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')}
                    </p>
                  )}

                {/* Price */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-semibold text-foreground">
                    {formatPrice(price)}
                  </span>
                  {comparePrice && comparePrice > price && (
                    <span className="text-sm text-secondary line-through">
                      {formatPrice(comparePrice)}
                    </span>
                  )}
                </div>

                {/* Stock status */}
                {!isAvailable && (
                  <p className="text-sm text-red-500 mt-1">
                    {data?.errorCode === 'out_of_stock'
                      ? t.outOfStock
                      : t.unavailable}
                  </p>
                )}
              </div>

              {/* Quantity Controls */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleQuantityChange(
                        item.productId,
                        item.variantKey,
                        item.quantity - 1
                      )
                    }
                    className="w-8 h-8 flex items-center justify-center bg-background rounded-lg hover:bg-secondary/10 transition-colors"
                    disabled={!isAvailable}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="w-8 text-center font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      handleQuantityChange(
                        item.productId,
                        item.variantKey,
                        item.quantity + 1
                      )
                    }
                    className="w-8 h-8 flex items-center justify-center bg-background rounded-lg hover:bg-secondary/10 transition-colors"
                    disabled={!isAvailable || item.quantity >= stock}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.productId, item.variantKey)}
                  className="text-sm text-red-500 hover:text-red-600 transition-colors"
                >
                  {t.remove}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 bg-surface rounded-lg p-6 space-y-4">
          {/* Coupon Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t.couponCode}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="CODE"
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {couponCode ? (
                <button
                  onClick={handleRemoveCoupon}
                  className="px-4 py-2 text-red-500 hover:text-red-600 transition-colors"
                >
                  ×
                </button>
              ) : (
                <button
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {t.apply}
                </button>
              )}
            </div>
          </div>

          <hr className="border-border" />

          {/* Price Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-foreground">
              <span>{t.subtotal}</span>
              <span>{formatPrice(calculation.subtotalCents)}</span>
            </div>
            {calculation.discountCents > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t.discount}</span>
                <span>-{formatPrice(calculation.discountCents)}</span>
              </div>
            )}
            <hr className="border-border" />
            <div className="flex justify-between text-lg font-bold text-foreground">
              <span>{t.total}</span>
              <span>{formatPrice(calculation.totalCents)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <Link
            href={`/${locale}/shop/checkout`}
            className="block w-full py-3 text-center bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t.checkout}
          </Link>
        </div>
      </div>
    </div>
  );
}
