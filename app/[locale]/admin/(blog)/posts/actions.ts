'use server';

/**
 * Server actions for blog post management
 *
 * Follows ARCHITECTURE.md principles:
 * - Server actions only do: parse/validate → call lib → revalidate
 * - No direct .from() queries in app layer
 * - IO boundaries enforced via lib/modules/blog/admin-io.ts
 *
 * Uses unified ActionResult<T> type with error codes for i18n/security.
 * @see lib/types/action-result.ts - ActionResult types
 * @see lib/modules/auth/admin-guard.ts - Auth guard helpers
 * @see lib/modules/blog/admin-io.ts - Post IO functions
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
  createPost,
  updatePost,
  deletePost,
  getPostById,
} from '@/lib/modules/blog/admin-io';
import {
  ADMIN_ERROR_CODES,
  actionSuccess,
  actionError,
  type ActionResult,
} from '@/lib/types/action-result';
import { isValidSlug } from '@/lib/validators/slug';
import type { PostInput, Post, Visibility } from '@/lib/types/blog';

// ============================================================================
// Types
// ============================================================================

export interface PostActionInput {
  title_en: string | null;
  title_zh: string | null;
  slug: string;
  content_en: string | null;
  content_zh: string | null;
  excerpt_en: string | null;
  excerpt_zh: string | null;
  cover_image_url_en: string | null;
  cover_image_url_zh: string | null;
  cover_image_alt_en: string | null;
  cover_image_alt_zh: string | null;
  category_id: string | null;
  visibility: Visibility;
  reading_time_minutes: number | null;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_TITLE_LENGTH = 255;
const MAX_EXCERPT_LENGTH = 3000;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Truncate string to max length, return null for empty strings
 */
function sanitizeString(str: string | null | undefined, maxLen: number): string | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length > maxLen ? trimmed.substring(0, maxLen) : trimmed;
}

/**
 * Validate post input (server-side, never trust client)
 * Returns null if valid, or errorCode if invalid
 */
function validatePostInput(input: PostActionInput): typeof ADMIN_ERROR_CODES.VALIDATION_ERROR | null {
  // At least one language must have title + content
  const hasEnglish = input.title_en?.trim() && input.content_en?.trim();
  const hasChinese = input.title_zh?.trim() && input.content_zh?.trim();

  if (!hasEnglish && !hasChinese) {
    return ADMIN_ERROR_CODES.VALIDATION_ERROR;
  }

  // Slug is required and must match format (single source: lib/validators/slug.ts)
  if (!input.slug?.trim() || !isValidSlug(input.slug.trim())) {
    return ADMIN_ERROR_CODES.VALIDATION_ERROR;
  }

  // If cover image exists, alt text is required for SEO/accessibility
  const hasCoverImage = input.cover_image_url_en?.trim() || input.cover_image_url_zh?.trim();
  const hasAltText = input.cover_image_alt_en?.trim() || input.cover_image_alt_zh?.trim();
  if (hasCoverImage && !hasAltText) {
    return ADMIN_ERROR_CODES.VALIDATION_ERROR;
  }

  return null;
}

/**
 * Convert action input to PostInput type for admin-io
 */
function toPostInput(input: PostActionInput): PostInput {
  return {
    title_en: sanitizeString(input.title_en, MAX_TITLE_LENGTH) || '',
    title_zh: sanitizeString(input.title_zh, MAX_TITLE_LENGTH) || undefined,
    slug: input.slug.trim(),
    content_en: input.content_en?.trim() || '',
    content_zh: input.content_zh?.trim() || undefined,
    excerpt_en: sanitizeString(input.excerpt_en, MAX_EXCERPT_LENGTH) || undefined,
    excerpt_zh: sanitizeString(input.excerpt_zh, MAX_EXCERPT_LENGTH) || undefined,
    cover_image_url: input.cover_image_url_en?.trim() || input.cover_image_url_zh?.trim() || undefined,
    cover_image_url_en: input.cover_image_url_en?.trim() || undefined,
    cover_image_url_zh: input.cover_image_url_zh?.trim() || undefined,
    cover_image_alt_en: input.cover_image_alt_en?.trim() || undefined,
    cover_image_alt_zh: input.cover_image_alt_zh?.trim() || undefined,
    category_id: input.category_id || undefined,
    visibility: input.visibility,
    reading_time_minutes: input.reading_time_minutes && input.reading_time_minutes > 0
      ? input.reading_time_minutes
      : undefined,
  };
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Create a new post
 */
export async function createPostAction(
  input: PostActionInput,
  locale: string
): Promise<ActionResult<Post>> {
  try {
    // 1. Auth guard
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    // 2. Validate input (never trust client)
    const validationError = validatePostInput(input);
    if (validationError) {
      return actionError(validationError);
    }

    // 3. Call IO layer
    const postInput = toPostInput(input);
    const post = await createPost(postInput, guard.userId);

    if (!post) {
      return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
    }

    // 4. Revalidate cache/SEO
    revalidateTag('blog', { expire: 0 });
    revalidatePath(`/${locale}/admin/posts`);
    revalidatePath(`/${locale}/blog`);
    revalidatePath('/sitemap.xml');

    return actionSuccess(post);
  } catch (error) {
    console.error('Error creating post:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Update an existing post
 */
export async function updatePostAction(
  postId: string,
  input: PostActionInput,
  locale: string
): Promise<ActionResult<Post>> {
  try {
    // 1. Auth guard
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    // 2. Validate input (never trust client)
    if (!postId) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const validationError = validatePostInput(input);
    if (validationError) {
      return actionError(validationError);
    }

    // 3. Get existing post for revalidation path
    const existingPost = await getPostById(postId);
    if (!existingPost) {
      return actionError(ADMIN_ERROR_CODES.NOT_FOUND);
    }

    // 4. Call IO layer
    const postInput = toPostInput(input);
    const post = await updatePost(postId, postInput);

    if (!post) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    // 5. Revalidate cache/SEO (including old and new detail pages)
    revalidateTag('blog', { expire: 0 });
    revalidatePath(`/${locale}/admin/posts`);
    revalidatePath(`/${locale}/blog`);
    revalidatePath('/sitemap.xml');

    // Revalidate old post detail page (if category/slug changed)
    if (existingPost.category?.slug && existingPost.slug) {
      revalidatePath(`/${locale}/blog/${existingPost.category.slug}/${existingPost.slug}`);
    }
    // Revalidate new post detail page
    if (post.category?.slug && post.slug) {
      revalidatePath(`/${locale}/blog/${post.category.slug}/${post.slug}`);
    }

    return actionSuccess(post);
  } catch (error) {
    console.error('Error updating post:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Delete a post
 */
export async function deletePostAction(
  postId: string,
  locale: string
): Promise<ActionResult<void>> {
  try {
    // 1. Auth guard
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    // 2. Validate input
    if (!postId) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    // 3. Call IO layer
    const success = await deletePost(postId);

    if (!success) {
      return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
    }

    // 4. Revalidate cache/SEO
    revalidateTag('blog', { expire: 0 });
    revalidatePath(`/${locale}/admin/posts`);
    revalidatePath(`/${locale}/blog`);
    revalidatePath('/sitemap.xml');

    return actionSuccess();
  } catch (error) {
    console.error('Error deleting post:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}
