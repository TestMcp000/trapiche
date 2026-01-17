-- ============================================
-- ADD: 主網站表格 (Main Website)
-- ============================================
-- 
-- 版本 Version: 3.1
-- 最後更新 Last Updated: 2025-12-16
--
-- 包含表格 TABLES:
-- - categories: 部落格分類（單語：zh；en 欄位保留 legacy）
-- - posts: 部落格文章（單語：zh；en 欄位保留 legacy）
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
-- ============================================
-- ADD: Comments (Multi-target)
-- Version: 3.0
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comment_target_type') THEN
    CREATE TYPE public.comment_target_type AS ENUM ('post', 'gallery_item');
  END IF;
END$$;

-- P0-6: Sensitive fields moved to comment_moderation table
-- user_email, ip_hash, spam_score, spam_reason, link_count -> comment_moderation
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type public.comment_target_type NOT NULL,
  target_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_display_name VARCHAR(255) NOT NULL,
  user_avatar_url TEXT,
  -- P0-6: user_email REMOVED (in comment_moderation)
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  is_spam BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  -- P0-6: spam_score, spam_reason, ip_hash, link_count REMOVED (in comment_moderation)
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.comment_blacklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('keyword', 'ip', 'email', 'domain')),
  value TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(type, value)
);

-- Note: site_admins table is defined in 01_main.sql (single source of truth)

CREATE TABLE IF NOT EXISTS public.comment_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.comment_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  target_type public.comment_target_type NOT NULL,
  target_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.spam_decision_log (
  id BIGSERIAL PRIMARY KEY,
  comment_id UUID,
  target_type public.comment_target_type,
  target_id UUID,
  decision VARCHAR(20),
  reason TEXT,
  link_count INTEGER,
  akismet_tip TEXT,
  recaptcha_score DECIMAL(3,2),
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.comment_public_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- Comment Moderation Table (Sensitive Data)
-- Phase 5: Separate moderation data for admin-only access
-- ============================================
CREATE TABLE IF NOT EXISTS public.comment_moderation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_email VARCHAR(255),
  ip_hash VARCHAR(64),
  spam_score DECIMAL(3,2),
  spam_reason TEXT,
  link_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(comment_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_target_approved ON public.comments(target_type, target_id, is_approved, is_spam);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.comment_rate_limits(ip_hash, target_type, target_id, window_start);
CREATE INDEX IF NOT EXISTS idx_blacklist_lookup ON public.comment_blacklist(type, value);
CREATE INDEX IF NOT EXISTS idx_spam_log_created ON public.spam_decision_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_moderation_comment ON public.comment_moderation(comment_id);

-- RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spam_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_public_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_moderation ENABLE ROW LEVEL SECURITY;

-- Policies: public read approved
CREATE POLICY "Anyone can read approved comments"
  ON public.comments FOR SELECT
  TO anon, authenticated
  USING (is_approved = true AND is_spam = false);

-- Policies: authenticated insert/update/delete own
CREATE POLICY "Auth users can insert own comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies: admin full access
CREATE POLICY "Admin full access to comments"
  ON public.comments FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- Blacklist is admin-only (Phase 5: no public read)
CREATE POLICY "Admins can manage comment blacklist"
  ON public.comment_blacklist FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Authenticated can read comment settings"
  ON public.comment_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage comment settings"
  ON public.comment_settings FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- Rate limits are server-only (Phase 5: no RLS policy for authenticated)
-- Operations use createAdminClient() in lib/modules/comment/admin-io.ts
-- No policy = service_role only

-- Spam log insert is server-only (Phase 5: via createAdminClient)
-- No authenticated INSERT policy = service_role only

CREATE POLICY "Admins can read spam log"
  ON public.spam_decision_log FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Admins can update spam log"
  ON public.spam_decision_log FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Admins can delete spam log"
  ON public.spam_decision_log FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Anyone can read comment admins"
  ON public.site_admins FOR SELECT
  TO authenticated
  USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));

CREATE POLICY "Anyone can read public settings"
  ON public.comment_public_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage public settings"
  ON public.comment_public_settings FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- Moderation data is admin-only (Phase 5)
CREATE POLICY "Admins can manage comment moderation"
  ON public.comment_moderation FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- ============================================
-- GRANT Permissions for Comments Tables
-- ============================================
-- RLS policies control WHICH rows; GRANT controls table-level access.
-- Without GRANT, PostgreSQL denies access before RLS is even evaluated.

-- 1. comments: anon can read approved, authenticated can CRUD own (RLS enforces ownership)
GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments TO authenticated;

-- 2. comment_public_settings: public read, admin write (RLS enforces admin)
GRANT SELECT ON public.comment_public_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comment_public_settings TO authenticated;

-- 3. comment_settings: authenticated read, admin write (RLS enforces admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_settings TO authenticated;

-- 4. comment_blacklist: admin-only (RLS enforces admin check)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_blacklist TO authenticated;

-- 5. spam_decision_log: admin read/update/delete, INSERT via service_role only
GRANT SELECT, UPDATE, DELETE ON public.spam_decision_log TO authenticated;

-- 6. comment_moderation: admin-only (RLS enforces admin check)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_moderation TO authenticated;

-- 7. comment_rate_limits: NO GRANT (server-only via createAdminClient)
-- ============================================
-- ADD: 報告系統表格 (Reports)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-16
--
-- ⚠️ 依賴: 需要先執行 02_add/02_comments.sql (site_admins 表)
--
-- 包含表格 TABLES:
-- - reports: 自動檢測報告 (Lighthouse/Linkinator/Schema)
--
-- ============================================


-- ============================================
-- PART 1: 建立表格
-- ============================================

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('lighthouse', 'schema', 'links')),
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed')),
  summary JSONB,
  report_url TEXT,
  error TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);


-- ============================================
-- PART 2: 建立索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);


-- ============================================
-- PART 3: 啟用 RLS
-- ============================================

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: 建立 RLS Policies
-- ============================================

CREATE POLICY "Admins can manage reports"
  ON public.reports FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );


-- ============================================
-- PART 5: Grant Permissions (Table-level access)
-- ============================================
-- RLS policies control WHICH rows; GRANT controls table-level access.
-- Without GRANT, PostgreSQL denies access before RLS is even evaluated.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================
-- ============================================
-- ADD: Gallery Tables (Pinterest-style)
-- Version: 1.0
-- ============================================

CREATE TABLE IF NOT EXISTS public.gallery_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name_en VARCHAR(120) NOT NULL,
  name_zh VARCHAR(120) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.gallery_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.gallery_categories(id) ON DELETE RESTRICT,
  title_en VARCHAR(255) NOT NULL,
  title_zh VARCHAR(255) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_zh TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  image_width INTEGER,
  image_height INTEGER,
  og_image_format TEXT NOT NULL DEFAULT 'jpg' CHECK (og_image_format IN ('jpg','png')),
  image_alt_en VARCHAR(500),
  image_alt_zh VARCHAR(500),
  material_en VARCHAR(200),
  material_zh VARCHAR(200),
  tags_en TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  tags_zh TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  is_visible BOOLEAN NOT NULL DEFAULT true,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(category_id, slug)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gallery_pin_surface') THEN
    CREATE TYPE public.gallery_pin_surface AS ENUM ('home', 'gallery');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.gallery_pins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  surface public.gallery_pin_surface NOT NULL,
  item_id UUID NOT NULL REFERENCES public.gallery_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(surface, item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gallery_categories_visible_sort ON public.gallery_categories(is_visible, sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_items_category_visible_created ON public.gallery_items(category_id, is_visible, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_items_visible_created ON public.gallery_items(is_visible, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_items_visible_like_created ON public.gallery_items(is_visible, like_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_items_tags_en ON public.gallery_items USING GIN(tags_en);
CREATE INDEX IF NOT EXISTS idx_gallery_items_tags_zh ON public.gallery_items USING GIN(tags_zh);
CREATE INDEX IF NOT EXISTS idx_gallery_pins_surface_order ON public.gallery_pins(surface, sort_order);

-- RLS
ALTER TABLE public.gallery_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_pins ENABLE ROW LEVEL SECURITY;

-- Public read: only visible categories/items, and pins whose item is visible
CREATE POLICY "Anyone can read visible gallery categories"
  ON public.gallery_categories FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

CREATE POLICY "Anyone can read visible gallery items"
  ON public.gallery_items FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

CREATE POLICY "Anyone can read gallery pins for visible items"
  ON public.gallery_pins FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gallery_items gi
      WHERE gi.id = item_id AND gi.is_visible = true
    )
  );

-- Admin manage: email in site_admins
CREATE POLICY "Admins can manage gallery categories"
  ON public.gallery_categories FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Admins can manage gallery items"
  ON public.gallery_items FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Admins can manage gallery pins"
  ON public.gallery_pins FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- Table-level permissions (required for RLS policies to take effect)
-- Without these, anon/authenticated users cannot SELECT even with valid RLS policies
GRANT SELECT ON public.gallery_categories TO anon, authenticated;
GRANT SELECT ON public.gallery_items TO anon, authenticated;
GRANT SELECT ON public.gallery_pins TO anon, authenticated;

-- Admin write permissions (RLS enforces owner/editor check)
GRANT INSERT, UPDATE, DELETE ON public.gallery_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_pins TO authenticated;

-- ============================================
-- ADD: Reactions (Anonymous Like)
-- Version: 1.0
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reaction_target_type') THEN
    CREATE TYPE public.reaction_target_type AS ENUM ('gallery_item', 'comment');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type public.reaction_target_type NOT NULL,
  target_id UUID NOT NULL,
  anon_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(target_type, target_id, anon_id)
);

CREATE TABLE IF NOT EXISTS public.reaction_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reactions_target ON public.reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reactions_anon ON public.reactions(anon_id);
CREATE INDEX IF NOT EXISTS idx_reaction_rate_limits_lookup ON public.reaction_rate_limits(ip_hash, window_start);

-- RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reaction_rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Reactions RLS Policies
-- ============================================
-- Design: Reaction writes happen server-side via service_role (to enforce rate limits and cookie-based anon_id).
-- Like counts are denormalized into gallery_items/comments via triggers; raw reactions are not public.

-- Reactions are mutated via server-only API (service_role) to enforce rate limits and anon_id cookie checks.
-- Keep raw reaction rows private; admins can read for debugging.
CREATE POLICY "Admins can read reactions"
  ON public.reactions FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- Rate limits are server-only (no RLS policy = service_role only)
CREATE POLICY "Admins can read reaction rate limits"
  ON public.reaction_rate_limits FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- ============================================
-- GRANT Permissions for Reactions Tables
-- ============================================
-- RLS policies control WHICH rows; GRANT controls table-level access.

-- 1. reactions: admin read only (mutations via service_role)
GRANT SELECT ON public.reactions TO authenticated;

-- 2. reaction_rate_limits: NO GRANT for public (server-only via createAdminClient)
-- Admin can read via RLS policy above
GRANT SELECT ON public.reaction_rate_limits TO authenticated;

-- ============================================
-- ADD: Cross-table Triggers (likes + cleanup)
-- Version: 1.0
-- Requires: posts, gallery_items, comments, reactions
-- ============================================

-- 1) Keep like_count in sync for gallery_items / comments
CREATE OR REPLACE FUNCTION public.fn_apply_like_delta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  delta INTEGER := 0;
  t public.reaction_target_type;
  tid UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := 1;
    t := NEW.target_type;
    tid := NEW.target_id;
  ELSIF TG_OP = 'DELETE' THEN
    delta := -1;
    t := OLD.target_type;
    tid := OLD.target_id;
  ELSE
    RETURN NULL;
  END IF;

  IF t = 'gallery_item' THEN
    UPDATE public.gallery_items
      SET like_count = GREATEST(like_count + delta, 0),
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = tid;
  ELSIF t = 'comment' THEN
    UPDATE public.comments
      SET like_count = GREATEST(like_count + delta, 0),
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = tid;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reactions_like_insert ON public.reactions;
CREATE TRIGGER trg_reactions_like_insert
AFTER INSERT ON public.reactions
FOR EACH ROW
EXECUTE FUNCTION public.fn_apply_like_delta();

DROP TRIGGER IF EXISTS trg_reactions_like_delete ON public.reactions;
CREATE TRIGGER trg_reactions_like_delete
AFTER DELETE ON public.reactions
FOR EACH ROW
EXECUTE FUNCTION public.fn_apply_like_delta();

-- 2) Cleanup reactions when a comment is deleted
CREATE OR REPLACE FUNCTION public.fn_cleanup_reactions_on_comment_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.reactions
    WHERE target_type = 'comment' AND target_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_cleanup_reactions ON public.comments;
