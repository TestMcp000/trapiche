/**
 * Shop Domain Types
 *
 * 遵循 refactor.md 架構規範：
 * - DB row types: snake_case（對齊 Supabase row）
 * - Input/Response types: camelCase
 * - 禁止 IO/side effects（pure module）
 */

// =============================================================================
// Gateway
// =============================================================================

/** 金流供應商（V1: Stripe 全流程，LinePay/ECPay 先 Stub） */
export type PaymentGateway = 'stripe' | 'linepay' | 'ecpay';

/** Admin 角色（RBAC：Owner 可管理金流設定，Editor 只能管理商品/訂單） */
export type AdminRole = 'owner' | 'editor';

// =============================================================================
// Unified Order Status
// =============================================================================

/**
 * 統一訂單狀態（對應 shop_spec.md 8.2 節）
 * 資料落庫前轉成內部 enum，避免 DB 混雜各金流原始狀態
 */
export type UnifiedOrderStatus =
  | 'pending_payment' // 待付款：訂單已建立，等待付款
  | 'paid' // 已付款：付款成功
  | 'pending_shipment' // 待出貨：已付款，等待出貨
  | 'shipped' // 已出貨：已填入物流單號
  | 'completed' // 已完成：訂單完成
  | 'cancelled' // 已取消：訂單取消（逾時/手動）
  | 'refunding'; // 退款中：待退款處理

// =============================================================================
// Cart
// =============================================================================

/** 購物車項目（純計算用；不含 DB 欄位） */
export interface CartItem {
  variantKey: string; // 對應 product_variants.variant_key
  quantity: number;
  unitPriceCents: number; // 以 cents 為單位，避免浮點誤差
}

/** 購物車儲存項目（localStorage 用，不含價格 - 價格需從 server 取得） */
export interface CartStorageItem {
  productId: string;
  variantKey: string | null; // null = 無變體商品
  quantity: number;
}

/** 購物車狀態（localStorage 儲存用） */
export interface CartState {
  items: CartStorageItem[];
  couponCode?: string;
}

// =============================================================================
// Cart API Types (for POST /api/cart/items)
// =============================================================================

/** 購物車項目請求（API Request） */
export interface CartItemRequest {
  productId: string;
  variantKey: string | null;
}

/** 購物車項目回應（API Response）
 * 
 * 注意：使用 lookupKey 策略來解決 variantKey fallback 問題
 * - lookupKey: request 時的 key（`${productId}::${variantKey}` 或 `${productId}`），用於 client Map 查找
 * - resolvedVariantKey: server 最終採用的 variant_key，可能與 request 不同（如 fallback 到預設 variant）
 * 
 * Client 應一律用 lookupKey 建 Map；若 resolvedVariantKey 與 cart state 不同，
 * 可選擇更新 cart state 或提示使用者。
 */
export interface CartItemResponse {
  /** Request key for Map lookup: `${productId}::${variantKey}` or `${productId}` if variantKey is null */
  lookupKey: string;
  productId: string;
  /** Server 最終採用的 variant_key（可能與 request 的 variantKey 不同） */
  resolvedVariantKey: string | null;
  nameEn: string | null;
  nameZh: string | null;
  coverImageUrl: string | null;
  category: string | null;
  slug: string;
  variant: {
    priceCents: number;
    compareAtPriceCents: number | null;
    stock: number;
    isEnabled: boolean;
    optionValuesJson: Record<string, string>;
  } | null;
  available: boolean;
  errorCode?: 'product_not_found' | 'variant_not_found' | 'out_of_stock' | 'not_visible';
}

/** 購物車項目 API 請求體 */
export interface CartItemsRequestBody {
  items: CartItemRequest[];
}

/** 購物車項目 API 回應體 */
export interface CartItemsResponseBody {
  items: CartItemResponse[];
}

// =============================================================================
// Coupon
// =============================================================================

/** 折扣類型 */
export type CouponType = 'amount' | 'percentage';

/** 優惠券（純計算用；對應 coupons 表欄位） */
export interface Coupon {
  code: string;
  type: CouponType;
  /** amount = cents, percentage = 0-100 */
  value: number;
  /** 最低消費金額（cents） */
  minSubtotalCents?: number;
  /** 最大折抵金額（cents，僅 percentage 時適用） */
  maxDiscountCents?: number;
  /** 總使用次數上限 */
  maxUsageCount?: number;
  /** 過期時間（ISO 8601） */
  expiresAt?: string;
}

// =============================================================================
// Invoice Config（發票欄位設定）
// =============================================================================

/**
 * 簡易模式：Switch toggles
 * 對應 shop_spec.md 10.6 節「勾選常用欄位」
 */
export interface InvoiceToggles {
  /** 統一編號 */
  taxId: boolean;
  /** 手機載具 */
  mobileCarrier: boolean;
  /** 自然人憑證 */
  citizenCert: boolean;
}

/**
 * 內部發票 schema 欄位（統一輸出格式）
 * toggles 或 jsonSchema 最終都轉成此結構
 */
export interface InvoiceFieldSchema {
  key: string;
  label: string;
  type: 'string';
  required: boolean;
  /** 驗證用 Regex pattern（可選） */
  pattern?: string;
}

/**
 * 發票設定模式
 * - toggles: 簡易 Switch 模式
 * - jsonSchema: 進階 JSON Schema 模式
 */
export type InvoiceConfigMode = 'toggles' | 'jsonSchema';

/** 發票配置（Admin 設定存放） */
export interface InvoiceConfig {
  mode: InvoiceConfigMode;
  /** 簡易模式設定 */
  toggles?: InvoiceToggles;
  /** 進階模式 JSON Schema（限安全子集：object + string fields） */
  jsonSchema?: Record<string, unknown>;
}

