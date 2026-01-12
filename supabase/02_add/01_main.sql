-- ============================================
-- ADD: 主網站表格 (Main Website)
-- ============================================
-- 
-- 版本 Version: 3.1
-- 最後更新 Last Updated: 2025-12-16
--
-- 包含表格 TABLES:
-- - categories: 部落格分類 (雙語)
-- - posts: 部落格文章 (雙語)
-- - site_content: 網站區塊內容
-- - portfolio_items: 作品集
-- - services: 服務項目
-- - company_settings: 公司設定
-- - content_history: 變更歷史
-- - site_admins: 後台管理員 email（全域 admin gate）
--
-- ============================================


-- ============================================
-- PART 1: 建立表格 - 部落格
-- ============================================

CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en VARCHAR(100) NOT NULL,
  name_zh VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title_en VARCHAR(255),
  title_zh VARCHAR(255),
  slug VARCHAR(255) UNIQUE NOT NULL,
  content_en TEXT,
  content_zh TEXT,
  excerpt_en TEXT,
  excerpt_zh TEXT,
  cover_image_url TEXT,
  cover_image_url_en TEXT,
  cover_image_url_zh TEXT,
  cover_image_alt_en VARCHAR(500),
  cover_image_alt_zh VARCHAR(500),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  visibility VARCHAR(20) DEFAULT 'draft' CHECK (visibility IN ('draft', 'private', 'public')),
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  reading_time_minutes INTEGER DEFAULT NULL
);


-- ============================================
-- PART 2: 建立表格 - 網站內容
-- ============================================

CREATE TABLE site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key VARCHAR(100) UNIQUE NOT NULL,
  content_en JSONB NOT NULL,
  content_zh JSONB NOT NULL,
  is_published BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE portfolio_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sort_order INTEGER DEFAULT 0,
  title_en VARCHAR(255) NOT NULL,
  title_zh VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_zh TEXT,
  url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'development',
  badge_color VARCHAR(50) DEFAULT 'blue',
  is_featured BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sort_order INTEGER DEFAULT 0,
  title_en VARCHAR(255) NOT NULL,
  title_zh VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_zh TEXT,
  icon VARCHAR(100),
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value VARCHAR(500) NOT NULL,
  label_en VARCHAR(255),
  label_zh VARCHAR(255),
  category VARCHAR(50) DEFAULT 'general',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE content_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_value JSONB,
  new_value JSONB NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);


-- ============================================
-- PART 2.5: Admin Access Control
-- ============================================
--
-- Single source of truth for admin permissions across the whole app:
-- - Main website (posts/site_content/portfolio/services/settings/history)
-- - Comments/Gallery/Reports (see other SQL files)
--
-- Note: This table is also created in 02_add/02_comments.sql with IF NOT EXISTS.
-- We create it here so 01_main.sql policies can safely reference it.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.site_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL CHECK (email = LOWER(email)),
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);


-- ============================================
-- PART 2.6: Sync site_admins role to JWT claims
-- ============================================
--
-- This trigger syncs role changes in site_admins to auth.users.raw_app_meta_data
-- so that RLS policies can use JWT claims instead of subqueries for performance.
--
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_site_admin_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', NEW.role)
    WHERE LOWER(email) = LOWER(NEW.email);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) - 'role'
    WHERE LOWER(email) = LOWER(OLD.email);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_site_admin_update ON public.site_admins;

CREATE TRIGGER on_site_admin_update
AFTER INSERT OR UPDATE OR DELETE ON public.site_admins
FOR EACH ROW EXECUTE FUNCTION public.handle_site_admin_changes();


-- ============================================
-- PART 2.7: Global Cache Versioning
-- ============================================
--
-- Singleton table for system-wide cache version.
-- Used by lib/cache/wrapper.ts to invalidate all cached queries.
-- Only accessible via service_role (no RLS policies).
--
-- ============================================

CREATE TABLE IF NOT EXISTS system_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cache_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

INSERT INTO system_settings (id, cache_version)
VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read for build-time SSG/SSR
CREATE POLICY "Anyone can read system settings"
  ON system_settings FOR SELECT
  TO anon, authenticated
  USING (true);


-- ============================================
-- PART 2.8: Cache Version Increment RPC
-- ============================================
--
-- Atomically increment the global cache version.
-- Used by lib/system/cache-io.ts to invalidate all cached queries.
-- SECURITY DEFINER to allow authenticated users to call via service role proxy.
--
-- ============================================

