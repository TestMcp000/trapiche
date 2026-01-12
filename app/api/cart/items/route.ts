/**
 * Cart Items API Route
 *
 * 提供購物車項目資料查詢（含 variants 價格/庫存）
 *
 * 遵循 ARCHITECTURE.md §3.6 & §3.7：
 * - 使用 anonymous Supabase client（public read）
 * - 不暴露敏感資料
 * - API types 定義於 lib/types/shop.ts
 * - IO 邏輯集中於 lib/modules/shop/io.ts
 * - 本 route 只做 parse → validate → 呼叫 lib → return
 */

import { NextRequest, NextResponse } from 'next/server';
import type { CartItemsResponseBody } from '@/lib/types/shop';
import { getCartItemsData } from '@/lib/modules/shop/io';
import { isShopEnabled } from '@/lib/features/io';
import { validateCartItemsRequest } from '@/lib/validators/cart';

/**
 * POST /api/cart/items
 *
 * 接收購物車項目清單，回傳商品資料
 * 
 * 重要：使用 lookupKey 策略
 * - lookupKey: request 時的 key，用於 client Map 查找
 * - resolvedVariantKey: server 最終採用的 variant_key
 */
export async function POST(request: NextRequest): Promise<NextResponse<CartItemsResponseBody | { error: string }>> {
  try {
    // Feature gate: return 404 if shop is disabled
    const shopEnabled = await isShopEnabled();
    if (!shopEnabled) {
      return NextResponse.json({ items: [] }, { status: 404 });
    }

    const body = await request.json();

    // P0-6: Use centralized validator
    const validation = validateCartItemsRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error! }, { status: 400 });
    }

    if (validation.data!.items.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Use lib/modules/shop/io for all DB operations
    const items = await getCartItemsData(validation.data!.items);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Cart items API error:', error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