// =============================================================================
// DB Row Types (snake_case, matching Supabase)
// =============================================================================

/** shop_settings 表 row */
export interface ShopSettingsRow {
  id: string;
  reserved_ttl_minutes: number;
  invoice_config_mode: InvoiceConfigMode;
  invoice_toggles_json: InvoiceToggles | null;
  invoice_json_schema: Record<string, unknown> | null;
  updated_at: string;
  updated_by: string | null;
}

/** products 表 row */
export interface ProductRow {
  id: string;
  slug: string;
  name_en: string | null;
  name_zh: string | null;
  description_short_en: string | null;
  description_short_zh: string | null;
  description_full_en: string | null;
  description_full_zh: string | null;
  category: string | null;
  tags_en: string[] | null;
  tags_zh: string[] | null;
  cover_image_url: string | null;
  media_urls: string[];
  seo_title_en: string | null;
  seo_title_zh: string | null;
  seo_description_en: string | null;
  seo_description_zh: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** product_variants 表 row */
export interface ProductVariantRow {
  id: string;
  product_id: string;
  variant_key: string;
  option_values_json: Record<string, string>;
  sku: string | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  stock: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** orders 表 row */
export interface OrderRow {
  id: string;
  order_number: string;
  user_id: string | null;
  gateway: PaymentGateway;
  gateway_transaction_id: string | null;
  gateway_metadata: Record<string, unknown> | null;
  status: UnifiedOrderStatus;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  coupon_code: string | null;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_note: string | null;
  invoice_data: Record<string, unknown> | null;
  shipping_carrier: string | null;
  shipping_tracking_number: string | null;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

/** order_items 表 row */
export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name_en: string | null;
  product_name_zh: string | null;
  variant_key: string | null;
  option_values_json: Record<string, string> | null;
  sku: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  created_at: string;
}

/** coupons 表 row */
export interface CouponRow {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_subtotal_cents: number | null;
  max_discount_cents: number | null;
  max_usage_count: number | null;
  current_usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** customer_profiles 表 row */
export interface CustomerProfileRow {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  /** 敏感欄位：電話 */
  phone: string | null;
  /** 敏感欄位：完整地址 */
  address_json: Record<string, unknown> | null;
  /** 聚合統計：訂單數 */
  order_count: number;
  /** 聚合統計：累計消費（cents） */
  ltv_cents: number;
  first_order_at: string | null;
  last_order_at: string | null;
  /** 聚合統計：平均訂單金額（cents） */
  avg_order_cents: number;
  /** AI 分析用：畫像標籤 */
  tags: string[];
  /** AI 分析用：特徵向量或分類結果 */
  ai_features: Record<string, unknown>;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Response Types (camelCase, for API/UI)
// =============================================================================

/** 商品摘要（列表用） */
export interface ProductSummary {
  id: string;
  slug: string;
  nameEn: string | null;
  nameZh: string | null;
  descriptionShortEn: string | null;
  descriptionShortZh: string | null;
  coverImageUrl: string | null;
  category: string | null;
  isVisible: boolean;
  /** 最低價格（來自 variants） */
  minPriceCents: number;
  /** 最高價格（來自 variants） */
  maxPriceCents: number;
  /** 總庫存（來自 variants） */
  totalStock: number;
}

/** 商品詳情（含變體） */
export interface ProductDetail extends ProductSummary {
  descriptionFullEn: string | null;
  descriptionFullZh: string | null;
  tagsEn: string[];
  tagsZh: string[];
  mediaUrls: string[];
  seoTitleEn: string | null;
  seoTitleZh: string | null;
  seoDescriptionEn: string | null;
  seoDescriptionZh: string | null;
  variants: ProductVariantRow[];
  createdAt: string;
  updatedAt: string;
}

/** 商品列表結果（分頁） */
export interface ProductListResult {
  items: ProductSummary[];
  total: number;
  hasMore: boolean;
}

/** 商品列表參數 */
export interface ProductListParams {
  category?: string;
  search?: string;
  sort?: 'newest' | 'popular' | 'price-asc' | 'price-desc';
  limit?: number;
  offset?: number;
}

/** 商品分類資訊（從 products.category 聚合） */
export interface ProductCategory {
  /** URL-safe category slug */
  slug: string;
  /** 該分類下的可見商品數量 */
  productCount: number;
}

/** 訂單摘要（列表用） */
export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: UnifiedOrderStatus;
  gateway: PaymentGateway;
  totalCents: number;
  currency: string;
  recipientName: string;
  createdAt: string;
  paidAt: string | null;
}

/** 訂單詳情（含明細） */
export interface OrderDetail extends OrderSummary {
  userId: string | null;
  gatewayTransactionId: string | null;
  gatewayMetadata: Record<string, unknown> | null;
  subtotalCents: number;
  discountCents: number;
  couponCode: string | null;
  recipientPhone: string;
  recipientAddress: string;
  recipientNote: string | null;
  invoiceData: Record<string, unknown> | null;
  shippingCarrier: string | null;
  shippingTrackingNumber: string | null;
  shippedAt: string | null;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  items: OrderItemRow[];
}

// =============================================================================
// Customer Profile (CRM / AI 分析)
// =============================================================================

/** 會員摘要（admin 列表用，隱藏敏感欄位） */
export interface CustomerProfileSummary {
  id: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  orderCount: number;
  ltvCents: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  avgOrderCents: number;
  tags: string[];
  isBlocked: boolean;
}

/** 會員詳情（含敏感欄位，Owner/Admin 限定） */
export interface CustomerProfileDetail extends CustomerProfileSummary {
  phone: string | null;
  addressJson: Record<string, unknown> | null;
  aiFeatures: Record<string, unknown>;
  blockedAt: string | null;
  blockedReason: string | null;
  orders: OrderSummary[];
}

