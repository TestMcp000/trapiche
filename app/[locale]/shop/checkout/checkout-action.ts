'use server';

/**
 * Checkout Server Action
 *
 * 處理結帳流程：
 * 1. 驗證用戶認證
 * 2. 驗證購物車項目與價格（server 端重算）
 * 3. 驗證庫存
 * 4. 載入 Stripe 設定
 * 5. 建立 Stripe Checkout Session（待 Stripe 帳號後實作）
 * 6. 原子化建立訂單 + 庫存保留 + 優惠券兌換
 *
 * 遵循 ARCHITECTURE.md：
 * - Server action 作為寫入入口
 * - 金額計算使用 lib/modules/shop/pricing.ts
 * - Stripe SDK 僅在 server 端 import
 * - 使用 createClient 取得認證用戶
 * - 使用 createAdminClient 呼叫 RPC（bypass RLS for write operations）
 */

import { createClient } from '@/lib/infrastructure/supabase/server';
import { getPaymentProviderConfig } from '@/lib/modules/shop/payment-io';
import { getShopSettingsCached } from '@/lib/modules/shop/cached';
import {
  getCheckoutProductsByIds,
  getCheckoutEnabledVariantsByProductIds,
  type CheckoutVariant,
} from '@/lib/modules/shop/checkout-io';
import { calculateCart } from '@/lib/modules/shop/pricing';
import type { CartItem } from '@/lib/types/shop';

export interface CheckoutInput {
  items: Array<{
    productId: string;
    variantId: string;
    variantKey: string | null;
    quantity: number;
  }>;
  couponCode?: string;
  recipient: {
    name: string;
    phone: string;
    address: string;
    note?: string;
  };
  invoiceData?: Record<string, string>;
}

export interface CheckoutResult {
  success: boolean;
  error?: string;
  errorCode?:
    | 'empty_cart'
    | 'invalid_items'
    | 'out_of_stock'
    | 'stripe_not_configured'
    | 'not_authenticated'
    | 'coupon_error'
    | 'unknown';
  checkoutUrl?: string;
  orderId?: string;
}

/**
 * 結帳 Server Action
 *
 * 流程：
 * 1. 驗證用戶認證
 * 2. 載入 Stripe 設定
 * 3. 驗證購物車
 * 4. 建立 Stripe Checkout Session（stub）
 * 5. 原子化建立訂單 + 庫存保留 + 優惠券兌換
 * 6. 回傳結果
 */