CREATE TRIGGER trg_comments_cleanup_reactions
AFTER DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.fn_cleanup_reactions_on_comment_delete();

-- 3) Cleanup comments + reactions when a post is deleted (polymorphic FK workaround)
CREATE OR REPLACE FUNCTION public.fn_cleanup_on_post_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- delete reactions for comments that belong to this post
  DELETE FROM public.reactions r
  USING public.comments c
  WHERE r.target_type = 'comment'
    AND r.target_id = c.id
    AND c.target_type = 'post'
    AND c.target_id = OLD.id;

  -- delete comments
  DELETE FROM public.comments
    WHERE target_type = 'post' AND target_id = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_posts_cleanup_comments_reactions ON public.posts;
CREATE TRIGGER trg_posts_cleanup_comments_reactions
AFTER DELETE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.fn_cleanup_on_post_delete();

-- 4) Cleanup comments + reactions when a gallery_item is deleted
CREATE OR REPLACE FUNCTION public.fn_cleanup_on_gallery_item_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- delete reactions on the gallery item itself
  DELETE FROM public.reactions
    WHERE target_type = 'gallery_item' AND target_id = OLD.id;

  -- delete reactions for comments that belong to this gallery item
  DELETE FROM public.reactions r
  USING public.comments c
  WHERE r.target_type = 'comment'
    AND r.target_id = c.id
    AND c.target_type = 'gallery_item'
    AND c.target_id = OLD.id;

  -- delete comments
  DELETE FROM public.comments
    WHERE target_type = 'gallery_item' AND target_id = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_gallery_items_cleanup_comments_reactions ON public.gallery_items;
CREATE TRIGGER trg_gallery_items_cleanup_comments_reactions
AFTER DELETE ON public.gallery_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_cleanup_on_gallery_item_delete();
-- ============================================
-- ADD: Feature Settings Table (Centralized Feature Toggles)
-- Version: 1.0
-- Last Updated: 2025-12-21
-- ============================================
--
-- This table provides centralized control for enabling/disabling
-- major site features (blog, gallery).
--
-- Security: Only 'owner' role can modify feature settings.
-- Default: All features disabled until explicitly enabled.
--
-- ============================================

-- Create feature_settings table
CREATE TABLE IF NOT EXISTS public.feature_settings (
  feature_key TEXT PRIMARY KEY,                -- 'blog', 'gallery'
  is_enabled BOOLEAN NOT NULL DEFAULT false,   -- All features disabled by default
  display_order INTEGER NOT NULL DEFAULT 0,    -- Order in admin UI
  description_en TEXT,                         -- Description for admin UI
  description_zh TEXT,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_feature_settings_enabled 
ON public.feature_settings(is_enabled);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE public.feature_settings ENABLE ROW LEVEL SECURITY;

-- Public can read all feature settings (needed for Header/Footer)
CREATE POLICY "Public can read feature settings"
ON public.feature_settings FOR SELECT
TO anon, authenticated
USING (true);

-- Only owner can modify feature settings (not editor)
CREATE POLICY "Owner can manage feature settings"
ON public.feature_settings FOR ALL
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
);

-- Grants: allow read for public/clients, write for authenticated (RLS limits to owner)
GRANT SELECT ON public.feature_settings TO anon, authenticated;
GRANT UPDATE ON public.feature_settings TO authenticated;

-- ============================================
-- RPC Function for Feature Check
-- ============================================
-- Security definer function for efficient feature checks

CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM feature_settings WHERE feature_key = p_feature_key),
    false
  );
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(TEXT) TO anon, authenticated;

-- ============================================
-- DONE
-- ============================================
-- ============================================
-- ADD: Landing Sections Table (Dynamic Landing Page)
-- Version: 1.0
-- ============================================
--
-- This table manages the landing page sections including preset sections
-- (hero, about, services, platforms, product_design, portfolio, contact)
-- and custom sections (custom_1...custom_10).
--
-- Content Source Rules:
-- - Preset sections: content comes from external sources (site_content, services, portfolio_items, gallery)
-- - Custom sections: content stored in content_en/zh JSONB columns
--
-- ============================================

-- Create landing_sections table
CREATE TABLE IF NOT EXISTS public.landing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL,           -- 'hero', 'about', 'services', 'portfolio', 'custom_1'...'custom_10'
  section_type TEXT NOT NULL DEFAULT 'text',  -- Block type (preset sections have fixed types)
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,

  -- Localized content (for section titles/subtitles and custom block content)
  title_en TEXT,
  title_zh TEXT,
  subtitle_en TEXT,
  subtitle_zh TEXT,
  content_en JSONB,                           -- Type-specific content for custom blocks
  content_zh JSONB,

  -- Gallery integration (for gallery type blocks)
  gallery_category_id UUID REFERENCES public.gallery_categories(id) ON DELETE SET NULL,
  gallery_surface TEXT,                       -- For featured pins ('home' | 'gallery')

  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),

  -- Constraints
  CONSTRAINT valid_section_type CHECK (
    section_type IN ('text', 'text_image', 'cards', 'gallery', 'cta')
  ),
  CONSTRAINT valid_gallery_surface CHECK (
    gallery_surface IS NULL OR gallery_surface IN ('home', 'gallery')
  )
);

-- Index for efficient public queries (visible sections sorted)
CREATE INDEX IF NOT EXISTS idx_landing_sections_visible_sort
ON public.landing_sections(is_visible, sort_order);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;

-- Public can read visible sections only
CREATE POLICY "Public can read visible landing sections"
ON public.landing_sections FOR SELECT
TO anon, authenticated
USING (is_visible = true);

-- Admin full access (owner/editor roles)
CREATE POLICY "Admins can manage landing sections"
ON public.landing_sections FOR ALL
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
);

-- ============================================
-- Grant Permissions (Table-level access)
-- ============================================

GRANT SELECT ON public.landing_sections TO anon, authenticated;

-- Admin write permissions (required alongside RLS policies)
GRANT INSERT, UPDATE, DELETE ON public.landing_sections TO authenticated;

-- ============================================
-- Note: Seed data moved to 03_seed/04_features_landing.sql
-- ============================================

-- ============================================
-- DONE
-- ============================================

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
-- ============================================
-- ADD: Users Module Tables
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-28
--
-- 包含表格 TABLES:
-- - user_directory: 使用者目錄（同步 auth.users，SSOT）
-- - user_admin_profiles: 使用者後台檔案（Owner-only markdown + tags）
-- - user_appointments: 使用者預約（Owner-only calendar events）
--
-- 依賴 DEPENDENCIES:
-- - 01_main.sql (site_admins for RLS role check)
--
-- ============================================


-- ============================================
-- PART 1: user_directory (Users list/email SSOT)
-- ============================================
--
-- Single source of truth for backend Users list.
-- Synced from auth.users via triggers (minimal fields only).
-- RLS: Owner/Editor can read; no public access.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_directory (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_user_directory_email ON public.user_directory(email);
CREATE INDEX IF NOT EXISTS idx_user_directory_created_at ON public.user_directory(created_at DESC);


-- ============================================
-- PART 2: Triggers for auth.users sync
-- ============================================
--
-- Sync insert/update/delete from auth.users to user_directory.
-- SECURITY DEFINER to access auth schema.
--
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_directory (user_id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.created_at, TIMEZONE('utc', NOW())), TIMEZONE('utc', NOW()))
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.user_directory
    SET email = NEW.email,
        updated_at = TIMEZONE('utc', NOW())
    WHERE user_id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- CASCADE handles deletion, but explicit for clarity
    DELETE FROM public.user_directory WHERE user_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_sync ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_sync
AFTER INSERT OR UPDATE OR DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();


-- ============================================
-- PART 3: user_admin_profiles (Owner-only profiles)
-- ============================================
--
-- Owner-authored markdown descriptions and tags for users.
-- Following gallery-style tag structure (single-language zh; en fields kept for legacy).
-- RLS: Owner can write, Owner/Editor can read.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_admin_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Owner-authored, admin-controlled markdown (NOT user-submitted)
  description_en_md TEXT,
  description_zh_md TEXT,
  
  -- Bilingual tags (follow gallery pattern but NOT shared with gallery)
  tags_en TEXT[] NOT NULL DEFAULT '{}',
  tags_zh TEXT[] NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_by UUID REFERENCES auth.users(id)
);

-- GIN indexes for tag filtering
CREATE INDEX IF NOT EXISTS idx_user_admin_profiles_tags_en ON public.user_admin_profiles USING GIN(tags_en);
CREATE INDEX IF NOT EXISTS idx_user_admin_profiles_tags_zh ON public.user_admin_profiles USING GIN(tags_zh);


-- ============================================
-- PART 4: user_appointments (Owner-only calendar)
-- ============================================
--
-- Calendar events for users (multiple events per user).
-- Timestamps stored as UTC (TIMESTAMPTZ).
-- RLS: Owner can write, Owner/Editor can read.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Validation: end_at must be after start_at
  CONSTRAINT valid_appointment_time CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_user_appointments_user_id ON public.user_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_appointments_start_at ON public.user_appointments(start_at DESC);


-- ============================================
-- PART 5: 啟用 RLS
-- ============================================

ALTER TABLE public.user_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_appointments ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 6: RLS Policies - user_directory
-- ============================================
--
-- Admin read-only (Owner/Editor can read; no public access)
--
-- ============================================

CREATE POLICY "Admins can read user directory"
  ON public.user_directory FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 7: RLS Policies - user_admin_profiles
-- ============================================
--
-- Owner can write (INSERT/UPDATE/DELETE)
-- Owner/Editor can read
--
-- ============================================

CREATE POLICY "Admins can read user admin profiles"
  ON public.user_admin_profiles FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Owners can manage user admin profiles"
  ON public.user_admin_profiles FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');


-- ============================================
-- PART 8: RLS Policies - user_appointments
-- ============================================
--
-- Owner can write (INSERT/UPDATE/DELETE)
-- Owner/Editor can read
--
-- ============================================

CREATE POLICY "Admins can read user appointments"
  ON public.user_appointments FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Owners can manage user appointments"
  ON public.user_appointments FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');


-- ============================================
-- PART 9: Grant Permissions (Table-level access)
-- ============================================
--
-- RLS policies control WHICH rows; GRANT controls table-level access.
-- Without GRANT, PostgreSQL denies access before RLS is even evaluated.
--
-- ============================================

-- user_directory: admin read only
GRANT SELECT ON public.user_directory TO authenticated;

-- user_admin_profiles: admin read, owner write (RLS enforces owner-only)
GRANT SELECT ON public.user_admin_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_admin_profiles TO authenticated;

