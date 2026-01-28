-- ============================================
-- SEED: Events Type 預設資料 (Event Types)
-- ============================================
--
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-28
--
-- @see doc/meta/STEP_PLAN.md (PR-40)
-- @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-C5)
--
-- 說明：
-- - 插入預設活動類型（對應 hamburger nav IA）
-- - 類型包含：近期講座、療癒工作坊、企業內訓、合作邀請
--
-- ============================================


-- ============================================
-- PART 1: Event Types (活動類型)
-- ============================================

INSERT INTO public.event_types (slug, name_zh, sort_order, is_visible) VALUES
  ('talks', '近期講座', 1, true),
  ('workshops', '療癒工作坊', 2, true),
  ('corporate-training', '企業內訓', 3, true),
  ('collaboration', '合作邀請', 4, true)
ON CONFLICT (slug) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  sort_order = EXCLUDED.sort_order,
  is_visible = EXCLUDED.is_visible,
  updated_at = TIMEZONE('utc', NOW());


-- ============================================
-- 完成 DONE (Events Seed)
-- ============================================