export async function processCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  try {
    // Step 1: 驗證用戶認證
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { 
        success: false, 
        error: 'Please log in to continue checkout', 
        errorCode: 'not_authenticated' 
      };
    }

    // Step 2: 驗證購物車不為空
    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'Cart is empty', errorCode: 'empty_cart' };
    }

    // Step 3: 載入 Stripe 設定
    const stripeConfigResult = await getPaymentProviderConfig('stripe');
    if (!stripeConfigResult.success) {
      return { 
        success: false, 
        error: 'Stripe is not configured. Please contact site administrator.', 
        errorCode: 'stripe_not_configured' 
      };
    }

    // 收集 productIds
    const productIds = [...new Set(input.items.map((item) => item.productId))];

    // 從 DB 取得商品資料（server 端重算價格，不信任 client）
    // IO boundary: use centralized checkout-io.ts instead of direct .from()
    const products = await getCheckoutProductsByIds(productIds);

    if (products.length === 0) {
      return { success: false, error: 'Products not found', errorCode: 'invalid_items' };
    }

    // 建立商品 lookup
    const productMap = new Map(products.map((p) => [p.id, p]));

    // 取得 variants
    // IO boundary: use centralized checkout-io.ts instead of direct .from()
    const variants = await getCheckoutEnabledVariantsByProductIds(productIds);

    // 建立 variant lookup (use CheckoutVariant type from checkout-io.ts)
    const variantMap = new Map<string, CheckoutVariant>();
    variants.forEach((v) => {
      // Use variant_id as key for lookup
      variantMap.set(v.id, v);
    });

    // 驗證每個項目並準備 RPC items
    const cartItems: CartItem[] = [];
    const rpcItems: Array<{
      variant_id: string;
      quantity: number;
      unit_price_cents: number;
      product_name_en: string | null;
      product_name_zh: string | null;
      variant_key: string | null;
      option_values_json: Record<string, unknown>;
      sku: string | null;
    }> = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product || !product.is_visible) {
        return {
          success: false,
          error: `Product ${item.productId} is not available`,
          errorCode: 'invalid_items',
        };
      }

      const variant = variantMap.get(item.variantId);

      if (!variant) {
        return {
          success: false,
          error: `Variant not found for ${item.productId}`,
          errorCode: 'invalid_items',
        };
      }

      // 檢查庫存
      if (variant.stock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for ${product.name_zh || product.name_en}`,
          errorCode: 'out_of_stock',
        };
      }

      cartItems.push({
        variantKey: item.variantKey || variant.variant_key,
        quantity: item.quantity,
        unitPriceCents: variant.price_cents,
      });

      rpcItems.push({
        variant_id: variant.id,
        quantity: item.quantity,
        unit_price_cents: variant.price_cents,
        product_name_en: product.name_en,
        product_name_zh: product.name_zh,
        variant_key: variant.variant_key,
        option_values_json: variant.option_values_json,
        sku: variant.sku,
      });
    }

    // 計算總金額（不套用 coupon，coupon 由 DB function 處理）
    const calculation = calculateCart(cartItems, null);

    console.log('[Checkout] Cart calculation:', {
      subtotal: calculation.subtotalCents,
      total: calculation.totalCents,
      items: cartItems.length,
    });

    // Step 4: 取得 shop_settings 的 reserved_ttl_minutes
    // P0-6: Use RPC via getShopSettings() instead of direct admin client access
    const shopSettings = await getShopSettingsCached();
    const _reservedTtlMinutes = shopSettings?.reserved_ttl_minutes ?? 30;

    // Step 5: 建立 Stripe Checkout Session
    // TODO: 待 Stripe 帳號申請後實作
    // 
    // 重要：在 Stripe session 實作完成前，不建立訂單以避免產生孤兒訂單
    // 設計決定：完全阻止訂單建立，除非 Stripe 已完整設定（2025-12-22）
    //
    // const stripe = new Stripe(stripeConfigResult.config.secretKey);
    // const session = await stripe.checkout.sessions.create({
    //   mode: 'payment',
    //   line_items: cartItems.map(item => ({
    //     price_data: {
    //       currency: 'twd',
    //       product_data: { name: item.variantKey },
    //       unit_amount: item.unitPriceCents,
    //     },
    //     quantity: item.quantity,
    //   })),
    //   success_url: `${baseUrl}/${locale}/shop/order/success?session_id={CHECKOUT_SESSION_ID}`,
    //   cancel_url: `${baseUrl}/${locale}/shop/checkout`,
    //   expires_at: Math.floor(Date.now() / 1000) + (reservedTtlMinutes * 60),
    // });
    //
    // 待 Stripe 實作後，取消下方 return 並啟用上方的 session 建立邏輯：
    // const { data: orderResult, error: rpcError } = await supabaseAdmin
    //   .rpc('create_order_with_reservation', {
    //     p_user_id: user.id,
    //     p_gateway: 'stripe',
    //     p_checkout_session_id: session.id,  // 使用真實的 session.id
    //     ...
    //   });
    // return { success: true, checkoutUrl: session.url!, orderId: order.order_id };

    // 現階段：Stripe Checkout Session 尚未實作，阻止訂單建立
    return {
      success: false,
      error: 'Stripe Checkout is not yet implemented. Payment integration pending.',
      errorCode: 'stripe_not_configured',
    };
  } catch (error) {
    console.error('[Checkout] Error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      errorCode: 'unknown',
    };
  }
}