-- user_appointments: admin read, owner write (RLS enforces owner-only)
GRANT SELECT ON public.user_appointments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_appointments TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================

-- ============================================
-- ADD: AI Analysis Module Tables & RPC
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-30
--
-- 包含表格 TABLES:
-- - ai_analysis_reports: AI 分析報告
-- - ai_usage_monthly: 月度使用量統計
--
-- 包含函數 FUNCTIONS:
-- - increment_ai_usage: 原子性遞增用量 (atomic upsert)
--
-- 依賴 DEPENDENCIES:
-- - 01_main.sql (site_admins for RLS role check)
--
-- @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
-- @see doc/specs/completed/AI_ANALYSIS_v2.md - Full specification
--
-- ============================================


-- ============================================
-- PART 1: ai_analysis_reports (Report Storage)
-- ============================================
--
-- Stores AI analysis report metadata and results.
-- RLS: Owner/Editor can read; Owner manages own reports.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL CHECK (template_id IN ('user_behavior', 'sales', 'rfm', 'content_recommendation')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_types TEXT[] NOT NULL DEFAULT '{}',
  mode TEXT NOT NULL DEFAULT 'standard' CHECK (mode IN ('standard', 'rag')),
  -- Model ID requested by user at creation time
  model_id TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'incomplete', 'failed')),
  result TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10, 6),
  -- Model ID actually used (from OpenRouter response)
  model TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_reports_user_id ON public.ai_analysis_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_status ON public.ai_analysis_reports(status);
CREATE INDEX IF NOT EXISTS idx_ai_reports_created_at ON public.ai_analysis_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reports_user_created ON public.ai_analysis_reports(user_id, created_at DESC);


-- ============================================
-- PART 2: ai_usage_monthly (Usage Tracking)
-- ============================================
--
-- Monthly aggregated usage for budget tracking.
-- One row per month (year_month as PK).
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_usage_monthly (
  year_month TEXT PRIMARY KEY CHECK (year_month ~ '^\d{4}-\d{2}$'),
  total_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
  analysis_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_updated ON public.ai_usage_monthly(updated_at DESC);


-- ============================================
-- PART 3: increment_ai_usage RPC (Atomic Upsert)
-- ============================================
--
-- Atomically increment usage for a given month.
-- Uses ON CONFLICT to upsert in a single statement.
-- SECURITY DEFINER to allow service_role access.
--
-- ============================================

CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_year_month TEXT,
  p_cost NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_usage_monthly (year_month, total_cost_usd, analysis_count, updated_at)
  VALUES (p_year_month, p_cost, 1, TIMEZONE('utc', NOW()))
  ON CONFLICT (year_month) DO UPDATE SET
    total_cost_usd = ai_usage_monthly.total_cost_usd + EXCLUDED.total_cost_usd,
    analysis_count = ai_usage_monthly.analysis_count + 1,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Lock down SECURITY DEFINER function
REVOKE ALL ON FUNCTION public.increment_ai_usage(TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(TEXT, NUMERIC) TO service_role;


-- ============================================
-- PART 4: Enable RLS
-- ============================================

ALTER TABLE public.ai_analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_monthly ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 5: RLS Policies - ai_analysis_reports
-- ============================================
--
-- Owner/Editor can read all reports (admin dashboard).
-- Users can only manage their own reports.
--
-- ============================================

-- Admin SELECT (Owner/Editor can read all reports)
CREATE POLICY "Admins can read all AI reports"
  ON public.ai_analysis_reports FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- User SELECT own reports (non-admin users can see their own)
CREATE POLICY "Users can read own AI reports"
  ON public.ai_analysis_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- User INSERT own reports
CREATE POLICY "Users can create own AI reports"
  ON public.ai_analysis_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User UPDATE own reports
CREATE POLICY "Users can update own AI reports"
  ON public.ai_analysis_reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User DELETE own reports
CREATE POLICY "Users can delete own AI reports"
  ON public.ai_analysis_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin ALL (Owner/Editor can manage all reports for housekeeping)
CREATE POLICY "Admins can manage all AI reports"
  ON public.ai_analysis_reports FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 6: RLS Policies - ai_usage_monthly
-- ============================================
--
-- Admin-only read access (usage/budget visibility).
-- Writes happen via service_role (increment_ai_usage RPC).
--
-- ============================================

-- Admin SELECT only
CREATE POLICY "Admins can read AI usage"
  ON public.ai_usage_monthly FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- All mutations go through increment_ai_usage RPC (service_role)


-- ============================================
-- PART 6.5: ai_analysis_schedules (Scheduled Reports)
-- ============================================
--
-- Stores scheduled analysis configurations.
-- RLS: Owner can CRUD; Editor can read for monitoring.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_analysis_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Analysis configuration (mirrors AnalysisRequest)
  template_id TEXT NOT NULL CHECK (template_id IN ('user_behavior', 'sales', 'rfm', 'content_recommendation')),
  data_types TEXT[] NOT NULL DEFAULT '{}',
  mode TEXT NOT NULL DEFAULT 'standard' CHECK (mode IN ('standard', 'rag')),
  model_id TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  rag_config JSONB,
  
  -- Target member (nullable = all members)
  -- Stores auth.users.id (same value as customer_profiles.user_id when profile exists)
  member_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Schedule configuration
  -- Supports: @daily, @weekly, @monthly, or 5-field cron (minute hour * * *)
  schedule_cron TEXT NOT NULL CHECK (schedule_cron ~ '^(@(daily|weekly|monthly)|\\d+\\s+\\d+\\s+\\*\\s+\\*\\s+\\*)$'),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Execution tracking
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_report_id UUID REFERENCES public.ai_analysis_reports(id) ON DELETE SET NULL,
  
  -- Metadata
  name TEXT NOT NULL DEFAULT 'Scheduled Analysis',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for schedule queries
CREATE INDEX IF NOT EXISTS idx_ai_schedules_next_run ON public.ai_analysis_schedules(next_run_at) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_ai_schedules_created_by ON public.ai_analysis_schedules(created_by);

-- Enable RLS
ALTER TABLE public.ai_analysis_schedules ENABLE ROW LEVEL SECURITY;

-- Owner can manage all schedules
CREATE POLICY "Owners can manage AI schedules"
  ON public.ai_analysis_schedules FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');

-- Editor can read schedules (monitoring visibility)
CREATE POLICY "Editors can read AI schedules"
  ON public.ai_analysis_schedules FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');


-- ============================================
-- PART 7: Grant Permissions (Table-level access)
-- ============================================
--
-- RLS policies control WHICH rows; GRANT controls table-level access.
-- Without GRANT, PostgreSQL denies access before RLS is even evaluated.
--
-- ============================================

-- ai_analysis_reports: authenticated can SELECT/INSERT/UPDATE/DELETE (RLS enforces row-level)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis_reports TO authenticated;

-- ai_usage_monthly: authenticated can SELECT (RLS enforces admin-only)
GRANT SELECT ON public.ai_usage_monthly TO authenticated;

-- ai_analysis_schedules: authenticated can SELECT/INSERT/UPDATE/DELETE (RLS enforces owner/editor)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis_schedules TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================

/*
-- NOTE: Legacy duplicate block disabled.
-- Canonical Embedding schema appears later in this file and matches `supabase/02_add/13_embeddings.sql`.

-- ============================================
-- ADD: Embedding Module Tables (pgvector)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-30
--
-- 包含表格 TABLES:
-- - embeddings: Vector embeddings with chunking support
-- - embedding_queue: Async processing queue
-- - similar_items: Precomputed recommendations
--
-- @see uiux_refactor.md §6.3 - Data Intelligence Platform (Module C)
-- @see doc/specs/completed/SUPABASE_AI.md - Full specification
--
-- ============================================


-- ============================================
-- PART 0: Enable pgvector Extension
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================
-- PART 1: embeddings (Vector Storage with Chunking)
-- ============================================

CREATE TABLE IF NOT EXISTS public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('post', 'gallery_item', 'comment')),
  target_id UUID NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  chunk_total INT NOT NULL DEFAULT 1,
  embedding vector(1536) NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  chunk_content TEXT,
  -- Full-text search vector (generated column for keyword search)
  -- @see SUPABASE_AI.md Phase 7
  chunk_tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(chunk_content, ''))
  ) STORED,
  preprocessing_metadata JSONB,
  enrichment_metadata JSONB,
  quality_status VARCHAR(20) DEFAULT 'passed' CHECK (quality_status IN ('passed', 'incomplete', 'failed')),
  quality_score DECIMAL(3,2),
  quality_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),

  UNIQUE(target_type, target_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON public.embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_embeddings_target ON public.embeddings(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_quality ON public.embeddings(quality_status, quality_score);
CREATE INDEX IF NOT EXISTS idx_embeddings_created ON public.embeddings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_embeddings_tsv ON public.embeddings USING GIN(chunk_tsv);


-- ============================================
-- PART 2: embedding_queue (Async Processing Queue)
-- ============================================

CREATE TABLE IF NOT EXISTS public.embedding_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('post', 'gallery_item', 'comment')),
  target_id UUID NOT NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  error_message TEXT,
  quality_status VARCHAR(20),
  processing_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  processed_at TIMESTAMPTZ,

  UNIQUE(target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_embedding_queue_status 
  ON public.embedding_queue(status, priority DESC, created_at);


-- ============================================
-- PART 3: similar_items (Precomputed Recommendations)
-- ============================================

CREATE TABLE IF NOT EXISTS public.similar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('post', 'gallery_item')),
  source_id UUID NOT NULL,
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('post', 'gallery_item')),
  target_id UUID NOT NULL,
  similarity_score DECIMAL(4,3) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  rank INT NOT NULL CHECK (rank >= 1 AND rank <= 10),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),

  UNIQUE(source_type, source_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_similar_items_source 
  ON public.similar_items(source_type, source_id, rank);
CREATE INDEX IF NOT EXISTS idx_similar_items_computed 
  ON public.similar_items(computed_at);


-- ============================================
-- PART 4: Enable RLS
-- ============================================

ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.similar_items ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 5: RLS Policies - embeddings
-- ============================================

CREATE POLICY "Admins can read embeddings"
  ON public.embeddings FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Admins can manage embeddings"
  ON public.embeddings FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 6: RLS Policies - embedding_queue
-- ============================================

CREATE POLICY "Admins can read embedding queue"
  ON public.embedding_queue FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Admins can manage embedding queue"
  ON public.embedding_queue FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 7: RLS Policies - similar_items
-- ============================================

CREATE POLICY "Anyone can read similar items"
  ON public.similar_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage similar items"
  ON public.similar_items FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 8: Grant Permissions
-- ============================================

GRANT SELECT ON public.embeddings TO authenticated;
GRANT SELECT ON public.embedding_queue TO authenticated;
GRANT SELECT ON public.similar_items TO anon;
GRANT SELECT ON public.similar_items TO authenticated;


-- ============================================
-- PART 9: search_logs (Search Analytics)
-- ============================================
--
-- Log table for tracking search queries.
-- Used for analytics and low-quality query identification.
--
-- @see SUPABASE_AI.md Phase 8: Search Analytics
-- @see uiux_refactor.md §4 item 8
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('semantic', 'keyword', 'hybrid')),
  weights JSONB,  -- { semanticWeight: 0.7, keywordWeight: 0.3 } for hybrid mode
  threshold DECIMAL(3,2),
  result_limit INT,
  target_types TEXT[],
  results_count INT NOT NULL DEFAULT 0,
  top_score DECIMAL(4,3),  -- Highest score from results
  is_low_quality BOOLEAN NOT NULL DEFAULT false,  -- results_count = 0 OR top_score < threshold
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  metadata JSONB  -- Additional context (e.g., error_message, search_duration_ms)
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_search_logs_created ON public.search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_low_quality ON public.search_logs(is_low_quality, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_mode ON public.search_logs(mode, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_by ON public.search_logs(created_by, created_at DESC);

-- RLS for search_logs
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Admin SELECT only (Owner/Editor can view analytics)
CREATE POLICY "Admins can read search logs"
  ON public.search_logs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Admin INSERT (search actions insert via server)
CREATE POLICY "Admins can insert search logs"
  ON public.search_logs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Owner-only DELETE (for cleanup)
CREATE POLICY "Owner can delete search logs"
  ON public.search_logs FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');

-- Grant permissions
GRANT SELECT, INSERT ON public.search_logs TO authenticated;


-- ============================================
-- PART 10: Search RPC Functions
-- ============================================
--
-- RPC functions for semantic and keyword search.
-- SECURITY DEFINER to allow search without direct table access.
--
-- @see SUPABASE_AI.md Phase 7 for hybrid search design
--
-- ============================================

-- Semantic search RPC (vector similarity)
-- Used by lib/modules/embedding/embedding-search-io.ts
CREATE OR REPLACE FUNCTION public.match_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_types text[]
)
RETURNS TABLE(
  target_type text,
  target_id uuid,
  chunk_index int,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.target_type::text,
    e.target_id,
    e.chunk_index,
    (1 - (e.embedding <=> query_embedding))::float AS similarity
  FROM public.embeddings e
  WHERE e.target_type = ANY(filter_types)
    AND (1 - (e.embedding <=> query_embedding)) >= match_threshold
    AND e.quality_status = 'passed'
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Keyword search RPC (PostgreSQL Full-Text Search)
-- Used by lib/modules/embedding/embedding-search-io.ts
-- @see SUPABASE_AI.md Phase 7
CREATE OR REPLACE FUNCTION public.search_embeddings_keyword(
  query_text text,
  result_limit int,
  filter_types text[]
)
RETURNS TABLE(
  target_type text,
  target_id uuid,
  chunk_index int,
  ts_rank float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tsquery_value tsquery;
BEGIN
  -- Convert query text to tsquery using plainto_tsquery for safer handling
  tsquery_value := plainto_tsquery('english', query_text);
  
  -- Return empty if query is empty
  IF tsquery_value IS NULL OR tsquery_value = ''::tsquery THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT
    e.target_type::text,
    e.target_id,
    e.chunk_index,
    ts_rank(e.chunk_tsv, tsquery_value)::float AS ts_rank
  FROM public.embeddings e
  WHERE e.target_type = ANY(filter_types)
    AND e.chunk_tsv @@ tsquery_value
    AND e.quality_status = 'passed'
  ORDER BY ts_rank DESC
  LIMIT result_limit;
END;
$$;

-- P0 Security: Lock down SECURITY DEFINER RPCs (service_role only)
REVOKE ALL ON FUNCTION public.match_embeddings(vector(1536), float, int, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_embeddings(vector(1536), float, int, text[]) TO service_role;

REVOKE ALL ON FUNCTION public.search_embeddings_keyword(text, int, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_embeddings_keyword(text, int, text[]) TO service_role;


-- ============================================
-- 完成 DONE
-- ============================================

*/

-- ============================================
-- ADD: Import/Export RPC Functions
-- ============================================
-- 
-- Provides transaction-safe batch operations for importing blog data.
-- These RPCs wrap multi-row operations in transactions for atomic rollback.
--
-- @see doc/specs/completed/IMPORT_EXPORT.md §4.4
-- @see uiux_refactor.md §6.1.2 Phase 1 B.3
-- ============================================


-- -----------------------------------------------------------------------------
-- import_blog_categories_batch
-- -----------------------------------------------------------------------------
-- Batch upsert categories with transaction safety.
-- On any error, the entire batch is rolled back.
--
-- @param p_categories JSONB array of category objects with slug, name_en, name_zh
-- @returns JSON with success status and count
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION import_blog_categories_batch(p_categories JSONB)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT := 0;
  v_category JSONB;
BEGIN
  -- Validate input
  IF p_categories IS NULL OR jsonb_array_length(p_categories) = 0 THEN
    RETURN json_build_object('success', true, 'count', 0);
  END IF;

  -- Process each category
  FOR v_category IN SELECT * FROM jsonb_array_elements(p_categories)
  LOOP
    INSERT INTO categories (slug, name_en, name_zh, created_at)
    VALUES (
      v_category->>'slug',
      v_category->>'name_en',
      v_category->>'name_zh',
      COALESCE((v_category->>'created_at')::TIMESTAMPTZ, NOW())
    )
    ON CONFLICT (slug)
    DO UPDATE SET
      name_en = EXCLUDED.name_en,
      name_zh = EXCLUDED.name_zh;
    
    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'count', v_count);

EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'count', 0
  );
