-- ============================================
-- ADD: Blog Taxonomy v2 (Groups/Topics/Tags)
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-B1–B5)
-- @see doc/meta/STEP_PLAN.md (PR-33)
--
-- Tables:
-- - blog_groups: 大分類 (e.g., 身心健康衛教, 書籍推薦)
-- - blog_topics: 子主題 (e.g., 情緒照顧, 焦慮壓力)
-- - blog_tags: 自由標籤
-- - post_topics: join table (posts <-> topics)
-- - post_tags: join table (posts <-> tags)
--
-- Posts changes:
-- - posts.group_id: FK to blog_groups (nullable for migration)
--
-- ============================================


-- ============================================
-- PART 1: Create Tables
-- ============================================

-- blog_groups: 大分類
CREATE TABLE IF NOT EXISTS public.blog_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_zh TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- blog_topics: 子主題（歸屬於某個 group）
CREATE TABLE IF NOT EXISTS public.blog_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.blog_groups(id) ON DELETE RESTRICT,
  slug TEXT UNIQUE NOT NULL,
  name_zh TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- blog_tags: 自由標籤
CREATE TABLE IF NOT EXISTS public.blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_zh TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- post_topics: join table (many-to-many)
CREATE TABLE IF NOT EXISTS public.post_topics (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.blog_topics(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (post_id, topic_id)
);

-- post_tags: join table (many-to-many)
CREATE TABLE IF NOT EXISTS public.post_tags (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (post_id, tag_id)
);


-- ============================================
-- PART 2: Alter posts table (add group_id)
-- ============================================

-- Add group_id column (nullable for migration; set NOT NULL after data migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'posts'
      AND column_name = 'group_id'
  ) THEN
    ALTER TABLE public.posts
      ADD COLUMN group_id UUID REFERENCES public.blog_groups(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ============================================
-- PART 3: Create Indexes
-- ============================================

-- blog_groups indexes
CREATE INDEX IF NOT EXISTS idx_blog_groups_slug ON public.blog_groups(slug);
CREATE INDEX IF NOT EXISTS idx_blog_groups_sort_order ON public.blog_groups(sort_order);
CREATE INDEX IF NOT EXISTS idx_blog_groups_visible ON public.blog_groups(is_visible);

-- blog_topics indexes
CREATE INDEX IF NOT EXISTS idx_blog_topics_slug ON public.blog_topics(slug);
CREATE INDEX IF NOT EXISTS idx_blog_topics_group_id ON public.blog_topics(group_id);
CREATE INDEX IF NOT EXISTS idx_blog_topics_sort_order ON public.blog_topics(sort_order);
CREATE INDEX IF NOT EXISTS idx_blog_topics_visible ON public.blog_topics(is_visible);

-- blog_tags indexes
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON public.blog_tags(slug);

-- post_topics indexes (composite PK serves as index for (post_id, topic_id))
CREATE INDEX IF NOT EXISTS idx_post_topics_topic_id ON public.post_topics(topic_id);

-- post_tags indexes (composite PK serves as index for (post_id, tag_id))
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON public.post_tags(tag_id);

-- posts.group_id index
CREATE INDEX IF NOT EXISTS idx_posts_group_id ON public.posts(group_id);


-- ============================================
-- PART 4: Enable RLS
-- ============================================

ALTER TABLE public.blog_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 5: RLS Policies
-- ============================================

-- blog_groups: Public read (visible only)
CREATE POLICY "Anyone can read visible blog groups"
  ON public.blog_groups FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

-- blog_groups: Admin manage
CREATE POLICY "Admins can manage blog groups"
  ON public.blog_groups FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- blog_topics: Public read (visible only)
CREATE POLICY "Anyone can read visible blog topics"
  ON public.blog_topics FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

-- blog_topics: Admin manage
CREATE POLICY "Admins can manage blog topics"
  ON public.blog_topics FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- blog_tags: Public read (all tags are public)
CREATE POLICY "Anyone can read blog tags"
  ON public.blog_tags FOR SELECT
  TO anon, authenticated
  USING (true);

-- blog_tags: Admin manage
CREATE POLICY "Admins can manage blog tags"
  ON public.blog_tags FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- post_topics: Public read (for joins)
CREATE POLICY "Anyone can read post topics"
  ON public.post_topics FOR SELECT
  TO anon, authenticated
  USING (true);

-- post_topics: Admin manage
CREATE POLICY "Admins can manage post topics"
  ON public.post_topics FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- post_tags: Public read (for joins)
CREATE POLICY "Anyone can read post tags"
  ON public.post_tags FOR SELECT
  TO anon, authenticated
  USING (true);

-- post_tags: Admin manage
CREATE POLICY "Admins can manage post tags"
  ON public.post_tags FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 6: Grants
-- ============================================

-- Public read access
GRANT SELECT ON public.blog_groups TO anon, authenticated;
GRANT SELECT ON public.blog_topics TO anon, authenticated;
GRANT SELECT ON public.blog_tags TO anon, authenticated;
GRANT SELECT ON public.post_topics TO anon, authenticated;
GRANT SELECT ON public.post_tags TO anon, authenticated;

-- Admin write access
GRANT INSERT, UPDATE, DELETE ON public.blog_groups TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_topics TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_tags TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.post_topics TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.post_tags TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================
