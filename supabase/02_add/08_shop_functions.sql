-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- 執行前必讀 - Extension 啟用步驟
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
--
-- 本檔案依賴兩個 Supabase Extensions，必須先手動啟用：
--
-- [步驟 1] 啟用 pg_cron Extension
--    1. 開啟瀏覽器，前往 https://supabase.com/dashboard
--    2. 登入後選擇您的專案
--    3. 左側選單點擊 "Database"
--    4. 點擊 "Extensions"
--    5. 在搜尋框輸入 "pg_cron"
--    6. 找到 pg_cron 後，點擊右側的 "Enable" 按鈕
--    7. 等待啟用完成（約 10-30 秒，頁面會顯示 Enabled）
--
-- [步驟 2] 啟用 vault Extension（同上方式）
--    在 Extensions 頁面搜尋 "vault" 並點擊 Enable
--
-- [常見錯誤]
--    如果沒有先啟用 Extension 就執行本檔案，會看到以下錯誤：
--    - ERROR: schema "cron" does not exist
--    - ERROR: schema "vault" does not exist
--    解決方法：回到 Dashboard 啟用對應的 Extension
--
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

-- ============================================
-- ADD: 電商表格 - 函數與 Webhook
-- ============================================
-- 
-- 版本 Version: 2.0
-- 最後更新 Last Updated: 2025-12-20
--
-- 整合內容：
-- - Webhook 與支付審計表格
-- - 所有電商相關函數
--
-- 包含表格 TABLES:
-- - webhook_events: Webhook 事件去重（Idempotency）
-- - payment_audit_logs: 支付審計日誌
--
-- 包含函數 FUNCTIONS:
-- - release_expired_reservations: 釋放逾時庫存保留
-- - process_payment_success: 處理支付成功
-- - is_shop_visible: 已移至 07_shop.sql（需在 RLS Policies 前定義）
-- - create_order_with_reservation: 原子化訂單建立
-- - redeem_coupon: 優惠券兌換
--
-- Vault 金鑰管理：使用官方 API（見 PART 7 註解）
--
-- 依賴 DEPENDENCIES:
-- - 07_shop.sql (所有核心表格)
--
-- ============================================


-- ============================================
-- PART 1: Webhook 事件去重（PS1-2 Idempotency）
-- ============================================

-- webhook_events: 用於 Webhook idempotency，防止重播攻擊
-- 設計考量：
--   1. event_id 唯一約束：同一事件只處理一次
--   2. 保留原始 payload 供 debug / 重建用
--   3. RLS：只允許 service_role 存取（server-only）
CREATE TABLE webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'linepay', 'ecpay')),
  event_id VARCHAR(255) NOT NULL,         -- 金流商提供的事件 ID
  event_type VARCHAR(100) NOT NULL,       -- e.g. checkout.session.completed
  payload JSONB,                          -- 原始 payload（可選，便於 debug）
  processed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  
  -- 唯一約束：同一 gateway + event_id 只能存在一筆
  UNIQUE (gateway, event_id)
);

-- 索引
CREATE INDEX idx_webhook_events_gateway ON webhook_events(gateway);
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_processed_at ON webhook_events(processed_at DESC);

-- 啟用 RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: 只允許 service_role（不開放 client policy）
-- 透過 service_role client 操作即可 bypass RLS


-- ============================================
-- PART 2: 支付審計日誌（Phase 1 Webhook Audit）
-- ============================================

-- payment_audit_logs: 支付 webhook 審計紀錄
-- 設計考量：
--   1. 完整紀錄所有 webhook 事件（含驗證失敗）
--   2. 支持 debug 與爭議處理
--   3. RLS：只允許 service_role 存取（server-only）
CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_order_id
  ON payment_audit_logs(order_id);

CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_created_at
  ON payment_audit_logs(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_audit_logs_provider_event
  ON payment_audit_logs(provider, provider_event_id);

-- 啟用 RLS
ALTER TABLE payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: 只允許 service_role（不開放 client policy）
-- 透過 service_role client 操作即可 bypass RLS


-- ============================================
-- PART 3: 釋放逾時庫存保留 (P4-1 TTL Release)
-- ============================================

-- release_expired_reservations: 釋放逾期的庫存保留
-- 設計考量：
--   1. 冪等性：重複執行不會造成問題
--   2. 原子性：使用 transaction 確保一致性
--   3. 可追蹤：回傳處理數量
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count INTEGER;
  expired_reservation RECORD;
BEGIN
  affected_count := 0;
  
  -- 找出所有已過期且尚未處理的 reservations
  -- P0-3: 使用 ir.order_id 直接 join orders
  FOR expired_reservation IN
    SELECT ir.id, ir.variant_id, ir.quantity, ir.checkout_session_id, ir.order_id
    FROM inventory_reservations ir
    LEFT JOIN orders o ON o.id = ir.order_id
    WHERE ir.expires_at < NOW()
      -- 只處理尚未付款的訂單(或無對應訂單)
      AND (o.id IS NULL OR o.status = 'pending_payment')
  LOOP
    -- 刪除過期的 reservation
    DELETE FROM inventory_reservations WHERE id = expired_reservation.id;
    
    -- 如果有對應的待付款訂單，更新狀態為 cancelled
    IF expired_reservation.order_id IS NOT NULL THEN
      UPDATE orders
      SET 
        status = 'cancelled',
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE id = expired_reservation.order_id
        AND status = 'pending_payment';
    END IF;
    
    affected_count := affected_count + 1;
  END LOOP;
  
  -- P0-2: 寫入 audit_logs (統一日誌表)
  IF affected_count > 0 THEN
    INSERT INTO audit_logs (action, entity_type, entity_id, actor_email, details)
    VALUES (
      'inventory_reservations_ttl_release',
      'inventory_reservations',
      affected_count::text,
      NULL,
      jsonb_build_object('count', affected_count, 'timestamp', NOW())
    );
  END IF;
  
  RETURN affected_count;
END;
$$;


-- ============================================
-- PART 4: pg_cron Job（已啟用）
-- ============================================
--
-- pg_cron 排程語法說明：
--   分 時 日 月 週
--   *  *  *  *  *
--   |  |  |  |  +-- 週幾 (0-6, 0=週日)
--   |  |  |  +---- 月份 (1-12)
--   |  |  +------- 日期 (1-31)
--   |  +---------- 小時 (0-23)
--   +------------- 分鐘 (0-59)
--
--   範例：
--   '*/5 * * * *'  = 每 5 分鐘
--   '0 * * * *'    = 每小時整點
--   '0 3 * * *'    = 每天凌晨 3 點
--   '30 3 * * 6'   = 每週六凌晨 3:30
--

-- 每 5 分鐘執行一次釋放逾期庫存（冪等：已存在則跳過）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'release-expired-reservations'
  ) THEN
    PERFORM cron.schedule(
      'release-expired-reservations',              -- job name
      '*/5 * * * *',                               -- every 5 minutes
      'SELECT public.release_expired_reservations();'
    );
  END IF;
END;
$$;

-- ============================================
-- pg_cron 管理指令參考（注解區，視需要手動執行）
-- ============================================
--
-- [查看所有已排程的 Jobs]
-- SELECT jobid, jobname, schedule, command, active FROM cron.job;
--
-- [查看 Job 執行歷史紀錄]
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- [移除指定 Job]
-- SELECT cron.unschedule('release-expired-reservations');
--
-- [暫停 Job（不刪除）]
-- UPDATE cron.job SET active = false WHERE jobname = 'release-expired-reservations';
--
-- [重新啟用 Job]
-- UPDATE cron.job SET active = true WHERE jobname = 'release-expired-reservations';
--


-- ============================================
-- PART 5: 處理支付成功 (Phase 1 Atomic Payment)
-- ============================================

