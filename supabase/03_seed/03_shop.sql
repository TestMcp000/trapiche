-- ============================================
-- SEED: 電商預設資料 (Shop / E-Commerce)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-19
--
-- 說明：插入商城預設設定
-- 此檔案為可選，可依需求修改
--
-- ============================================


-- ============================================
-- PART 1: 初始化商城設定 (singleton)
-- ============================================

INSERT INTO shop_settings (
  reserved_ttl_minutes,
  invoice_config_mode,
  invoice_toggles_json
) VALUES (
  30,     -- 庫存保留 30 分鐘
  'toggles',
  '{"taxId": false, "mobileCarrier": false, "citizenCert": false}'::jsonb
);


-- ============================================
-- PART 2: 初始化金流設定（預設關閉）
-- ============================================

INSERT INTO payment_provider_configs (gateway, is_enabled, is_test_mode, validation_status)
VALUES 
  ('stripe', false, true, 'pending'),
  ('linepay', false, true, 'pending'),
  ('ecpay', false, true, 'pending');


-- ============================================
-- 完成 DONE
-- ============================================
