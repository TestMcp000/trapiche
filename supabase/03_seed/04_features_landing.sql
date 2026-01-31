-- ============================================
-- SEED: 功能設定與 Landing Sections
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-21
--
-- 說明：
-- 1. 初始化功能開關（all disabled by default）
-- 2. 初始化 Landing Page 預設區塊
--
-- ============================================


-- ============================================
-- PART 1: 功能開關 (Feature Settings)
-- ============================================
-- Default: enable blog + gallery for this project

INSERT INTO feature_settings (feature_key, is_enabled, display_order, description_en, description_zh) VALUES
  ('blog', true, 1, 'Blog posts and articles section', '部落格文章區塊'),
  ('gallery', true, 2, 'Pinterest-style image gallery', 'Pinterest 風格圖片畫廊')
ON CONFLICT (feature_key) DO NOTHING;


-- ============================================
-- PART 2: Landing Sections 預設區塊
-- ============================================
-- These are the preset sections with fixed section_keys.
-- Content for most preset sections comes from external sources (site_content, services, etc.).
-- Only custom sections store their content in content_en/zh.

INSERT INTO landing_sections (section_key, section_type, sort_order, title_en, title_zh, is_visible) VALUES
  ('hero', 'text_image', 0, 'Welcome', '歡迎', true),
  ('about', 'text_image', 1, 'About Us', '關於我們', true),
  ('services', 'cards', 2, 'Our Services', '我們的服務', true),
  ('platforms', 'cards', 3, 'Platforms', '平台', true),
  ('product_design', 'gallery', 4, 'Product Design', '產品設計', true),
  ('portfolio', 'gallery', 5, 'Portfolio', '專案作品', true),
  ('contact', 'cta', 99, 'Contact Us', '聯繫我們', true)
ON CONFLICT (section_key) DO NOTHING;


-- ============================================
-- 完成 DONE
-- ============================================