END;
$$;


-- -----------------------------------------------------------------------------
-- import_blog_posts_batch
-- -----------------------------------------------------------------------------
-- Batch upsert posts with transaction safety.
-- Resolves category slugs to IDs and sets timestamps.
--
-- @param p_posts JSONB array of post objects
-- @param p_author_id UUID of the author for all posts
-- @returns JSON with success status and count
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION import_blog_posts_batch(
  p_posts JSONB,
  p_author_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT := 0;
  v_post JSONB;
  v_category_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Validate input
  IF p_posts IS NULL OR jsonb_array_length(p_posts) = 0 THEN
    RETURN json_build_object('success', true, 'count', 0);
  END IF;

  -- Process each post
  FOR v_post IN SELECT * FROM jsonb_array_elements(p_posts)
  LOOP
    -- Resolve category slug to ID
    SELECT id INTO v_category_id
    FROM categories
    WHERE slug = v_post->>'category_slug';

    INSERT INTO posts (
      slug,
      title_en,
      title_zh,
      content_en,
      content_zh,
      excerpt_en,
      excerpt_zh,
      cover_image_url_en,
      cover_image_url_zh,
      cover_image_alt_en,
      cover_image_alt_zh,
      visibility,
      category_id,
      author_id,
      created_at,
      updated_at,
      published_at
    )
    VALUES (
      v_post->>'slug',
      v_post->>'title_en',
      v_post->>'title_zh',
      v_post->>'content_en',
      v_post->>'content_zh',
      v_post->>'excerpt_en',
      v_post->>'excerpt_zh',
      v_post->>'cover_image_url_en',
      v_post->>'cover_image_url_zh',
      v_post->>'cover_image_alt_en',
      v_post->>'cover_image_alt_zh',
      COALESCE(v_post->>'visibility', 'draft'),
      v_category_id,
      p_author_id,
      COALESCE((v_post->>'created_at')::TIMESTAMPTZ, v_now),
      v_now,
      CASE 
        WHEN v_post->>'visibility' = 'public' THEN v_now 
        ELSE NULL 
      END
    )
    ON CONFLICT (slug)
    DO UPDATE SET
      title_en = EXCLUDED.title_en,
      title_zh = EXCLUDED.title_zh,
      content_en = EXCLUDED.content_en,
      content_zh = EXCLUDED.content_zh,
      excerpt_en = EXCLUDED.excerpt_en,
      excerpt_zh = EXCLUDED.excerpt_zh,
      cover_image_url_en = EXCLUDED.cover_image_url_en,
      cover_image_url_zh = EXCLUDED.cover_image_url_zh,
      cover_image_alt_en = EXCLUDED.cover_image_alt_en,
      cover_image_alt_zh = EXCLUDED.cover_image_alt_zh,
      visibility = EXCLUDED.visibility,
      category_id = EXCLUDED.category_id,
      updated_at = EXCLUDED.updated_at,
      published_at = COALESCE(posts.published_at, EXCLUDED.published_at);
    
    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'count', v_count);

EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'count', 0
  );
END;
$$;


-- -----------------------------------------------------------------------------
-- import_blog_bundle_atomic
-- -----------------------------------------------------------------------------
-- Atomic import of both categories and posts in a single transaction.
-- If any step fails, the entire import is rolled back.
--
-- @param p_categories JSONB array of category objects
-- @param p_posts JSONB array of post objects
-- @param p_author_id UUID of the author for all posts
-- @returns JSON with success status and counts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION import_blog_bundle_atomic(
  p_categories JSONB,
  p_posts JSONB,
  p_author_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_cat_count INT := 0;
  v_post_count INT := 0;
  v_category JSONB;
  v_post JSONB;
  v_category_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Step 1: Import categories
  IF p_categories IS NOT NULL AND jsonb_array_length(p_categories) > 0 THEN
    FOR v_category IN SELECT * FROM jsonb_array_elements(p_categories)
    LOOP
      INSERT INTO categories (slug, name_en, name_zh, created_at)
      VALUES (
        v_category->>'slug',
        v_category->>'name_en',
        v_category->>'name_zh',
        COALESCE((v_category->>'created_at')::TIMESTAMPTZ, v_now)
      )
      ON CONFLICT (slug)
      DO UPDATE SET
        name_en = EXCLUDED.name_en,
        name_zh = EXCLUDED.name_zh;
      
      v_cat_count := v_cat_count + 1;
    END LOOP;
  END IF;

  -- Step 2: Import posts (categories are now guaranteed to exist)
  IF p_posts IS NOT NULL AND jsonb_array_length(p_posts) > 0 THEN
    FOR v_post IN SELECT * FROM jsonb_array_elements(p_posts)
    LOOP
      -- Resolve category slug to ID
      SELECT id INTO v_category_id
      FROM categories
      WHERE slug = v_post->>'category_slug';

      INSERT INTO posts (
        slug,
        title_en,
        title_zh,
        content_en,
        content_zh,
        excerpt_en,
        excerpt_zh,
        cover_image_url_en,
        cover_image_url_zh,
        cover_image_alt_en,
        cover_image_alt_zh,
        visibility,
        category_id,
        author_id,
        created_at,
        updated_at,
        published_at
      )
      VALUES (
        v_post->>'slug',
        v_post->>'title_en',
        v_post->>'title_zh',
        v_post->>'content_en',
        v_post->>'content_zh',
        v_post->>'excerpt_en',
        v_post->>'excerpt_zh',
        v_post->>'cover_image_url_en',
        v_post->>'cover_image_url_zh',
        v_post->>'cover_image_alt_en',
        v_post->>'cover_image_alt_zh',
        COALESCE(v_post->>'visibility', 'draft'),
        v_category_id,
        p_author_id,
        COALESCE((v_post->>'created_at')::TIMESTAMPTZ, v_now),
        v_now,
        CASE 
          WHEN v_post->>'visibility' = 'public' THEN v_now 
          ELSE NULL 
        END
      )
      ON CONFLICT (slug)
      DO UPDATE SET
        title_en = EXCLUDED.title_en,
        title_zh = EXCLUDED.title_zh,
        content_en = EXCLUDED.content_en,
        content_zh = EXCLUDED.content_zh,
        excerpt_en = EXCLUDED.excerpt_en,
        excerpt_zh = EXCLUDED.excerpt_zh,
        cover_image_url_en = EXCLUDED.cover_image_url_en,
        cover_image_url_zh = EXCLUDED.cover_image_url_zh,
        cover_image_alt_en = EXCLUDED.cover_image_alt_en,
        cover_image_alt_zh = EXCLUDED.cover_image_alt_zh,
        visibility = EXCLUDED.visibility,
        category_id = EXCLUDED.category_id,
        updated_at = EXCLUDED.updated_at,
        published_at = COALESCE(posts.published_at, EXCLUDED.published_at);
      
      v_post_count := v_post_count + 1;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'success', true,
    'categories_count', v_cat_count,
    'posts_count', v_post_count
  );

EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically - entire bundle fails
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'categories_count', 0,
    'posts_count', 0
  );
END;
$$;


-- Grant execute permissions (admin only via RLS)
GRANT EXECUTE ON FUNCTION import_blog_categories_batch(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION import_blog_posts_batch(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION import_blog_bundle_atomic(JSONB, JSONB, UUID) TO authenticated;

COMMENT ON FUNCTION import_blog_categories_batch(JSONB) IS 
  'Batch upsert categories with transaction safety for import operations';
COMMENT ON FUNCTION import_blog_posts_batch(JSONB, UUID) IS 
  'Batch upsert posts with transaction safety for import operations';
COMMENT ON FUNCTION import_blog_bundle_atomic(JSONB, JSONB, UUID) IS 
  'Atomic import of blog categories and posts in a single transaction';


-- ============================================
-- 完成 DONE - Import/Export RPC
-- ============================================

-- ============================================
-- ADD: Import/Export Jobs Table
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-31
--
-- @see uiux_refactor.md §4 item 3 - Job History / Audit Trail / Re-download
-- @see ARCHITECTURE.md §3.13 - Data Intelligence Platform (Module A)
--
-- 包含表格 TABLES:
-- - import_export_jobs: Import/Export 任務記錄
--
-- ============================================


-- ============================================
-- PART 1: 建立表格
-- ============================================

CREATE TABLE IF NOT EXISTS public.import_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('import', 'export')),
  entity TEXT NOT NULL,
  format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_bucket TEXT,
  storage_path TEXT,
  size_bytes INTEGER,
  row_count INTEGER,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);


-- ============================================
-- PART 2: 建立索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_import_export_jobs_status 
  ON public.import_export_jobs(status);

CREATE INDEX IF NOT EXISTS idx_import_export_jobs_created_at 
  ON public.import_export_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_export_jobs_requested_by 
  ON public.import_export_jobs(requested_by);

CREATE INDEX IF NOT EXISTS idx_import_export_jobs_entity_created 
  ON public.import_export_jobs(entity, created_at DESC);


-- ============================================
-- PART 3: 啟用 RLS
-- ============================================

ALTER TABLE public.import_export_jobs ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: 建立 RLS Policies
-- ============================================

-- Admins can read all jobs
CREATE POLICY "Admins can read import_export_jobs"
  ON public.import_export_jobs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Admins can insert jobs (via server actions)
CREATE POLICY "Admins can create import_export_jobs"
  ON public.import_export_jobs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Admins can update jobs (status updates)
CREATE POLICY "Admins can update import_export_jobs"
  ON public.import_export_jobs FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Owner can delete jobs
CREATE POLICY "Owner can delete import_export_jobs"
  ON public.import_export_jobs FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');


-- ============================================
-- PART 5: Grant Permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE ON public.import_export_jobs TO authenticated;
GRANT DELETE ON public.import_export_jobs TO authenticated;



-- ============================================
-- 完成 DONE - Import/Export Jobs
-- ============================================


-- ============================================
-- ADD: Embedding Module Tables (pgvector)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-30
--
-- 包含表格 TABLES:
-- - embeddings: Vector embeddings with chunking support
-- - embedding_queue: Async processing queue
-- - similar_items: Precomputed recommendations
--
-- 依賴 DEPENDENCIES:
-- - pgvector extension (enabled below)
-- - 01_main.sql (site_admins for RLS role check)
--
-- @see uiux_refactor.md §6.3 - Data Intelligence Platform (Module C)
-- @see doc/specs/completed/SUPABASE_AI.md - Full specification
--
-- ============================================


-- ============================================
-- PART 0: Enable pgvector Extension
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================
-- PART 1: embeddings (Vector Storage with Chunking)
-- ============================================
--
-- Main embedding storage table.
-- Supports chunking for long content.
-- One row per (target_type, target_id, chunk_index).
--
-- @see SUPABASE_AI.md §2.1.1 for schema design
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('post', 'gallery_item', 'comment')),
  target_id UUID NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  chunk_total INT NOT NULL DEFAULT 1,
  embedding vector(1536) NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  chunk_content TEXT,
  -- Full-text search vector (generated column for keyword search)
  -- @see SUPABASE_AI.md Phase 7
  chunk_tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(chunk_content, ''))
  ) STORED,
  preprocessing_metadata JSONB,
  enrichment_metadata JSONB,
  quality_status VARCHAR(20) DEFAULT 'passed' CHECK (quality_status IN ('passed', 'incomplete', 'failed')),
  quality_score DECIMAL(3,2),
  quality_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),

  UNIQUE(target_type, target_id, chunk_index)
);

-- Vector similarity index (IVFFlat for cosine similarity)
-- Note: IVFFlat requires the table to have data before creation in some cases
-- For empty tables, we create it anyway and it will work after data is inserted
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON public.embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_embeddings_target ON public.embeddings(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_quality ON public.embeddings(quality_status, quality_score);
CREATE INDEX IF NOT EXISTS idx_embeddings_created ON public.embeddings(created_at DESC);

-- GIN index for full-text search (keyword search)
-- @see SUPABASE_AI.md Phase 7
CREATE INDEX IF NOT EXISTS idx_embeddings_tsv ON public.embeddings USING GIN(chunk_tsv);


-- ============================================
-- PART 2: embedding_queue (Async Processing Queue)
-- ============================================
--
-- Queue for async embedding generation.
-- Edge Function / Cron job processes pending items.
--
-- @see SUPABASE_AI.md §4.3 for queue design
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.embedding_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('post', 'gallery_item', 'comment')),
  target_id UUID NOT NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  error_message TEXT,
  quality_status VARCHAR(20),
  processing_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  processed_at TIMESTAMPTZ,
  -- Lease columns for concurrency control (@see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md)
  processing_token TEXT,
  lease_expires_at TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,

  UNIQUE(target_type, target_id)
);

-- Index for worker polling (priority DESC, created_at ASC for FIFO within priority)
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status 
  ON public.embedding_queue(status, priority DESC, created_at);

-- Partial index for efficient claim queries (@see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md)
CREATE INDEX IF NOT EXISTS idx_embedding_queue_claimable
  ON public.embedding_queue(status, lease_expires_at)
  WHERE status IN ('pending', 'processing');


-- ============================================
-- PART 3: similar_items (Precomputed Recommendations)
-- ============================================
--
-- Precomputed Top-N similar items per target.
-- Computed by daily Cron job, not query-time.
--
-- @see SUPABASE_AI.md §3.2.0 for design
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.similar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('post', 'gallery_item')),
  source_id UUID NOT NULL,
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('post', 'gallery_item')),
  target_id UUID NOT NULL,
  similarity_score DECIMAL(4,3) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  rank INT NOT NULL CHECK (rank >= 1 AND rank <= 10),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),

  UNIQUE(source_type, source_id, target_type, target_id)
);

-- Index for fetching similar items by source
CREATE INDEX IF NOT EXISTS idx_similar_items_source 
  ON public.similar_items(source_type, source_id, rank);

-- Index for cleanup/refresh queries
CREATE INDEX IF NOT EXISTS idx_similar_items_computed 
  ON public.similar_items(computed_at);


-- ============================================
-- PART 4: Enable RLS
-- ============================================

ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.similar_items ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 5: RLS Policies - embeddings
-- ============================================
--
-- Admin-only access (Owner/Editor).
-- No public read of raw embeddings (privacy).
--
-- ============================================

-- Admin SELECT only
CREATE POLICY "Admins can read embeddings"
  ON public.embeddings FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Admin ALL (for housekeeping)
CREATE POLICY "Admins can manage embeddings"
  ON public.embeddings FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 6: RLS Policies - embedding_queue
-- ============================================
--
-- Admin-only access (Owner/Editor).
-- Service role used for actual processing.
--
-- ============================================

-- Admin SELECT only
CREATE POLICY "Admins can read embedding queue"
  ON public.embedding_queue FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Admin ALL (for manual retry/housekeeping)
CREATE POLICY "Admins can manage embedding queue"
  ON public.embedding_queue FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 7: RLS Policies - similar_items
-- ============================================
--
-- Public read (for post/gallery pages).
-- Admin-only write (computed by Cron).
--
-- ============================================

-- Public SELECT (for similar posts/gallery items)
CREATE POLICY "Anyone can read similar items"
  ON public.similar_items FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin write (Cron job uses service_role, but admin can manually adjust)
CREATE POLICY "Admins can manage similar items"
  ON public.similar_items FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 8: Grant Permissions
-- ============================================
--
-- RLS policies control WHICH rows; GRANT controls table-level access.
--
-- ============================================

-- embeddings: authenticated can SELECT (RLS enforces admin-only)
-- Service role handles INSERT/UPDATE/DELETE
GRANT SELECT ON public.embeddings TO authenticated;

-- embedding_queue: authenticated can SELECT (RLS enforces admin-only)
-- Service role handles INSERT/UPDATE/DELETE
GRANT SELECT ON public.embedding_queue TO authenticated;

-- similar_items: anon + authenticated can SELECT (public read)
-- Service role handles INSERT/UPDATE/DELETE
GRANT SELECT ON public.similar_items TO anon;
GRANT SELECT ON public.similar_items TO authenticated;


