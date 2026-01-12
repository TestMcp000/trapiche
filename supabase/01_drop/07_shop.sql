-- ============================================
-- DROP: 電商表格 (Shop / E-commerce)
-- ============================================
-- 
-- 版本 Version: 2.0
-- 最後更新 Last Updated: 2025-12-20
--
-- 整合內容：
-- - 函數刪除
-- - Webhook / 審計表刪除
-- - 會員資料表刪除
-- - 核心表格刪除
--
-- 注意：按照依賴順序刪除（函數 → 附屬表 → 核心表）
--
-- ============================================


-- ============================================
-- PART 1: 刪除函數
-- ============================================

-- Coupon Redemption Lock（P0-5 Step 3）
DROP FUNCTION IF EXISTS public.redeem_coupon(TEXT, UUID, UUID, INTEGER);

-- Atomic Order Creation（P0-2 Checkout Atomic）
DROP FUNCTION IF EXISTS public.create_order_with_reservation(
  UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER, INTEGER, TEXT, INTEGER
);

-- Vault Helper Functions（P0-5 Step 1）
DROP FUNCTION IF EXISTS public.store_payment_secret(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.read_payment_secret(UUID);
DROP FUNCTION IF EXISTS public.update_payment_secret(UUID, TEXT);
DROP FUNCTION IF EXISTS public.delete_payment_secret(UUID);

-- 公開可見性檢查函數（P0-4）
DROP FUNCTION IF EXISTS public.is_shop_visible() CASCADE;

-- 公開設定讀取函數（P1-2）
DROP FUNCTION IF EXISTS public.get_shop_settings_public();

-- 支付成功處理函數（Phase 1）
DROP FUNCTION IF EXISTS process_payment_success(UUID, TEXT, TEXT, JSONB);

-- 釋放逾時庫存函數（P4-1 TTL）
DROP FUNCTION IF EXISTS release_expired_reservations();


-- ============================================
-- PART 2: 刪除 Webhook 與審計表
-- ============================================

-- 支付審計日誌（Phase 1）
DROP TABLE IF EXISTS payment_audit_logs;

-- Webhook 事件記錄（PS1-2 Idempotency）
DROP TABLE IF EXISTS webhook_events;


-- ============================================
-- PART 3: 刪除會員資料表
-- ============================================

-- 會員資料（CRM）
DROP TABLE IF EXISTS customer_profiles;
-- Sequence for short_id (must drop after table)
DROP SEQUENCE IF EXISTS customer_profiles_short_id_seq;


-- ============================================
-- PART 4: 刪除核心表格（反向依賴順序）
-- ============================================

-- 操作日誌 (removed - using audit_logs in 01_main.sql)
-- DROP TABLE IF EXISTS shop_audit_logs;

-- 金流設定
DROP TABLE IF EXISTS payment_provider_configs;

-- 優惠券使用記錄（依賴 coupons + orders）
DROP TABLE IF EXISTS coupon_redemptions;

-- 優惠券
DROP TABLE IF EXISTS coupons;

-- 訂單明細（依賴 orders）
DROP TABLE IF EXISTS order_items;

-- 訂單
DROP TABLE IF EXISTS orders;

-- 庫存保留（依賴 product_variants）
DROP TABLE IF EXISTS inventory_reservations;

-- 商品變體（依賴 products）
DROP TABLE IF EXISTS product_variants;

-- 商品
DROP TABLE IF EXISTS products;

-- 商城設定
DROP TABLE IF EXISTS shop_settings;

-- Vault 擴充（P0-5）
-- 注意：不 DROP extension 以避免刪除其他可能使用 Vault 的資料
-- DROP EXTENSION IF EXISTS supabase_vault;


-- ============================================
-- 完成 DONE
-- ============================================
