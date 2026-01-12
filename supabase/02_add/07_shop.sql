-- ============================================
-- ADD: 電商表格 (Shop / E-commerce)
-- ============================================
-- 
-- 版本 Version: 2.0
-- 最後更新 Last Updated: 2025-12-20
--
-- 整合內容：
-- - 核心表格定義
-- - 索引
-- - RLS 政策
-- - 會員資料（CRM）
--
-- 包含表格 TABLES:
-- - shop_settings: 商城設定（singleton）
-- - products: 商品（雙語）
-- - product_variants: 商品變體
-- - inventory_reservations: 庫存保留
-- - orders: 訂單
-- - order_items: 訂單明細
-- - coupons: 優惠券
-- - coupon_redemptions: 優惠券使用記錄
-- - payment_provider_configs: 金流設定（Owner-only）
-- - shop_audit_logs: 操作日誌
-- - customer_profiles: 會員資料（CRM / AI 分析用）
--
-- 依賴 DEPENDENCIES:
-- - 01_main.sql (site_admins, auth.users)
--
-- ============================================


-- ============================================
-- PART 1: 商城設定
-- ============================================

-- shop_settings (singleton row)
-- Note: is_visible has been migrated to feature_settings table
CREATE TABLE shop_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reserved_ttl_minutes INTEGER DEFAULT 30,
  invoice_config_mode TEXT DEFAULT 'toggles' CHECK (invoice_config_mode IN ('toggles', 'jsonSchema')),
  invoice_toggles_json JSONB DEFAULT '{"taxId": false, "mobileCarrier": false, "citizenCert": false}'::jsonb,
  invoice_json_schema JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_by UUID REFERENCES auth.users(id)
);

-- Public RPC: Get shop settings safe for checkout (no admin-only fields)
-- Returns only checkout-necessary fields, accessible by anon/authenticated
-- Note: is_visible check moved to is_feature_enabled('shop') / feature_settings table
CREATE OR REPLACE FUNCTION public.get_shop_settings_public()
RETURNS TABLE (
  reserved_ttl_minutes INTEGER,
  invoice_config_mode TEXT,
  invoice_toggles_json JSONB,
  invoice_json_schema JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ss.reserved_ttl_minutes,
    ss.invoice_config_mode,
    ss.invoice_toggles_json,
    ss.invoice_json_schema
  FROM shop_settings ss
  LIMIT 1;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_shop_settings_public() TO anon, authenticated;


-- ============================================
-- PART 2: 商品
-- ============================================

CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name_en VARCHAR(255),
  name_zh VARCHAR(255),
  description_short_en TEXT,
  description_short_zh TEXT,
  description_full_en TEXT,  -- Markdown
  description_full_zh TEXT,  -- Markdown
  category VARCHAR(100) NOT NULL CHECK (category ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  tags_en TEXT[],
  tags_zh TEXT[],
  cover_image_url TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  seo_title_en VARCHAR(255),
  seo_title_zh VARCHAR(255),
  seo_description_en TEXT,
  seo_description_zh TEXT,
  is_visible BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_key VARCHAR(255) NOT NULL,  -- stable key for UI/DB alignment
  option_values_json JSONB NOT NULL,  -- e.g. {"color": "red", "size": "M"}
  sku VARCHAR(100),
  price_cents INTEGER NOT NULL DEFAULT 0,
  compare_at_price_cents INTEGER,  -- 原價（用於顯示折扣）
  stock INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE (product_id, variant_key)
);


-- ============================================
-- PART 3: 庫存保留
-- ============================================

CREATE TABLE inventory_reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'linepay', 'ecpay')),
  checkout_session_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);


-- ============================================
-- PART 4: 訂單
-- ============================================

CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'linepay', 'ecpay')),
  gateway_transaction_id VARCHAR(255),
  gateway_metadata JSONB,  -- 保留原始金流資訊
  status TEXT NOT NULL DEFAULT 'pending_payment' 
    CHECK (status IN ('pending_payment', 'paid', 'pending_shipment', 'shipped', 'completed', 'cancelled', 'refunding')),
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'TWD',
  coupon_code VARCHAR(100),
  -- 收件人資訊
  recipient_name VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(50) NOT NULL,
  recipient_address TEXT NOT NULL,
  recipient_note TEXT,
  -- 發票資訊
  invoice_data JSONB,
  -- 物流
  shipping_carrier VARCHAR(100),
  shipping_tracking_number VARCHAR(255),
  shipped_at TIMESTAMP WITH TIME ZONE,
  -- 時間戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  paid_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  -- 商品快照（避免商品刪除後遺失資訊）
  product_name_en VARCHAR(255),
  product_name_zh VARCHAR(255),
  variant_key VARCHAR(255),
  option_values_json JSONB,
  sku VARCHAR(100),
  -- 數量與價格
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- P0-3: Add order_id to inventory_reservations (after orders table exists)
ALTER TABLE inventory_reservations
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order_id
  ON inventory_reservations(order_id);


-- ============================================
-- PART 5: 優惠券
-- ============================================

CREATE TABLE coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('amount', 'percentage')),
  value INTEGER NOT NULL,  -- amount = cents, percentage = 0-100
  min_subtotal_cents INTEGER,
  max_discount_cents INTEGER,  -- 僅 percentage 時適用
  max_usage_count INTEGER,
  current_usage_count INTEGER DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE coupon_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  discount_cents INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE (coupon_id, order_id)
);


-- ============================================
-- PART 6: 金流設定（Owner-only）
-- ============================================

-- 啟用 Supabase Vault 擴充：用於安全儲存敏感金鑰
-- 注意：需要在 Supabase Dashboard > Database > Extensions 手動啟用
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE TABLE payment_provider_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway TEXT UNIQUE NOT NULL CHECK (gateway IN ('stripe', 'linepay', 'ecpay')),
  is_enabled BOOLEAN DEFAULT false,
  is_test_mode BOOLEAN DEFAULT true,
  -- Stripe (非敏感)
  stripe_publishable_key TEXT,
  -- Stripe (敏感 - 使用 Vault)
  stripe_secret_key_vault_id UUID,
  stripe_webhook_secret_vault_id UUID,
  -- LinePay (非敏感)
  linepay_channel_id TEXT,
  -- LinePay (敏感 - 使用 Vault)
  linepay_channel_secret_vault_id UUID,
  -- ECPay (非敏感)
  ecpay_merchant_id TEXT,
  -- ECPay (敏感 - 使用 Vault)
  ecpay_hash_key_vault_id UUID,
  ecpay_hash_iv_vault_id UUID,
  -- 驗證狀態
  last_validated_at TIMESTAMP WITH TIME ZONE,
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid')),
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_by UUID REFERENCES auth.users(id)
);


-- ============================================
-- PART 7: 操作日誌 (已移至 01_main.sql 的 audit_logs)
-- ============================================
-- 
-- shop_audit_logs 已移除，使用統一的 audit_logs 表 (01_main.sql)
-- 這是為了減少表格分裂，讓所有審計日誌集中管理。
--


-- ============================================
-- PART 8: 會員資料（CRM / AI 分析用）
-- ============================================