-- ============================================
-- PART 9: search_logs (Search Analytics)
-- ============================================
--
-- Log table for tracking search queries.
-- Used for analytics and low-quality query identification.
--
-- @see SUPABASE_AI.md Phase 8: Search Analytics
-- @see uiux_refactor.md §4 item 8
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('semantic', 'keyword', 'hybrid')),
  weights JSONB,  -- { semanticWeight: 0.7, keywordWeight: 0.3 } for hybrid mode
  threshold DECIMAL(3,2),
  result_limit INT,
  target_types TEXT[],
  results_count INT NOT NULL DEFAULT 0,
  top_score DECIMAL(4,3),  -- Highest score from results
  is_low_quality BOOLEAN NOT NULL DEFAULT false,  -- results_count = 0 OR top_score < threshold
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  metadata JSONB  -- Additional context (e.g., error_message, search_duration_ms)
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_search_logs_created ON public.search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_low_quality ON public.search_logs(is_low_quality, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_mode ON public.search_logs(mode, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_by ON public.search_logs(created_by, created_at DESC);

-- RLS for search_logs
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Admin SELECT only (Owner/Editor can view analytics)
CREATE POLICY "Admins can read search logs"
  ON public.search_logs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Admin INSERT (search actions insert via server)
CREATE POLICY "Admins can insert search logs"
  ON public.search_logs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Owner-only DELETE (for cleanup)
CREATE POLICY "Owner can delete search logs"
  ON public.search_logs FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');

-- Grant permissions
GRANT SELECT, INSERT ON public.search_logs TO authenticated;


-- ============================================
-- PART 10: Search RPC Functions
-- ============================================
--
-- RPC functions for semantic and keyword search.
-- SECURITY DEFINER to allow search without direct table access.
--
-- @see SUPABASE_AI.md Phase 7 for hybrid search design
--
-- ============================================

-- Semantic search RPC (vector similarity)
-- Used by lib/modules/embedding/embedding-search-io.ts
CREATE OR REPLACE FUNCTION public.match_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_types text[]
)
RETURNS TABLE(
  target_type text,
  target_id uuid,
  chunk_index int,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.target_type::text,
    e.target_id,
    e.chunk_index,
    (1 - (e.embedding <=> query_embedding))::float AS similarity
  FROM public.embeddings e
  WHERE e.target_type = ANY(filter_types)
    AND (1 - (e.embedding <=> query_embedding)) >= match_threshold
    AND e.quality_status = 'passed'
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Keyword search RPC (PostgreSQL Full-Text Search)
-- Used by lib/modules/embedding/embedding-search-io.ts
-- @see SUPABASE_AI.md Phase 7
CREATE OR REPLACE FUNCTION public.search_embeddings_keyword(
  query_text text,
  result_limit int,
  filter_types text[]
)
RETURNS TABLE(
  target_type text,
  target_id uuid,
  chunk_index int,
  ts_rank float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tsquery_value tsquery;
BEGIN
  -- Convert query text to tsquery using plainto_tsquery for safer handling
  tsquery_value := plainto_tsquery('english', query_text);
  
  -- Return empty if query is empty
  IF tsquery_value IS NULL OR tsquery_value = ''::tsquery THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT
    e.target_type::text,
    e.target_id,
    e.chunk_index,
    ts_rank(e.chunk_tsv, tsquery_value)::float AS ts_rank
  FROM public.embeddings e
  WHERE e.target_type = ANY(filter_types)
    AND e.chunk_tsv @@ tsquery_value
    AND e.quality_status = 'passed'
  ORDER BY ts_rank DESC
  LIMIT result_limit;
END;
$$;

-- P0 Security: Lock down SECURITY DEFINER RPCs (service_role only)
REVOKE ALL ON FUNCTION public.match_embeddings(vector(1536), float, int, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_embeddings(vector(1536), float, int, text[]) TO service_role;

REVOKE ALL ON FUNCTION public.search_embeddings_keyword(text, int, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_embeddings_keyword(text, int, text[]) TO service_role;


-- ============================================
-- PART 11: Claim Queue Items RPC (Lease Mechanism)
-- ============================================
--
-- Atomically claim pending or stale-leased queue items.
-- Uses FOR UPDATE SKIP LOCKED to prevent race conditions.
--
-- @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md for design spec
--
-- ============================================

CREATE OR REPLACE FUNCTION public.claim_embedding_queue_items(
  claim_limit INT DEFAULT 5,
  lease_seconds INT DEFAULT 120
)
RETURNS TABLE(
  target_type TEXT,
  target_id UUID,
  processing_token TEXT,
  lease_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  new_lease_expires TIMESTAMPTZ;
BEGIN
  -- Generate token and lease expiry
  new_token := gen_random_uuid()::TEXT;
  new_lease_expires := NOW() + (lease_seconds || ' seconds')::INTERVAL;
  
  RETURN QUERY
  WITH claimable AS (
    SELECT q.id, q.target_type AS t_type, q.target_id AS t_id
    FROM public.embedding_queue q
    WHERE (
      -- Pending items
      q.status = 'pending'
      -- OR processing but lease expired (stale)
      OR (q.status = 'processing' AND q.lease_expires_at < NOW())
    )
    AND q.attempts < 3  -- Max retries
    ORDER BY q.priority DESC, q.created_at ASC
    LIMIT claim_limit
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE public.embedding_queue eq
    SET
      status = 'processing',
      attempts = eq.attempts + 1,
      processing_token = new_token,
      lease_expires_at = new_lease_expires,
      processing_started_at = NOW(),
      error_message = NULL
    FROM claimable c
    WHERE eq.id = c.id
    RETURNING eq.target_type, eq.target_id, eq.processing_token, eq.lease_expires_at
  )
  SELECT u.target_type::TEXT, u.target_id, u.processing_token, u.lease_expires_at
  FROM updated u;
END;
$$;

-- P0 Security: Lock down claim RPC (service_role only)
REVOKE ALL ON FUNCTION public.claim_embedding_queue_items(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_embedding_queue_items(INT, INT) TO service_role;


-- ============================================
-- 完成 DONE - Embeddings Module
-- ============================================

-- ============================================
-- ADD: AI Analysis Custom Templates Table
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-01
--
-- 包含表格 TABLES:
-- - ai_analysis_templates: 自訂分析 Prompt 模板
--
-- 依賴 DEPENDENCIES:
-- - 01_main.sql (site_admins for RLS role check)
-- - 12_ai_analysis.sql (for context)
--
-- @see doc/SPEC.md (AI Analysis -> Custom analysis templates)
-- @see ARCHITECTURE.md §3.13 - Data Intelligence Platform
--
-- ============================================


-- ============================================
-- PART 1: ai_analysis_templates (Custom Templates)
-- ============================================
--
-- Stores custom analysis prompt templates.
-- RLS: Owner CRUD; Editor read-only.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_analysis_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  prompt_text TEXT NOT NULL CHECK (char_length(prompt_text) >= 10 AND char_length(prompt_text) <= 10000),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_templates_created_by ON public.ai_analysis_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_templates_enabled ON public.ai_analysis_templates(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_ai_templates_created_at ON public.ai_analysis_templates(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_analysis_templates ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 2: RLS Policies - ai_analysis_templates
-- ============================================
--
-- Owner can CRUD all templates.
-- Editor can read (for use in analysis).
--
-- ============================================

-- Owner can manage all templates
CREATE POLICY "Owners can manage AI templates"
  ON public.ai_analysis_templates FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');

-- Editor can read templates (for selection dropdown)
CREATE POLICY "Editors can read AI templates"
  ON public.ai_analysis_templates FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');


-- ============================================
-- PART 3: Grant Permissions
-- ============================================

-- ai_analysis_templates: authenticated can SELECT/INSERT/UPDATE/DELETE (RLS enforces role)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis_templates TO authenticated;


-- ============================================
-- 完成 DONE - AI Analysis Templates
-- ============================================

-- ============================================
-- ADD: Page Views Analytics Table & RPC
-- ============================================
--
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-01
--
-- 包含表格 TABLES:
-- - page_view_daily: Daily aggregated page views
--
-- 包含函數 FUNCTIONS:
-- - increment_page_view: Atomic upsert for page view counting
--
-- 依賴 DEPENDENCIES:
-- - 01_main.sql (site_admins for RLS role check)
--
-- @see doc/SPEC.md (Analytics -> Page Views)
-- @see ARCHITECTURE.md §3.13 - Data Intelligence Platform
--
-- ============================================


-- ============================================
-- PART 1: page_view_daily (Aggregated Page Views)
-- ============================================
--
-- Stores daily aggregated page views by path and locale.
-- Aggregation reduces storage and noise compared to raw events.
-- Privacy-first: no PII stored (no user identifiers).
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.page_view_daily (
  day DATE NOT NULL,
  path TEXT NOT NULL CHECK (path ~ '^/[a-zA-Z0-9/_-]*$' AND length(path) <= 500),
  locale TEXT NOT NULL CHECK (locale IN ('en', 'zh')),
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  
  -- Composite primary key for upsert
  PRIMARY KEY (day, path, locale)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_page_view_daily_day ON public.page_view_daily(day DESC);
CREATE INDEX IF NOT EXISTS idx_page_view_daily_path ON public.page_view_daily(path);
CREATE INDEX IF NOT EXISTS idx_page_view_daily_locale ON public.page_view_daily(locale);
CREATE INDEX IF NOT EXISTS idx_page_view_daily_day_path ON public.page_view_daily(day DESC, path);


-- ============================================
-- PART 2: increment_page_view RPC (Atomic Upsert)
-- ============================================
--
-- Atomically increment view count for a given day/path/locale.
-- Uses ON CONFLICT to upsert in a single statement.
-- SECURITY DEFINER to allow API route access via service_role.
--
-- ============================================

CREATE OR REPLACE FUNCTION public.increment_page_view(
  p_day DATE,
  p_path TEXT,
  p_locale TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs
  IF p_path IS NULL OR p_path = '' THEN
    RAISE EXCEPTION 'Path cannot be null or empty';
  END IF;
  
  IF p_locale NOT IN ('en', 'zh') THEN
    RAISE EXCEPTION 'Locale must be en or zh';
  END IF;
  
  -- Atomic upsert
  INSERT INTO public.page_view_daily (day, path, locale, view_count, updated_at)
  VALUES (p_day, p_path, p_locale, 1, TIMEZONE('utc', NOW()))
  ON CONFLICT (day, path, locale) DO UPDATE SET
    view_count = page_view_daily.view_count + 1,
    updated_at = TIMEZONE('utc', NOW());
END;
$$;

-- Lock down SECURITY DEFINER function
REVOKE ALL ON FUNCTION public.increment_page_view(DATE, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_page_view(DATE, TEXT, TEXT) TO service_role;


-- ============================================
-- PART 3: Enable RLS
-- ============================================

ALTER TABLE public.page_view_daily ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: RLS Policies - page_view_daily
-- ============================================
--
-- Admin-only read access (analytics visibility).
-- Writes happen via service_role (increment_page_view RPC).
--
-- ============================================

-- Admin SELECT only (Owner/Editor can read analytics)
CREATE POLICY "Admins can read page views"
  ON public.page_view_daily FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- All mutations go through increment_page_view RPC (service_role)


-- ============================================
-- PART 5: Grant Permissions (Table-level access)
-- ============================================
--
-- RLS policies control WHICH rows; GRANT controls table-level access.
-- Without GRANT, PostgreSQL denies access before RLS is even evaluated.
--
-- ============================================

-- page_view_daily: authenticated can SELECT (RLS enforces admin-only)
GRANT SELECT ON public.page_view_daily TO authenticated;


-- ============================================
-- 完成 DONE - Page Views Analytics
-- ============================================

-- ============================================
-- ADD: AI Analysis Custom Template References
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-03
--
-- ALTERs:
-- - ai_analysis_reports: add custom_template_id column
-- - ai_analysis_schedules: add custom_template_id column
--
-- 依賴 DEPENDENCIES:
-- - 12_ai_analysis.sql (ai_analysis_reports, ai_analysis_schedules tables)
-- - 15_ai_analysis_templates.sql (ai_analysis_templates table)
--
-- @see doc/archive/2026-01-03-data-intelligence-a1-a3-step-plan.md (PR-3: AI Analysis Custom Templates)
-- @see ARCHITECTURE.md §3.13 - Data Intelligence Platform
--
-- ============================================


-- ============================================
-- PART 1: Add custom_template_id to ai_analysis_reports
-- ============================================

-- Add column (nullable FK to templates)
ALTER TABLE public.ai_analysis_reports
ADD COLUMN IF NOT EXISTS custom_template_id UUID REFERENCES public.ai_analysis_templates(id) ON DELETE SET NULL;

-- Drop old template_id CHECK constraint (allows only built-in templates)
-- Note: constraint name may vary; using DO block for safety
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'ai_analysis_reports' 
    AND column_name = 'template_id'
    AND constraint_name = 'ai_analysis_reports_template_id_check'
  ) THEN
    ALTER TABLE public.ai_analysis_reports DROP CONSTRAINT ai_analysis_reports_template_id_check;
  END IF;
END$$;

-- Add new CHECK constraint: allow built-in templates + 'custom'
ALTER TABLE public.ai_analysis_reports
ADD CONSTRAINT ai_analysis_reports_template_id_check 
CHECK (template_id IN ('user_behavior', 'sales', 'rfm', 'content_recommendation', 'custom'));

-- Add cross-field CHECK: template_id='custom' ↔ custom_template_id IS NOT NULL
ALTER TABLE public.ai_analysis_reports
ADD CONSTRAINT ai_analysis_reports_custom_template_ref_check
CHECK (
  (template_id = 'custom' AND custom_template_id IS NOT NULL) OR
  (template_id != 'custom' AND custom_template_id IS NULL)
);

-- Add index for custom_template_id lookups
CREATE INDEX IF NOT EXISTS idx_ai_reports_custom_template ON public.ai_analysis_reports(custom_template_id) WHERE custom_template_id IS NOT NULL;


-- ============================================
-- PART 2: Add custom_template_id to ai_analysis_schedules
-- ============================================

-- Add column (nullable FK to templates)
ALTER TABLE public.ai_analysis_schedules
ADD COLUMN IF NOT EXISTS custom_template_id UUID REFERENCES public.ai_analysis_templates(id) ON DELETE SET NULL;

-- Drop old template_id CHECK constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'ai_analysis_schedules' 
    AND column_name = 'template_id'
    AND constraint_name = 'ai_analysis_schedules_template_id_check'
  ) THEN
    ALTER TABLE public.ai_analysis_schedules DROP CONSTRAINT ai_analysis_schedules_template_id_check;
  END IF;
END$$;

-- Add new CHECK constraint: allow built-in templates + 'custom'
ALTER TABLE public.ai_analysis_schedules
ADD CONSTRAINT ai_analysis_schedules_template_id_check 
CHECK (template_id IN ('user_behavior', 'sales', 'rfm', 'content_recommendation', 'custom'));

-- Add cross-field CHECK: template_id='custom' ↔ custom_template_id IS NOT NULL
ALTER TABLE public.ai_analysis_schedules
ADD CONSTRAINT ai_analysis_schedules_custom_template_ref_check
CHECK (
  (template_id = 'custom' AND custom_template_id IS NOT NULL) OR
  (template_id != 'custom' AND custom_template_id IS NULL)
);

-- Add index for custom_template_id lookups
CREATE INDEX IF NOT EXISTS idx_ai_schedules_custom_template ON public.ai_analysis_schedules(custom_template_id) WHERE custom_template_id IS NOT NULL;


-- ============================================
-- 完成 DONE - AI Analysis Custom Template References
-- ============================================

-- ============================================
-- ADD: AI Analysis Report Shares (Public Share Links)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-03
--
-- 包含表格 TABLES:
-- - ai_analysis_report_shares: 報告分享連結
--
-- 包含函數 FUNCTIONS:
-- - get_shared_ai_report: 公開抓取分享報告 (SECURITY DEFINER + anon)
--
-- 依賴 DEPENDENCIES:
-- - 12_ai_analysis.sql (ai_analysis_reports table)
--
-- @see doc/archive/2026-01-03-data-intelligence-a1-a3-step-plan.md PR-4 - AI Analysis Share Links
-- @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
--
-- ============================================


-- ============================================
-- PART 1: ai_analysis_report_shares (Share Links Table)
-- ============================================
--
-- Stores share links for AI analysis reports.
-- Token is cryptographically secure (256-bit entropy).
-- Supports revocation and optional expiry.
-- RLS: Owner-only management.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_analysis_report_shares (
  -- Token is the primary key (64-char hex string, 256-bit entropy)
  token TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Reference to the report being shared
  report_id UUID NOT NULL REFERENCES public.ai_analysis_reports(id) ON DELETE CASCADE,
  
  -- Who created the share link
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  
  -- Optional expiry date (null = never expires)
  expires_at TIMESTAMPTZ,
  
  -- Revocation timestamp (null = active)
  revoked_at TIMESTAMPTZ,
  
  -- Constraint: token must be 64-char hex
  CONSTRAINT token_format CHECK (token ~ '^[a-f0-9]{64}$')
);

-- Index for looking up shares by report
CREATE INDEX IF NOT EXISTS idx_ai_report_shares_report_id 
  ON public.ai_analysis_report_shares(report_id);

-- Index for looking up shares by creator
CREATE INDEX IF NOT EXISTS idx_ai_report_shares_created_by 
  ON public.ai_analysis_report_shares(created_by);


-- ============================================
-- PART 2: get_shared_ai_report RPC (Public Fetch)
-- ============================================
--
-- SECURITY DEFINER function to fetch shared report data.
-- Returns only whitelisted fields (no internal IDs/filters/userId).
-- GRANT EXECUTE TO anon for public access.
--
-- Security:
-- - Token validation (64-char hex)
-- - Expiry check
-- - Revocation check
-- - Whitelist-only field return
--
-- ============================================

CREATE OR REPLACE FUNCTION public.get_shared_ai_report(p_token TEXT)
RETURNS TABLE (
  result TEXT,
  template_id TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share RECORD;
  v_report RECORD;
BEGIN
  -- Validate token format (64-char hex)
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN
    RETURN;
  END IF;

  -- Find the share link
  SELECT s.report_id, s.expires_at, s.revoked_at
  INTO v_share
  FROM public.ai_analysis_report_shares s
  WHERE s.token = p_token;

  -- Share not found
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check if revoked
  IF v_share.revoked_at IS NOT NULL THEN
    RETURN;
  END IF;

  -- Check if expired
  IF v_share.expires_at IS NOT NULL AND v_share.expires_at < TIMEZONE('utc', NOW()) THEN
    RETURN;
  END IF;

  -- Fetch the report (whitelist fields only)
  SELECT r.result, r.template_id, r.status, r.created_at, r.completed_at
  INTO v_report
  FROM public.ai_analysis_reports r
  WHERE r.id = v_share.report_id;

  -- Report not found (should not happen due to FK, but defensive)
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Return whitelist fields
  RETURN QUERY SELECT 
    v_report.result,
    v_report.template_id,
    v_report.status,
    v_report.created_at,
    v_report.completed_at;
END;
$$;

-- Lock down SECURITY DEFINER function, then grant to anon
REVOKE ALL ON FUNCTION public.get_shared_ai_report(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_ai_report(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_ai_report(TEXT) TO authenticated;


-- ============================================
-- PART 3: Enable RLS
-- ============================================

ALTER TABLE public.ai_analysis_report_shares ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: RLS Policies - ai_analysis_report_shares
-- ============================================
--
-- Owner-only management.
-- Editor cannot access share tokens (security measure).
-- Public fetch goes through get_shared_ai_report RPC (bypasses RLS).
--
-- ============================================

-- Owner can manage all share links
CREATE POLICY "Owners can manage AI report shares"
  ON public.ai_analysis_report_shares FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');


-- ============================================
-- PART 5: Grant Permissions (Table-level access)
-- ============================================
--
-- Only authenticated users (owners) can access the table directly.
-- Anon users fetch via get_shared_ai_report RPC.
--
-- ============================================

-- Owner can CRUD share links (RLS enforces owner-only)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis_report_shares TO authenticated;


-- ============================================
-- 完成 DONE - AI Analysis Report Shares
-- ============================================

-- ============================================
-- Service Role (server-only) - Global Grants
-- ============================================
-- Supabase `service_role` key bypasses RLS but still needs PostgreSQL GRANTs.
-- Many server-only modules use `createAdminClient()` (service role) and must be able
-- to read/write across public tables (embeddings, queues, cron jobs, webhooks, etc.).
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- ============================================
-- ADD: Safety Risk Engine Tables
-- ============================================
-- 
-- Version: 1.1
-- Last Updated: 2026-01-17
--
-- Tables:
-- - safety_corpus_items: RAG corpus SSOT (slang/cases)
-- - safety_settings: Singleton configuration
-- - comment_safety_assessments: Audit history
-- - safety_training_datasets: Curated fine-tuning dataset (ETL target)
--
-- Dependencies:
-- - 01_main.sql (auth.users reference)
-- - 02_comments.sql (comments.id FK)
--
-- @see doc/specs/proposed/safety-risk-engine-spec.md §9
-- @see doc/meta/STEP_PLAN.md PR-1
--
-- ============================================


-- ============================================
-- PART 1: safety_corpus_items (RAG Corpus SSOT)
-- ============================================
--
-- Manages slang dictionary and historical cases for RAG.
-- Status flow: draft → active → deprecated
-- Only 'active' records are used by RAG queries.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.safety_corpus_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('slang', 'case')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'deprecated')),
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_safety_corpus_items_status 
  ON public.safety_corpus_items(status);
CREATE INDEX IF NOT EXISTS idx_safety_corpus_items_kind_status 
  ON public.safety_corpus_items(kind, status);
CREATE INDEX IF NOT EXISTS idx_safety_corpus_items_created 
  ON public.safety_corpus_items(created_at DESC);


-- ============================================
-- PART 2: safety_settings (Singleton Configuration)
-- ============================================
--
-- Centralized settings for safety risk engine.
-- Singleton pattern: id=1 is the only valid row.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.safety_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  model_id TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
  timeout_ms INTEGER NOT NULL DEFAULT 1500,
  risk_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  training_active_batch VARCHAR(50) NOT NULL DEFAULT '2026-01_cold_start',
  held_message TEXT NOT NULL DEFAULT 'Your comment is being reviewed.',
  rejected_message TEXT NOT NULL DEFAULT 'Your comment could not be posted.',
  layer1_blocklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Ensure default stays aligned (idempotent migration)
ALTER TABLE public.safety_settings
  ALTER COLUMN model_id SET DEFAULT 'gemini-1.5-flash';
ALTER TABLE public.safety_settings
  ADD COLUMN IF NOT EXISTS training_active_batch VARCHAR(50) NOT NULL DEFAULT '2026-01_cold_start';


-- ============================================
-- PART 3: comment_safety_assessments (Audit History)
-- ============================================
--
-- Stores complete safety assessment records for auditing.
-- Each comment may have multiple assessments over time.
-- Latest assessment is referenced by comment_moderation.safety_latest_assessment_id
--
-- @see safety-risk-engine-spec.md §5.2
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.comment_safety_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('APPROVED', 'HELD', 'REJECTED')),

  -- Layer 1: Keyword/Rule hit
  layer1_hit TEXT,

  -- Layer 2: RAG context (top-k matches)
  layer2_context JSONB DEFAULT '[]'::jsonb,

  -- Layer 3: LLM output
  provider VARCHAR(50) DEFAULT 'gemini',
  model_id TEXT,
  ai_risk_level VARCHAR(20) CHECK (ai_risk_level IS NULL OR ai_risk_level IN ('Safe', 'High_Risk', 'Uncertain')),
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  ai_reason TEXT,
  latency_ms INTEGER,

  -- Feedback loop (human review)
  human_label VARCHAR(30) CHECK (human_label IS NULL OR human_label IN (
    'True_Positive', 'False_Positive', 'True_Negative', 'False_Negative'
  )),
  human_reviewed_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (human_reviewed_status IN (
    'pending', 'verified_safe', 'verified_risk', 'corrected'
  )),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ
);

-- Ensure ETL source column exists (idempotent migration)
ALTER TABLE public.comment_safety_assessments
  ADD COLUMN IF NOT EXISTS human_reviewed_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (human_reviewed_status IN (
    'pending', 'verified_safe', 'verified_risk', 'corrected'
  ));

-- Indexes for queue queries
CREATE INDEX IF NOT EXISTS idx_comment_safety_assessments_comment 
  ON public.comment_safety_assessments(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_safety_assessments_decision 
  ON public.comment_safety_assessments(decision, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_safety_assessments_created 
  ON public.comment_safety_assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_safety_assessments_human_reviewed_status
  ON public.comment_safety_assessments(human_reviewed_status, created_at DESC);


-- ============================================
-- PART 4: safety_training_datasets (Fine-tuning Dataset)
-- ============================================
--
-- Curated training samples for Gemini fine-tuning.
-- Decoupled from operational logs (comment_safety_assessments).
--
-- @see safety-risk-engine-spec.md §9.6
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.safety_training_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_messages JSONB NOT NULL CONSTRAINT safety_training_datasets_input_messages_is_array_check CHECK (jsonb_typeof(input_messages) = 'array'),
  output_json JSONB NOT NULL CONSTRAINT safety_training_datasets_output_json_is_object_check CHECK (jsonb_typeof(output_json) = 'object'),
  source_log_id UUID REFERENCES public.comment_safety_assessments(id) ON DELETE SET NULL,
  dataset_batch VARCHAR(50) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Option C migration: upgrade legacy columns (input_text/output_json TEXT) to JSONB messages
ALTER TABLE public.safety_training_datasets
  ADD COLUMN IF NOT EXISTS input_messages JSONB;

DO $$
BEGIN
  -- Ensure dataset_batch exists (legacy tables may differ)
  ALTER TABLE public.safety_training_datasets
    ADD COLUMN IF NOT EXISTS dataset_batch VARCHAR(50);

  -- Ensure output_json is JSONB (legacy was TEXT)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'safety_training_datasets'
      AND column_name = 'output_json'
      AND data_type <> 'jsonb'
  ) THEN
    ALTER TABLE public.safety_training_datasets
      ALTER COLUMN output_json TYPE JSONB USING output_json::jsonb;
  END IF;

  -- Backfill input_messages from legacy input_text when possible
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'safety_training_datasets'
      AND column_name = 'input_text'
  ) THEN
    UPDATE public.safety_training_datasets
    SET input_messages = CASE
      WHEN input_text LIKE '[SYSTEM]%' AND position(E'\n\n[USER]\n' IN input_text) > 0 THEN
        jsonb_build_array(
          jsonb_build_object(
            'role', 'system',
            'content', replace(split_part(input_text, E'\n\n[USER]\n', 1), E'[SYSTEM]\n', '')
          ),
          jsonb_build_object(
            'role', 'user',
            'content', split_part(input_text, E'\n\n[USER]\n', 2)
          )
        )
      ELSE
        jsonb_build_array(jsonb_build_object('role', 'user', 'content', input_text))
    END
    WHERE input_messages IS NULL AND input_text IS NOT NULL;
  END IF;

  -- Fill any remaining NULLs with a minimal placeholder to satisfy NOT NULL
  UPDATE public.safety_training_datasets
  SET input_messages = jsonb_build_array(jsonb_build_object('role', 'user', 'content', ''))
  WHERE input_messages IS NULL;

  -- Enforce NOT NULL for input_messages
  ALTER TABLE public.safety_training_datasets
    ALTER COLUMN input_messages SET NOT NULL;

  -- Backfill dataset_batch (avoid NULL which breaks dedupe/cleanup workflows)
  UPDATE public.safety_training_datasets
  SET dataset_batch = COALESCE(
    dataset_batch,
    (SELECT training_active_batch FROM public.safety_settings WHERE id = 1 LIMIT 1),
    'legacy'
  )
  WHERE dataset_batch IS NULL;

  -- Enforce NOT NULL for dataset_batch
  ALTER TABLE public.safety_training_datasets
    ALTER COLUMN dataset_batch SET NOT NULL;

  -- Ensure output_json is NOT NULL
  ALTER TABLE public.safety_training_datasets
    ALTER COLUMN output_json SET NOT NULL;

  -- Ensure check constraints exist (legacy tables created without named constraints)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'safety_training_datasets_input_messages_is_array_check'
  ) THEN
    ALTER TABLE public.safety_training_datasets
      ADD CONSTRAINT safety_training_datasets_input_messages_is_array_check
      CHECK (jsonb_typeof(input_messages) = 'array');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'safety_training_datasets_output_json_is_object_check'
  ) THEN
    ALTER TABLE public.safety_training_datasets
      ADD CONSTRAINT safety_training_datasets_output_json_is_object_check
      CHECK (jsonb_typeof(output_json) = 'object');
  END IF;

  -- Remove legacy default to avoid accidental hardcoding
  ALTER TABLE public.safety_training_datasets
    ALTER COLUMN dataset_batch DROP DEFAULT;
END $$;

-- Drop legacy column after backfill (Option C is input_messages-only)
ALTER TABLE public.safety_training_datasets
  DROP COLUMN IF EXISTS input_text;

-- Indexes for export/selection workflows
CREATE INDEX IF NOT EXISTS idx_safety_training_datasets_created
  ON public.safety_training_datasets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_training_datasets_batch
  ON public.safety_training_datasets(dataset_batch, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_training_datasets_source_log
  ON public.safety_training_datasets(source_log_id);

-- Dedupe: avoid promoting the same source into the same batch twice
CREATE UNIQUE INDEX IF NOT EXISTS uniq_safety_training_datasets_source_batch
  ON public.safety_training_datasets(source_log_id, dataset_batch);


-- ============================================
-- PART 5: Extend comment_moderation (Safety Pointers)
-- ============================================
--
-- Add pointer columns for quick admin list queries.
-- Avoids joins to comment_safety_assessments for common filters.
--
-- ============================================

ALTER TABLE public.comment_moderation
  ADD COLUMN IF NOT EXISTS safety_latest_assessment_id UUID,
  ADD COLUMN IF NOT EXISTS safety_latest_decision VARCHAR(20),
  ADD COLUMN IF NOT EXISTS safety_latest_risk_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS safety_latest_confidence NUMERIC(4,3);

-- FK constraint (separate ALTER to handle IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_comment_moderation_safety_assessment'
    AND table_name = 'comment_moderation'
  ) THEN
    ALTER TABLE public.comment_moderation
      ADD CONSTRAINT fk_comment_moderation_safety_assessment
      FOREIGN KEY (safety_latest_assessment_id) 
      REFERENCES public.comment_safety_assessments(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Index for safety queue filtering
CREATE INDEX IF NOT EXISTS idx_comment_moderation_safety_decision 
  ON public.comment_moderation(safety_latest_decision);


-- ============================================
-- PART 6: Update embeddings target_type CHECK constraint
-- ============================================
--
-- Extend to include safety_slang and safety_case.
--
-- ============================================

ALTER TABLE public.embeddings 
  DROP CONSTRAINT IF EXISTS embeddings_target_type_check;
ALTER TABLE public.embeddings 
  ADD CONSTRAINT embeddings_target_type_check 
  CHECK (target_type IN ('post', 'gallery_item', 'comment', 'safety_slang', 'safety_case'));


-- ============================================
-- PART 7: Update embedding_queue target_type CHECK constraint
-- ============================================
--
-- Extend to include safety_slang and safety_case.
--
-- ============================================

ALTER TABLE public.embedding_queue 
  DROP CONSTRAINT IF EXISTS embedding_queue_target_type_check;
ALTER TABLE public.embedding_queue 
  ADD CONSTRAINT embedding_queue_target_type_check 
  CHECK (target_type IN ('post', 'gallery_item', 'comment', 'safety_slang', 'safety_case'));


-- ============================================
-- PART 8: Enable RLS
-- ============================================

ALTER TABLE public.safety_corpus_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_safety_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_training_datasets ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 9: RLS Policies - safety_corpus_items
-- ============================================
--
-- Admin-only (Owner/Editor).
--
-- ============================================

CREATE POLICY "Admins can read safety corpus items"
  ON public.safety_corpus_items FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Admins can manage safety corpus items"
  ON public.safety_corpus_items FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 10: RLS Policies - safety_settings
-- ============================================
--
-- Admin-only (Owner/Editor).
--
-- ============================================

CREATE POLICY "Admins can read safety settings"
  ON public.safety_settings FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Admins can manage safety settings"
  ON public.safety_settings FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 11: RLS Policies - comment_safety_assessments
-- ============================================
--
-- Admin read (Owner/Editor).
-- INSERT/UPDATE by service_role (comment submit path).
-- Admin can UPDATE for human_label fields.
--
-- ============================================

CREATE POLICY "Admins can read safety assessments"
  ON public.comment_safety_assessments FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Admins can update safety assessments"
  ON public.comment_safety_assessments FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 12: RLS Policies - safety_training_datasets
-- ============================================
--
-- Admin-only (Owner/Editor).
--
-- ============================================

CREATE POLICY "Admins can read safety training datasets"
  ON public.safety_training_datasets FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

CREATE POLICY "Admins can manage safety training datasets"
  ON public.safety_training_datasets FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 13: Grant Permissions
-- ============================================
--
-- RLS policies control WHICH rows; GRANT controls table-level access.
--
-- ============================================

-- safety_corpus_items: admin-only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_corpus_items TO authenticated;

-- safety_settings: admin-only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_settings TO authenticated;

-- comment_safety_assessments: admin read/update, INSERT via service_role
GRANT SELECT, UPDATE ON public.comment_safety_assessments TO authenticated;

-- safety_training_datasets: admin-only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_training_datasets TO authenticated;


-- ============================================
-- PART 14: Data/Constraint Migration (2-state → 3-state)
-- ============================================
--
-- Legacy risk levels used: High/Safe
-- Current risk levels: Safe/High_Risk/Uncertain
--
-- This block is safe to re-run.
--
-- ============================================

DO $$
DECLARE
  c RECORD;
BEGIN
  -- Migrate comment_safety_assessments.ai_risk_level + defaults/constraints
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'comment_safety_assessments'
  ) THEN
    -- Drop any CHECK constraints that reference ai_risk_level (to allow value migration)
    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.comment_safety_assessments'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%ai_risk_level%'
    LOOP
      EXECUTE format(
        'ALTER TABLE public.comment_safety_assessments DROP CONSTRAINT IF EXISTS %I',
        c.conname
      );
    END LOOP;

    -- Ensure provider default
    ALTER TABLE public.comment_safety_assessments
      ALTER COLUMN provider SET DEFAULT 'gemini';

    -- Ensure column exists for ETL source filtering
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'comment_safety_assessments'
        AND column_name = 'human_reviewed_status'
    ) THEN
      ALTER TABLE public.comment_safety_assessments
        ADD COLUMN human_reviewed_status VARCHAR(20) NOT NULL DEFAULT 'pending';
    END IF;

    -- Drop any CHECK constraints that reference human_reviewed_status then re-add
    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.comment_safety_assessments'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%human_reviewed_status%'
    LOOP
      EXECUTE format(
        'ALTER TABLE public.comment_safety_assessments DROP CONSTRAINT IF EXISTS %I',
        c.conname
      );
    END LOOP;

    ALTER TABLE public.comment_safety_assessments
      ADD CONSTRAINT comment_safety_assessments_human_reviewed_status_check
      CHECK (human_reviewed_status IN ('pending', 'verified_safe', 'verified_risk', 'corrected'));

    -- Migrate old values
    UPDATE public.comment_safety_assessments
    SET ai_risk_level = 'High_Risk'
    WHERE ai_risk_level = 'High';

    -- Widen type (safe even if already widened)
    ALTER TABLE public.comment_safety_assessments
      ALTER COLUMN ai_risk_level TYPE VARCHAR(20);

    -- Re-add tri-state constraint
    ALTER TABLE public.comment_safety_assessments
      ADD CONSTRAINT comment_safety_assessments_ai_risk_level_check
      CHECK (ai_risk_level IS NULL OR ai_risk_level IN ('Safe', 'High_Risk', 'Uncertain'));
  END IF;

  -- Migrate comment_moderation.safety_latest_risk_level values (if the column exists)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'comment_moderation'
      AND column_name = 'safety_latest_risk_level'
  ) THEN
    UPDATE public.comment_moderation
    SET safety_latest_risk_level = 'High_Risk'
    WHERE safety_latest_risk_level = 'High';

    ALTER TABLE public.comment_moderation
      ALTER COLUMN safety_latest_risk_level TYPE VARCHAR(20);
  END IF;
END $$;


-- ============================================
-- 完成 DONE
-- ============================================