-- process_payment_success: 原子化處理支付成功
-- 設計考量：
--   1. 冪等性：已付款訂單直接回傳 'paid'
--   2. 原子性：使用 transaction + FOR UPDATE 確保一致性
--   3. Gateway 一致性檢查：防止跨金流商攻擊
--   4. 庫存扣減：從 reservation 轉為實際庫存扣減
CREATE OR REPLACE FUNCTION process_payment_success(
  p_order_id UUID,
  p_gateway TEXT,
  p_gateway_transaction_id TEXT,
  p_gateway_metadata JSONB
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status TEXT;
  current_gateway TEXT;
  reservation_key TEXT;
BEGIN
  SELECT status, gateway, gateway_transaction_id
    INTO current_status, current_gateway, reservation_key
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF current_gateway IS NOT NULL AND current_gateway <> p_gateway THEN
    RAISE EXCEPTION 'gateway_mismatch';
  END IF;

  IF current_status = 'paid' THEN
    RETURN 'paid';
  END IF;

  IF reservation_key IS NULL THEN
    reservation_key := p_gateway_transaction_id;
  END IF;

  UPDATE orders
  SET status = 'paid',
      paid_at = NOW(),
      gateway = p_gateway,
      gateway_transaction_id = reservation_key,
      gateway_metadata = p_gateway_metadata,
      updated_at = NOW()
  WHERE id = p_order_id
    AND status <> 'paid';

  UPDATE product_variants pv
  SET stock = pv.stock - ir.quantity
  FROM inventory_reservations ir
  WHERE ir.variant_id = pv.id
    AND ir.checkout_session_id = reservation_key
    AND ir.gateway = p_gateway;

  DELETE FROM inventory_reservations
  WHERE checkout_session_id = reservation_key
    AND gateway = p_gateway;

  RETURN 'paid';
END;
$$;


-- ============================================
-- PART 6: 公開可見性檢查 (P0-4 RLS-safe Visibility Gate)
-- ============================================
-- 注意：is_shop_visible() 函數已移至 07_shop.sql PART 10.5
-- 因為該函數必須在 RLS Policies 之前定義（07_shop.sql 的 PART 11 會使用它）


-- ============================================
-- PART 7: Vault 使用說明（使用官方 API）
-- ============================================
--
-- [安全須知]
-- - vault.decrypted_secrets 只能由 service_role 存取
-- - 應用程式端須使用 service_role client 讀取金鑰
-- - 切勿在 client-side 暴露金鑰
--
-- ============================================
-- [操作 1] 新增金鑰（以 Stripe 為例）
-- ============================================
--
-- 方法 A：透過 SQL Editor
--
-- SELECT vault.create_secret(
--   'sk_live_xxxxxxxxxxxxxxxx',           -- 您的 Stripe Secret Key
--   'stripe_secret_key',                   -- 金鑰名稱（必須唯一）
--   'Stripe Production Secret Key'         -- 說明
-- );
--
-- 回傳範例：c9b00867-ca8b-44fc-a81d-d20b8169be17 (UUID)
--
-- 方法 B：透過 Dashboard UI
--   1. 前往 Database > Vault
--   2. 點擊 New secret
--   3. 填入名稱、值、說明
--
-- ============================================
-- [操作 2] 記錄 Vault ID 到 payment_provider_configs
-- ============================================
--
-- payment_provider_configs 只儲存 Vault ID，不儲存實際金鑰：
--
-- UPDATE payment_provider_configs
-- SET vault_secret_id = 'c9b00867-ca8b-44fc-a81d-d20b8169be17'
-- WHERE provider = 'stripe';
--
-- ============================================
-- [操作 3] 讀取金鑰（僅 service_role）
-- ============================================
--
-- SELECT decrypted_secret 
-- FROM vault.decrypted_secrets 
-- WHERE name = 'stripe_secret_key';
--
-- 或用 UUID:
-- SELECT decrypted_secret 
-- FROM vault.decrypted_secrets 
-- WHERE id = 'c9b00867-ca8b-44fc-a81d-d20b8169be17';
--
-- ============================================
-- [操作 4] 更新金鑰
-- ============================================
--
-- SELECT vault.update_secret(
--   'c9b00867-ca8b-44fc-a81d-d20b8169be17',  -- 原 UUID
--   'sk_live_newkey',                         -- 新金鑰值
--   'stripe_secret_key',                      -- 名稱（可維持）
--   'Updated Stripe Key 2024-01'              -- 更新說明
-- );
--
-- ============================================
-- [操作 5] 刪除金鑰
-- ============================================
--
-- DELETE FROM vault.secrets 
-- WHERE id = 'c9b00867-ca8b-44fc-a81d-d20b8169be17';
--
-- ============================================
-- [查看所有金鑰]
-- ============================================
--
-- SELECT id, name, description, created_at 
-- FROM vault.decrypted_secrets;
--


-- ============================================
-- PART 7.5: Vault Secret Read RPC (for payment-io.ts)
-- ============================================
-- 
-- read_payment_secret: Read a secret from Vault by UUID
-- Called by lib/modules/shop/payment-io.ts to fetch payment provider secrets
--
-- Security:
-- - SECURITY DEFINER: executes with definer privileges
-- - Only service_role can access vault.decrypted_secrets
-- - Returns NULL if secret not found (safe fallback)
--
CREATE OR REPLACE FUNCTION public.read_payment_secret(p_vault_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT decrypted_secret 
  FROM vault.decrypted_secrets 
  WHERE id = p_vault_id;
$$;


-- ============================================
-- PART 7.6: Vault Secret Write RPCs (P0-4)
-- ============================================
--
-- store_payment_secret / update_payment_secret: Vault write operations
-- Called by lib/modules/shop/payment-io.ts to save payment provider secrets
--
-- Security:
-- - SECURITY DEFINER: executes with definer privileges
-- - service_role only (REVOKE/GRANT enforced below)
--
-- ============================================

-- Store a new secret in Vault and return its UUID (service_role only)
CREATE OR REPLACE FUNCTION public.store_payment_secret(
  p_name TEXT,
  p_secret TEXT,
  p_description TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  SELECT vault.create_secret(p_secret, p_name, p_description) INTO new_id;
  RETURN new_id;
END;
$$;

-- Update existing Vault secret value (service_role only)
-- Note: the app only provides vault_id + secret, so we reuse existing name/description.
CREATE OR REPLACE FUNCTION public.update_payment_secret(
  p_vault_id UUID,
  p_secret TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_name TEXT;
  existing_description TEXT;
BEGIN
  SELECT name, description
  INTO existing_name, existing_description
  FROM vault.decrypted_secrets
  WHERE id = p_vault_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  PERFORM vault.update_secret(p_vault_id, p_secret, existing_name, existing_description);
  RETURN TRUE;
END;
$$;


-- ============================================
-- PART 8: Atomic Order Creation (P0-2 Checkout Atomic)
-- ============================================

-- create_order_with_reservation: 原子化訂單建立 + 庫存保留 + 優惠券兌換
-- 設計考量：
--   1. 原子性：訂單 + 訂單明細 + 庫存保留 + 優惠券兌換在同一 transaction
--   2. 庫存驗證：檢查所有商品是否有足夠庫存
--   3. 優惠券整合：若提供 coupon_code，內部呼叫 redeem_coupon
--   4. 回傳訂單 ID 與折扣金額供後續處理
CREATE OR REPLACE FUNCTION public.create_order_with_reservation(
  p_user_id UUID,
  p_gateway TEXT,
  p_checkout_session_id TEXT,
  p_items JSONB,  -- [{"variant_id": UUID, "quantity": int, "unit_price_cents": int, "product_name_en": text, "product_name_zh": text, "variant_key": text, "option_values_json": jsonb, "sku": text}]
  p_recipient_name TEXT,
  p_recipient_phone TEXT,
  p_recipient_address TEXT,
  p_subtotal_cents INTEGER,
  p_total_cents INTEGER,
  p_recipient_note TEXT DEFAULT NULL,
  p_invoice_data JSONB DEFAULT NULL,
  p_coupon_code TEXT DEFAULT NULL,
  p_currency TEXT DEFAULT 'TWD',
  p_reserved_minutes INTEGER DEFAULT 30
) RETURNS TABLE (order_id UUID, discount_cents INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_order_id UUID;
  new_order_number TEXT;
  item_record JSONB;
  variant_stock INTEGER;
  v_variant_id UUID;
  item_quantity INTEGER;
  expires_timestamp TIMESTAMPTZ;
  coupon_result RECORD;
  final_discount_cents INTEGER := 0;
  final_total_cents INTEGER;
BEGIN
  -- 1. 驗證庫存
  FOR item_record IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_variant_id := (item_record->>'variant_id')::UUID;
    item_quantity := (item_record->>'quantity')::INTEGER;
    
    SELECT stock INTO variant_stock
    FROM product_variants
    WHERE id = v_variant_id
    FOR UPDATE;  -- 鎖定行以防止競態條件
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'variant_not_found: %', v_variant_id;
    END IF;
    
    IF variant_stock < item_quantity THEN
      RAISE EXCEPTION 'insufficient_stock: % (requested: %, available: %)', 
        v_variant_id, item_quantity, variant_stock;
    END IF;
  END LOOP;
  
  -- 2. 產生訂單編號
  new_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS-') || 
                      LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- 3. 計算保留過期時間
  expires_timestamp := NOW() + (p_reserved_minutes || ' minutes')::INTERVAL;
  
  -- 4. 建立訂單（先不含折扣，後續更新）
  INSERT INTO orders (
    order_number, user_id, gateway, gateway_transaction_id,
    status, subtotal_cents, discount_cents, total_cents, currency,
    coupon_code, recipient_name, recipient_phone, recipient_address,
    recipient_note, invoice_data
  ) VALUES (
    new_order_number, p_user_id, p_gateway, p_checkout_session_id,
    'pending_payment', p_subtotal_cents, 0, p_total_cents, p_currency,
    p_coupon_code, p_recipient_name, p_recipient_phone, p_recipient_address,
    p_recipient_note, p_invoice_data
  )
  RETURNING id INTO new_order_id;
  
  -- 5. 處理優惠券（若有提供）
  IF p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN
    SELECT * INTO coupon_result
    FROM public.redeem_coupon(p_coupon_code, new_order_id, p_user_id, p_subtotal_cents);
    
    IF NOT coupon_result.success THEN
      RAISE EXCEPTION 'coupon_error: %', coupon_result.error_code;
    END IF;
    
    final_discount_cents := coupon_result.discount_cents;
    final_total_cents := GREATEST(0, p_subtotal_cents - final_discount_cents);
    
    -- 更新訂單折扣與總額
    UPDATE orders
    SET discount_cents = final_discount_cents,
        total_cents = final_total_cents
    WHERE id = new_order_id;
  ELSE
    final_total_cents := p_total_cents;
  END IF;
  
  -- 6. 建立訂單明細和庫存保留
  FOR item_record IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_variant_id := (item_record->>'variant_id')::UUID;
    item_quantity := (item_record->>'quantity')::INTEGER;
    
    -- 插入訂單明細
    INSERT INTO order_items (
      order_id, variant_id, quantity, unit_price_cents, total_cents,
      product_name_en, product_name_zh, variant_key, option_values_json, sku
    ) VALUES (
      new_order_id,
      v_variant_id,
      item_quantity,
      (item_record->>'unit_price_cents')::INTEGER,
      item_quantity * (item_record->>'unit_price_cents')::INTEGER,
      item_record->>'product_name_en',
      item_record->>'product_name_zh',
      item_record->>'variant_key',
      (item_record->>'option_values_json')::JSONB,
      item_record->>'sku'
    );
    
    -- P0-3: 插入庫存保留 (含 order_id)
    INSERT INTO inventory_reservations (
      order_id, variant_id, quantity, gateway, checkout_session_id, user_id, expires_at
    ) VALUES (
      new_order_id, v_variant_id, item_quantity, p_gateway, p_checkout_session_id, p_user_id, expires_timestamp
    );
  END LOOP;
  
  RETURN QUERY SELECT new_order_id, final_discount_cents;
END;
$$;


-- ============================================
-- PART 9: Coupon Redemption Lock (P0-5 Step 3)
-- ============================================

-- redeem_coupon: 原子化優惠券兌換
-- 設計考量：
--   1. FOR UPDATE 鎖定：防止競態條件
--   2. 驗證：使用次數、有效期、最低消費
--   3. 原子性：驗證 + 使用記錄 + 計數更新在同一 transaction
CREATE OR REPLACE FUNCTION public.redeem_coupon(
  p_coupon_code TEXT,
  p_order_id UUID,
  p_user_id UUID,
  p_subtotal_cents INTEGER
) RETURNS TABLE (
  success BOOLEAN,
  discount_cents INTEGER,
  error_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coupon_record RECORD;
  calculated_discount INTEGER;
BEGIN
  -- 1. 查詢並鎖定優惠券
  SELECT * INTO coupon_record
  FROM coupons
  WHERE code = UPPER(p_coupon_code)
  FOR UPDATE;
  
  -- 2. 驗證優惠券存在
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'coupon_not_found'::TEXT;
    RETURN;
  END IF;
  
  -- 3. 驗證優惠券啟用
  IF NOT coupon_record.is_active THEN
    RETURN QUERY SELECT FALSE, 0, 'coupon_inactive'::TEXT;
    RETURN;
  END IF;
  
  -- 4. 驗證有效期
  IF coupon_record.starts_at IS NOT NULL AND NOW() < coupon_record.starts_at THEN
    RETURN QUERY SELECT FALSE, 0, 'coupon_not_started'::TEXT;
    RETURN;
  END IF;
  
  IF coupon_record.expires_at IS NOT NULL AND NOW() > coupon_record.expires_at THEN
    RETURN QUERY SELECT FALSE, 0, 'coupon_expired'::TEXT;
    RETURN;
  END IF;
  
  -- 5. 驗證使用次數上限
  IF coupon_record.max_usage_count IS NOT NULL 
     AND coupon_record.current_usage_count >= coupon_record.max_usage_count THEN
    RETURN QUERY SELECT FALSE, 0, 'coupon_usage_limit_reached'::TEXT;
    RETURN;
  END IF;
  
  -- 6. 驗證最低消費
  IF coupon_record.min_subtotal_cents IS NOT NULL 
     AND p_subtotal_cents < coupon_record.min_subtotal_cents THEN
    RETURN QUERY SELECT FALSE, 0, 'coupon_min_subtotal_not_met'::TEXT;
    RETURN;
  END IF;
  
  -- 7. 計算折扣金額
  IF coupon_record.type = 'amount' THEN
    calculated_discount := LEAST(coupon_record.value, p_subtotal_cents);
  ELSIF coupon_record.type = 'percentage' THEN
    calculated_discount := FLOOR(p_subtotal_cents * coupon_record.value / 100.0);
    IF coupon_record.max_discount_cents IS NOT NULL THEN
      calculated_discount := LEAST(calculated_discount, coupon_record.max_discount_cents);
    END IF;
  ELSE
    RETURN QUERY SELECT FALSE, 0, 'coupon_invalid_type'::TEXT;
    RETURN;
  END IF;
  
  -- 8. 確保折扣不超過小計
  calculated_discount := LEAST(calculated_discount, p_subtotal_cents);
  
  -- 9. 插入使用記錄
  INSERT INTO coupon_redemptions (coupon_id, order_id, user_id, discount_cents)
  VALUES (coupon_record.id, p_order_id, p_user_id, calculated_discount);
  
  -- 10. 更新使用計數
  UPDATE coupons
  SET current_usage_count = current_usage_count + 1, updated_at = NOW()
  WHERE id = coupon_record.id;
  
  RETURN QUERY SELECT TRUE, calculated_discount, NULL::TEXT;
END;
$$;


-- ============================================
-- PART 10: P0-5 Security - Lock SECURITY DEFINER Functions
-- ============================================
--
-- Critical security fix: All SECURITY DEFINER functions that
-- modify data or read secrets must be restricted to service_role.
--
-- ============================================

-- Payments / Vault
REVOKE ALL ON FUNCTION public.read_payment_secret(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_payment_secret(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.store_payment_secret(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_payment_secret(TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.update_payment_secret(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_payment_secret(UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.process_payment_success(UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_payment_success(UUID, TEXT, TEXT, JSONB) TO service_role;

-- Orders / Coupons
REVOKE ALL ON FUNCTION public.create_order_with_reservation(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, JSONB, TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_reservation(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, JSONB, TEXT, TEXT, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.redeem_coupon(TEXT, UUID, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(TEXT, UUID, UUID, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.release_expired_reservations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;


-- ============================================
-- 完成 DONE
-- ============================================
