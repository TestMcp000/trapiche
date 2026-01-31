-- ============================================
-- ADD: Theme/Site Config Table
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-23
--
-- 說明: 主題配置 Singleton 表
-- 使用 id=1 CHECK 約束確保只有單一 row
-- 
-- 包含 TABLES:
-- - site_config: 全站主題配置
--
-- ============================================


-- ============================================
-- PART 1: 建立表格 (Singleton Pattern)
-- ============================================

CREATE TABLE IF NOT EXISTS public.site_config (
  -- Singleton: 只允許 id=1
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- 全站主題設定
  global_theme TEXT NOT NULL DEFAULT 'tech-pro',

  -- 分頁主題（JSONB: { "home": "tech-pro", "blog": "japanese-airy", ... }）
  page_themes JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- [Theme v2] 每個 Layout 獨立的 token 自訂
  -- 結構: { [ThemeKey]: { [cssVarKey]: string | null } }
  -- 範例: { "tech-pro": { "--theme-accent": "#FF0000" }, "glassmorphism": { "--theme-radius": "20px" } }
  -- Merge priority: preset vars → theme_overrides[themeKey]（base）→ derived Tailwind vars → theme_overrides[themeKey]（derived overrides）
  -- 白名單 keys 定義於 lib/types/theme.ts (CUSTOMIZABLE_CSS_VARS)
  theme_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- [Phase 7] Preprocessing configuration (DB SSOT)
  -- 結構: { [EmbeddingTargetType]: { chunking?: ChunkingConfig, quality?: QualityGateConfig } }
  -- Merge priority: code defaults (CHUNKING_CONFIGS) → preprocessing_config overrides
  preprocessing_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 更新追蹤
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_by UUID REFERENCES auth.users(id)
);


-- ============================================
-- PART 2: 建立索引
-- ============================================
-- Singleton 表不需要額外索引


-- ============================================
-- PART 3: 啟用 RLS
-- ============================================

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: 建立 RLS Policies
-- ============================================

-- Public read (SSR 需要 anon 讀取)
CREATE POLICY "Public can read site config"
ON public.site_config FOR SELECT
TO anon, authenticated
USING (true);

-- Owner-only write (Editor 不可改主題配置)
CREATE POLICY "Owner can manage site config"
ON public.site_config FOR ALL
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
);


-- ============================================
-- PART 5: Grant Permissions (Table-level access)
-- ============================================
-- 
-- Required for anon role to read during SSG/SSR build.
-- RLS policies control WHICH rows are visible; GRANT controls table access.
--
-- ============================================

GRANT SELECT ON public.site_config TO anon, authenticated;
GRANT UPDATE ON public.site_config TO authenticated;


-- ============================================
-- Note: Seed data is in 03_seed/07_theme.sql
-- ============================================


-- ============================================
-- DONE
-- ============================================
