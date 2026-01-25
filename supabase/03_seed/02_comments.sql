-- ============================================
-- SEED: 留言系統預設資料 + 全站管理員 (Comments + Site Admins)
-- ============================================
-- 
-- 說明：
-- - PART 1-2: 留言系統設定 (審核模式、黑名單)
-- - PART 3: 全站管理員 (site_admins 控制整個後台權限)
-- - PART 4: 公開設定初始化
--
-- ⚠️ 重要: 請在 PART 3 設定您的管理員 email
-- site_admins 表控制的是整個網站的後台權限，
-- 包含：部落格、作品集、畫廊、商城、留言管理等所有功能！
--
-- ============================================


-- ============================================
-- PART 1: 預設設定
-- ============================================

INSERT INTO public.comment_settings (key, value) VALUES
('moderation_mode', 'auto'),
('max_links_before_moderation', '2'),
('enable_honeypot', 'true'),
('enable_akismet', 'true'),
('enable_recaptcha', 'false'),
('recaptcha_threshold', '0.5'),
('rate_limit_per_minute', '3'),
('max_content_length', '4000')
ON CONFLICT (key) DO NOTHING;


-- ============================================
-- PART 2: 預設黑名單
-- ============================================

INSERT INTO public.comment_blacklist (type, value, reason) VALUES
('keyword', 'viagra', 'Common spam'),
('keyword', 'cialis', 'Common spam'),
('keyword', 'casino', 'Common spam'),
('keyword', 'poker', 'Common spam'),
('keyword', 'cryptocurrency investment', 'Crypto scam'),
('keyword', 'make money fast', 'Scam')
ON CONFLICT (type, value) DO NOTHING;


-- ============================================
-- PART 3: 新增管理員 (Site Admins)
-- ============================================
-- 
-- ⚠️ 重要:
-- - 請勿在 seed 檔案中提交真實 email（避免資安/隱私風險）。
-- - 請在 owner/editor 使用者「先登入一次」建立 auth.users 後，手動新增 RBAC：
--
--   insert into public.site_admins (email, role)
--   values ('you@example.com', 'owner')
--   on conflict (email) do update
--   set role = excluded.role,
--       updated_at = timezone('utc', now());
--
-- - 然後該使用者登出再登入一次（刷新 JWT claims）。
--
-- 角色說明 (Role Description):
-- - owner: 最高權限，可管理所有內容與設定
-- - editor: 編輯權限，可管理內容但無法變更系統設定
--
-- ============================================

-- Intentionally no default admins here.


-- ============================================
-- PART 4: 初始化公開設定
-- ============================================

INSERT INTO public.comment_public_settings (key, value)
SELECT 'enable_recaptcha', COALESCE(
  (SELECT value FROM public.comment_settings WHERE key = 'enable_recaptcha'),
  'false'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = TIMEZONE('utc', NOW());

INSERT INTO public.comment_public_settings (key, value)
SELECT 'max_content_length', COALESCE(
  (SELECT value FROM public.comment_settings WHERE key = 'max_content_length'),
  '4000'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = TIMEZONE('utc', NOW());


-- ============================================
-- 完成 DONE
-- ============================================
