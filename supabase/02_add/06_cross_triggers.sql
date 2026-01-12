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
