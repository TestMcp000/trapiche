-- ============================================
-- SEED: 主題配置預設資料 (Theme/Site Config)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-23
--
-- 說明：插入預設主題配置（確保永遠有 id=1）
-- 此檔案為必要，確保 Singleton row 存在
--
-- ============================================


-- ============================================
-- PART 1: 初始化 site_config (Singleton)
-- ============================================
-- 
-- 使用 ON CONFLICT 確保冪等性
-- 若 id=1 已存在則不做任何事
--
-- ============================================

INSERT INTO public.site_config (id, global_theme, page_themes, theme_overrides, preprocessing_config)
VALUES (
  1,
  'tech-pro',
  '{}'::jsonb,
  '{}'::jsonb,
  '{
    "product": {
      "chunking": { "targetSize": 300, "overlap": 45, "splitBy": "semantic", "minSize": 64, "maxSize": 600, "useHeadingsAsBoundary": true }
    },
    "post": {
      "chunking": { "targetSize": 500, "overlap": 75, "splitBy": "semantic", "minSize": 128, "maxSize": 1000, "useHeadingsAsBoundary": true }
    },
    "gallery_item": {
      "chunking": { "targetSize": 128, "overlap": 20, "splitBy": "sentence", "minSize": 32, "maxSize": 256, "useHeadingsAsBoundary": false }
    },
    "comment": {
      "chunking": { "targetSize": 128, "overlap": 0, "splitBy": "sentence", "minSize": 16, "maxSize": 256, "useHeadingsAsBoundary": false }
    }
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- 完成 DONE
-- ============================================
