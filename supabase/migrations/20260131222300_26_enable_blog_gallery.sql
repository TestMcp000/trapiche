-- ============================================
-- MIGRATION: Enable Blog + Gallery (Default ON)
-- Version: 1.0
-- Date: 2026-01-31
-- ============================================
--
-- This project expects Blog + Gallery to be visible by default
-- (Hamburger nav + routes). Turn them on and ensure rows exist.
--
-- ============================================

INSERT INTO public.feature_settings (feature_key, is_enabled, display_order, description_en, description_zh)
VALUES
  ('blog', true, 1, 'Blog posts and articles section', '部落格文章區塊'),
  ('gallery', true, 2, 'Pinterest-style image gallery', 'Pinterest 風格圖片畫廊')
ON CONFLICT (feature_key) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  display_order = EXCLUDED.display_order,
  description_en = EXCLUDED.description_en,
  description_zh = EXCLUDED.description_zh,
  updated_at = TIMEZONE('utc', NOW());