-- customer_profiles: 獨立於 auth.users 的會員資料表
-- 設計考量：
--   1. AI 分析：tags + ai_features JSONB 可擴展
--   2. 敏感資料：phone/address 分離，RLS 限制讀取
--   3. 可維護性：email/display_name 快照，避免頻繁 join auth.users
--   4. 資料清洗：敏感欄位與可分析欄位明確區分
-- Sequence for customer short_id generation (C1, C2, C3, ...)
-- Note: Does NOT recycle IDs on delete per PRD §5.3 for consistency
CREATE SEQUENCE customer_profiles_short_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE customer_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Short ID for AI Analysis (C1, C2, ..., C999, C1000, ...)
  -- Auto-generated on insert via sequence DEFAULT, never recycled
  -- @see doc/specs/completed/AI_ANALYSIS_v2.md §5.3
  short_id TEXT UNIQUE NOT NULL DEFAULT 'C' || nextval('customer_profiles_short_id_seq'),
  
  -- 基本資料（同步自訂單 / auth.users）
  email TEXT,                        -- 快照；可匿名化處理後用於分析
  display_name TEXT,                 -- 顯示名稱
  
  -- 敏感資料（Admin 限定讀取，需特別保護）
  phone TEXT,                        -- 電話（敏感）
  address_json JSONB,                -- 完整地址（敏感）
  
  -- 聚合統計（由 trigger 或 cron 更新，免去即時計算）
  order_count INTEGER DEFAULT 0,
  ltv_cents INTEGER DEFAULT 0,       -- Lifetime Value（累計消費，以 cents 為單位）
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  avg_order_cents INTEGER DEFAULT 0,
  
  -- AI 分析用（可擴展欄位）
  tags TEXT[] DEFAULT '{}',          -- 畫像標籤：eg. high_value, new_buyer, repeat_customer
  ai_features JSONB DEFAULT '{}',    -- AI 模型特徵向量或分類結果（預留）
  
  -- 狀態管理
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMPTZ,
  blocked_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);


-- ============================================
-- PART 9: 索引
-- ============================================

-- products
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_visible ON products(is_visible);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sort ON products(sort_order);

-- product_variants
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_variant_key ON product_variants(variant_key);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_product_variants_enabled ON product_variants(is_enabled);

-- inventory_reservations
CREATE INDEX idx_inventory_reservations_variant ON inventory_reservations(variant_id);
CREATE INDEX idx_inventory_reservations_session ON inventory_reservations(checkout_session_id);
CREATE INDEX idx_inventory_reservations_expires ON inventory_reservations(expires_at);

-- orders
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_gateway ON orders(gateway);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- order_items
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- coupons
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);
CREATE INDEX idx_coupons_expires ON coupons(expires_at);

-- coupon_redemptions
CREATE INDEX idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_order ON coupon_redemptions(order_id);

-- payment_provider_configs
CREATE INDEX idx_payment_configs_gateway ON payment_provider_configs(gateway);

-- shop_audit_logs indexes removed (table moved to audit_logs in 01_main.sql)

-- customer_profiles
CREATE INDEX idx_customer_profiles_user_id ON customer_profiles(user_id);
CREATE INDEX idx_customer_profiles_short_id ON customer_profiles(short_id);
CREATE INDEX idx_customer_profiles_email ON customer_profiles(email);
CREATE INDEX idx_customer_profiles_ltv ON customer_profiles(ltv_cents DESC);
CREATE INDEX idx_customer_profiles_last_order ON customer_profiles(last_order_at DESC);
CREATE INDEX idx_customer_profiles_tags ON customer_profiles USING GIN(tags);
CREATE INDEX idx_customer_profiles_blocked ON customer_profiles(is_blocked) WHERE is_blocked = true;


-- ============================================
-- PART 10: 啟用 RLS
-- ============================================

ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_provider_configs ENABLE ROW LEVEL SECURITY;
-- shop_audit_logs removed (using audit_logs in 01_main.sql)
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 10.5: is_shop_visible 函數（RLS 依賴）
-- ============================================
-- 注意：此函數必須在 RLS Policies 之前定義，因為 PART 11 的 policies 會使用它

-- is_shop_visible: RLS-safe 的商城可見性檢查
-- 設計考量：
--   1. SECURITY DEFINER：允許 anon 用戶檢查可見性而不需直接存取表格
--   2. STABLE：標記為穩定函數，可被快取
--   3. 安全性：讀取 feature_settings 表的 shop 設定
-- Note: Now reads from feature_settings table instead of shop_settings.is_visible
CREATE OR REPLACE FUNCTION public.is_shop_visible()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM feature_settings WHERE feature_key = 'shop'),
    false
  );
