-- ============================================
-- DROP: Blog Taxonomy v2 (Groups/Topics/Tags)
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-B1–B5)
-- @see doc/meta/STEP_PLAN.md (PR-33)
--
-- ============================================


-- ============================================
-- DROP Policies First (must drop before tables)
-- ============================================

-- blog_groups policies
DROP POLICY IF EXISTS "Anyone can read visible blog groups" ON public.blog_groups;
DROP POLICY IF EXISTS "Admins can manage blog groups" ON public.blog_groups;

-- blog_topics policies
DROP POLICY IF EXISTS "Anyone can read visible blog topics" ON public.blog_topics;
DROP POLICY IF EXISTS "Admins can manage blog topics" ON public.blog_topics;

-- blog_tags policies
DROP POLICY IF EXISTS "Anyone can read blog tags" ON public.blog_tags;
DROP POLICY IF EXISTS "Admins can manage blog tags" ON public.blog_tags;

-- post_topics policies
DROP POLICY IF EXISTS "Anyone can read post topics" ON public.post_topics;
DROP POLICY IF EXISTS "Admins can manage post topics" ON public.post_topics;

-- post_tags policies
DROP POLICY IF EXISTS "Anyone can read post tags" ON public.post_tags;
DROP POLICY IF EXISTS "Admins can manage post tags" ON public.post_tags;


-- ============================================
-- DROP Indexes
-- ============================================

-- blog_groups indexes
DROP INDEX IF EXISTS public.idx_blog_groups_slug;
DROP INDEX IF EXISTS public.idx_blog_groups_sort_order;
DROP INDEX IF EXISTS public.idx_blog_groups_visible;

-- blog_topics indexes
DROP INDEX IF EXISTS public.idx_blog_topics_slug;
DROP INDEX IF EXISTS public.idx_blog_topics_group_id;
DROP INDEX IF EXISTS public.idx_blog_topics_sort_order;
DROP INDEX IF EXISTS public.idx_blog_topics_visible;

-- blog_tags indexes
DROP INDEX IF EXISTS public.idx_blog_tags_slug;

-- post_topics indexes
DROP INDEX IF EXISTS public.idx_post_topics_topic_id;

-- post_tags indexes
DROP INDEX IF EXISTS public.idx_post_tags_tag_id;

-- posts.group_id index
DROP INDEX IF EXISTS public.idx_posts_group_id;


-- ============================================
-- DROP Column from posts (group_id)
-- ============================================

ALTER TABLE public.posts DROP COLUMN IF EXISTS group_id;


-- ============================================
-- DROP Tables (order matters: join tables first)
-- ============================================

DROP TABLE IF EXISTS public.post_tags CASCADE;
DROP TABLE IF EXISTS public.post_topics CASCADE;
DROP TABLE IF EXISTS public.blog_tags CASCADE;
DROP TABLE IF EXISTS public.blog_topics CASCADE;
DROP TABLE IF EXISTS public.blog_groups CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================
