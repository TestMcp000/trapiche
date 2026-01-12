'use client';

/**
 * Checkout Form Component
 *
 * Client component for checkout form with recipient info and invoice fields.
 *
 * 遵循 ARCHITECTURE.md §3.8：
 * - Client component（需要表單互動）
 * - 商品資料透過 useCartProductData hook 取得（唯一 API 呼叫點）
 * - 發票欄位驗證使用 lib/modules/shop/invoice-schema.ts
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { useCartProductData } from '@/hooks/useCartProductData';
import {
  configToSchema,
  validateInvoiceInput,
  type FieldValidationError,
} from '@/lib/modules/shop/invoice-schema';
import { formatPrice } from '@/lib/modules/shop/pricing';
import { computeLookupKey } from '@/lib/validators/cart';
import type { InvoiceConfig, InvoiceFieldSchema } from '@/lib/types/shop';

interface CheckoutFormProps {
  locale: string;
  invoiceConfig: InvoiceConfig;
  reservedTtlMinutes: number;
}

interface RecipientData {
  name: string;
  phone: string;
  address: string;
  note: string;
}

interface FormErrors {
  recipient: Partial<Record<keyof RecipientData, string>>;
  invoice: FieldValidationError[];
}

export function CheckoutForm({
  locale,
  invoiceConfig,
  reservedTtlMinutes,
}: CheckoutFormProps) {
  const _router = useRouter();
  const { items: cartItems, couponCode: _couponCode, isEmpty, isHydrated, clearCart: _clearCart } = useCart();

  // Use centralized hook for product data fetching
  const { productData, isLoading: isLoadingProducts } = useCartProductData(cartItems, isHydrated);

  // Form state
  const [recipient, setRecipient] = useState<RecipientData>({
    name: '',
    phone: '',
    address: '',
    note: '',
  });
  const [invoiceData, setInvoiceData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<FormErrors>({ recipient: {}, invoice: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Generate invoice schema from config
  const invoiceSchema: InvoiceFieldSchema[] = useMemo(
    () => configToSchema(invoiceConfig),
    [invoiceConfig]
  );

  // Calculate totals
  const { subtotal, total, hasUnavailable } = useMemo(() => {
    let subtotal = 0;
    let hasUnavailable = false;

    cartItems.forEach((item) => {
      const key = computeLookupKey(item.productId, item.variantKey);
      const data = productData.get(key);
      if (data?.variant && data.available) {
        subtotal += data.variant.priceCents * item.quantity;
      }
      if (!data?.available) {
        hasUnavailable = true;
      }
    });

    return { subtotal, total: subtotal, hasUnavailable };
  }, [cartItems, productData]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = { recipient: {}, invoice: [] };
    let isValid = true;

    // Validate recipient fields
    if (!recipient.name.trim()) {
      newErrors.recipient.name = locale === 'zh' ? '請輸入收件人姓名' : 'Name is required';
      isValid = false;
    }

    if (!recipient.phone.trim()) {
      newErrors.recipient.phone = locale === 'zh' ? '請輸入聯絡電話' : 'Phone is required';
      isValid = false;
    } else if (!/^[\d\-+() ]{8,20}$/.test(recipient.phone)) {
      newErrors.recipient.phone = locale === 'zh' ? '電話格式不正確' : 'Invalid phone format';
      isValid = false;
    }

    if (!recipient.address.trim()) {
      newErrors.recipient.address = locale === 'zh' ? '請輸入收件地址' : 'Address is required';
      isValid = false;
    }

    // Validate invoice fields
    const invoiceErrors = validateInvoiceInput(invoiceSchema, invoiceData);
    if (invoiceErrors.length > 0) {
      newErrors.invoice = invoiceErrors;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (hasUnavailable) {
      setSubmitError(
        locale === 'zh'
          ? '購物車中有無法購買的商品，請先移除'
          : 'Some items in cart are unavailable. Please remove them first.'
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // TODO: Stripe account required
      // 這裡將呼叫 server action 來：
      // 1. 驗證購物車項目與價格
      // 2. 建立 Stripe Checkout Session
      // 3. 建立訂單與庫存保留
      // 4. 導向 Stripe Checkout 頁面

      // For now, just show a message
      setSubmitError(
        locale === 'zh'
          ? '⚠️ Stripe 帳號尚未設定，無法完成結帳。請聯繫網站管理員。'
          : '⚠️ Stripe account not configured. Please contact site administrator.'
      );
      setIsSubmitting(false);
    } catch (error) {
      console.error('Checkout error:', error);
      setSubmitError(
        locale === 'zh'
          ? '結帳時發生錯誤，請稍後再試'
          : 'An error occurred during checkout. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  // Localized strings
  const t = {
    orderSummary: locale === 'zh' ? '訂單摘要' : 'Order Summary',
    recipientInfo: locale === 'zh' ? '收件人資訊' : 'Recipient Information',
    invoiceInfo: locale === 'zh' ? '發票資訊' : 'Invoice Information',
    name: locale === 'zh' ? '姓名' : 'Name',
    phone: locale === 'zh' ? '電話' : 'Phone',
    address: locale === 'zh' ? '地址' : 'Address',
    note: locale === 'zh' ? '備註' : 'Note',
    notePlaceholder: locale === 'zh' ? '訂單備註（選填）' : 'Order notes (optional)',
    subtotal: locale === 'zh' ? '小計' : 'Subtotal',
    total: locale === 'zh' ? '總計' : 'Total',
    placeOrder: locale === 'zh' ? '確認付款' : 'Place Order',
    processing: locale === 'zh' ? '處理中...' : 'Processing...',
    emptyCart: locale === 'zh' ? '購物車是空的' : 'Your cart is empty',
    backToShop: locale === 'zh' ? '返回商城' : 'Back to Shop',
    ttlNote:
      locale === 'zh'
        ? `付款需在 ${reservedTtlMinutes} 分鐘內完成，逾時將自動取消訂單`
        : `Payment must be completed within ${reservedTtlMinutes} minutes`,
  };

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <div className="text-center py-16">
        <div className="animate-pulse">
          <div className="h-8 w-48 mx-auto bg-surface rounded mb-4" />
          <div className="h-4 w-32 mx-auto bg-surface rounded" />
        </div>
      </div>
    );
  }

  // Redirect to cart if empty
  if (isEmpty) {
    return (
      <div className="text-center py-16 bg-surface rounded-lg">
        <p className="text-lg text-secondary mb-6">{t.emptyCart}</p>
        <a
          href={`/${locale}/shop`}
          className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t.backToShop}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Fields */}
      <div className="lg:col-span-2 space-y-8">
        {/* Recipient Info */}
        <section className="bg-surface rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {t.recipientInfo}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t.name} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={recipient.name}
                onChange={(e) =>
                  setRecipient((prev) => ({ ...prev, name: e.target.value }))
                }
                className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.recipient.name ? 'border-red-500' : 'border-border'
                }`}
              />
              {errors.recipient.name && (
                <p className="text-sm text-red-500 mt-1">{errors.recipient.name}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t.phone} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={recipient.phone}
                onChange={(e) =>
                  setRecipient((prev) => ({ ...prev, phone: e.target.value }))
                }
                className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.recipient.phone ? 'border-red-500' : 'border-border'
                }`}
              />
              {errors.recipient.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.recipient.phone}</p>
              )}
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                {t.address} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={recipient.address}
                onChange={(e) =>
                  setRecipient((prev) => ({ ...prev, address: e.target.value }))
                }
                className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.recipient.address ? 'border-red-500' : 'border-border'
                }`}
              />
              {errors.recipient.address && (
                <p className="text-sm text-red-500 mt-1">{errors.recipient.address}</p>
              )}
            </div>

            {/* Note */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                {t.note}
              </label>
              <textarea
                value={recipient.note}
                onChange={(e) =>
                  setRecipient((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder={t.notePlaceholder}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </section>

        {/* Invoice Fields (if any) */}
        {invoiceSchema.length > 0 && (
          <section className="bg-surface rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {t.invoiceInfo}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invoiceSchema.map((field) => {
                const fieldError = errors.invoice.find((e) => e.key === field.key);
                return (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      type="text"
                      value={invoiceData[field.key] || ''}
                      onChange={(e) =>
                        setInvoiceData((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                        fieldError ? 'border-red-500' : 'border-border'
                      }`}
                    />
                    {fieldError && (
                      <p className="text-sm text-red-500 mt-1">{fieldError.message}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Order Summary Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 bg-surface rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">{t.orderSummary}</h2>

          {/* Cart Items Summary */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {cartItems.map((item) => {
              const key = computeLookupKey(item.productId, item.variantKey);
              const data = productData.get(key);
              const name = locale === 'zh' ? data?.nameZh : data?.nameEn;
              const displayName = name || data?.nameEn || 'Loading...';
              const price = data?.variant?.priceCents ?? 0;

              return (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-foreground truncate flex-1">
                    {displayName} × {item.quantity}
                  </span>
                  <span className="text-foreground ml-2">
                    {formatPrice(price * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          <hr className="border-border" />

          {/* Price Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-foreground">
              <span>{t.subtotal}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between text-lg font-bold text-foreground">
              <span>{t.total}</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          {/* TTL Note */}
          <p className="text-xs text-secondary">{t.ttlNote}</p>

          {/* Error Message */}
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {submitError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoadingProducts || hasUnavailable}
            className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t.processing : t.placeOrder}
          </button>
        </div>
      </div>
    </form>
  );
}