CREATE OR REPLACE FUNCTION public.increment_cache_version()
RETURNS TABLE(cache_version INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_version INTEGER;
BEGIN
  UPDATE system_settings
  SET cache_version = system_settings.cache_version + 1,
      updated_at = TIMEZONE('utc', NOW())
  WHERE id = 1
  RETURNING system_settings.cache_version INTO new_version;

  RETURN QUERY SELECT new_version;
END;
$$;

-- P0-5 Security: Lock down SECURITY DEFINER function
REVOKE ALL ON FUNCTION public.increment_cache_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_cache_version() TO service_role;


-- ============================================
-- PART 2.9: Audit Logs (Unified)
-- ============================================
--
-- Unified audit log table for all admin operations.
-- Replaces shop_audit_logs for consistency.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  actor_email TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can create audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Owners can read audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');

GRANT INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;


-- ============================================
-- PART 3: 建立索引
-- ============================================

CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX idx_posts_category_id ON posts(category_id);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_site_content_section ON site_content(section_key);
CREATE INDEX idx_site_content_published ON site_content(is_published);
CREATE INDEX idx_portfolio_items_sort ON portfolio_items(sort_order);
CREATE INDEX idx_portfolio_items_visible ON portfolio_items(is_visible);
CREATE INDEX idx_services_sort ON services(sort_order);
CREATE INDEX idx_services_visible ON services(is_visible);
CREATE INDEX idx_company_settings_key ON company_settings(key);
CREATE INDEX idx_company_settings_category ON company_settings(category);
CREATE INDEX idx_content_history_lookup ON content_history(content_type, content_id, changed_at DESC);
CREATE INDEX idx_content_history_time ON content_history(changed_at DESC);


-- ============================================
-- PART 4: 啟用 RLS
-- ============================================

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_admins ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 5: 建立 RLS Policies
-- ============================================

-- Users can see their own admin row (so UI can detect role-sync status)
CREATE POLICY "Users can read own admin row"
  ON public.site_admins FOR SELECT
  TO authenticated
  USING (email = LOWER(auth.jwt() ->> 'email'));

-- Owner can see the full list (admin access management page)
CREATE POLICY "Owners can read all admins"
  ON public.site_admins FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');

-- Owner can manage admin list (insert/update/delete)
CREATE POLICY "Owners can manage admins"
  ON public.site_admins FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');

CREATE POLICY "Anyone can read public posts" 
  ON posts FOR SELECT
  TO anon, authenticated
  USING (visibility = 'public');

CREATE POLICY "Admins can manage posts"
  ON posts FOR ALL 
  TO authenticated 
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Anyone can read categories" 
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL 
  TO authenticated 
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Anyone can read published content" 
  ON site_content FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Admins can manage site content"
  ON site_content FOR ALL 
  TO authenticated 
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Anyone can read visible portfolio items" 
  ON portfolio_items FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

CREATE POLICY "Admins can manage portfolio items"
  ON portfolio_items FOR ALL 
  TO authenticated 
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Anyone can read visible services" 
  ON services FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

CREATE POLICY "Admins can manage services"
  ON services FOR ALL 
  TO authenticated 
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Anyone can read company settings" 
  ON company_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage company settings"
  ON company_settings FOR ALL 
  TO authenticated 
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Admins can read content history"
  ON content_history FOR SELECT 
  TO authenticated 
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Admins can create content history"
  ON content_history FOR INSERT 
  TO authenticated 
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );


-- ============================================
-- PART 6: Grant Permissions (Table-level access)
-- ============================================
--
-- Required for anon role to read tables during SSG/SSR build.
-- RLS policies control WHICH rows are visible; GRANT controls table access.
--
-- ============================================

GRANT SELECT ON public.posts TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT SELECT ON public.portfolio_items TO anon, authenticated;
GRANT SELECT ON public.services TO anon, authenticated;
GRANT SELECT ON public.company_settings TO anon, authenticated;
GRANT SELECT ON public.system_settings TO anon, authenticated;

-- Admin write permissions (required alongside RLS policies)
GRANT INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT INSERT ON public.content_history TO authenticated;

-- site_admins permissions (for admin access management)
GRANT SELECT ON public.site_admins TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_admins TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================