$$;

-- 授予 anon 和 authenticated 執行權限
GRANT EXECUTE ON FUNCTION public.is_shop_visible() TO anon;
GRANT EXECUTE ON FUNCTION public.is_shop_visible() TO authenticated;


-- ============================================
-- PART 11: RLS Policies - Public (匿名讀取)
-- ============================================

-- products: 公開可讀（需 shop visible + product visible）
CREATE POLICY "Public can read visible products"
  ON products FOR SELECT
  USING (
    is_visible = true
    AND public.is_shop_visible()
  );

-- product_variants: 公開可讀（跟隨 product 與 shop visibility）
CREATE POLICY "Public can read enabled variants of visible products"
  ON product_variants FOR SELECT
  USING (
    is_enabled = true
    AND EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_variants.product_id
        AND p.is_visible = true
    )
    AND public.is_shop_visible()
  );


-- ============================================
-- PART 12: RLS Policies - Customer (authenticated)
-- ============================================

-- orders: 顧客只能讀自己的訂單
CREATE POLICY "Customers can read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- order_items: 顧客只能讀自己訂單的明細
CREATE POLICY "Customers can read own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

-- coupon_redemptions: 顧客可讀自己的使用記錄
CREATE POLICY "Customers can read own redemptions"
  ON coupon_redemptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================
-- PART 13: RLS Policies - Admin (Editor)
-- ============================================

-- 通用 Admin Gate 表達式（JWT claims）
-- (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')

-- shop_settings: Admin 可讀寫
CREATE POLICY "Admins can manage shop settings"
  ON shop_settings FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- products: Admin 可管理
CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- product_variants: Admin 可管理
CREATE POLICY "Admins can manage product variants"
  ON product_variants FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- orders: Admin 可管理（讀/更新狀態/物流）
CREATE POLICY "Admins can manage orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- order_items: Admin 可讀
CREATE POLICY "Admins can read order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- coupons: Admin 可管理
CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- coupon_redemptions: Admin 可讀
CREATE POLICY "Admins can read coupon redemptions"
  ON coupon_redemptions FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- customer_profiles: Admin 可讀寫全部
CREATE POLICY "Admins can manage customer profiles"
  ON customer_profiles FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- customer_profiles: 用戶可讀自己的 profile
CREATE POLICY "Users can read own profile"
  ON customer_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================
-- PART 14: RLS Policies - Owner (敏感資料)
-- ============================================

-- Owner-only Gate 表達式（JWT claims）
-- (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'

-- payment_provider_configs: Owner 才能管理
CREATE POLICY "Owners can manage payment configs"
  ON payment_provider_configs FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
  );

-- shop_audit_logs policies removed (using audit_logs in 01_main.sql)


-- ============================================
-- PART 15: Server-only Notes
-- ============================================

-- inventory_reservations: 只允許 service_role（API routes / server actions）
-- 不開放任何 client policy（避免 client 竄改保留庫存）
-- 透過 service_role client 操作即可 bypass RLS


-- ============================================
-- PART 16: Grant Permissions (Table-level access)
-- ============================================
-- RLS policies control WHICH rows; GRANT controls table-level access.
-- Without GRANT, PostgreSQL denies access before RLS is even evaluated.

-- Public read (RLS further restricts by visibility + is_shop_visible())
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_variants TO anon, authenticated;

-- Authenticated read (customers + admins)
GRANT SELECT ON public.shop_settings TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT ON public.coupons TO authenticated;
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT SELECT ON public.payment_provider_configs TO authenticated;
GRANT SELECT ON public.customer_profiles TO authenticated;

-- Admin write (RLS enforces owner/editor/owner-only)
GRANT INSERT, UPDATE, DELETE ON public.shop_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_provider_configs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.customer_profiles TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================
