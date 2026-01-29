/**
 * Comments Export IO Module (Server-only)
 *
 * Orchestrates comments export operations (export-only, no import).
 * Supports JSON and CSV formats.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.11
 * @see uiux_refactor.md §6.1.3 Phase 3, §4 item 2
 */
import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import {
  formatCommentsToJsonString,
  type CommentWithReplies,
  type TargetSlugMap,
} from './formatters/comments-json';
import { formatCommentsToCsv } from './formatters/csv/comments-csv';
import type { CommentFull } from '@/lib/types/comments';

// =============================================================================
// Types
// =============================================================================

/** Supported export formats */
export type CommentsExportFormat = 'json' | 'csv';

/** Result of a comments export operation */
export interface CommentsExportResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  stats?: {
    count: number;
    bundleSizeBytes: number;
  };
}

/** Export options */
export interface CommentsExportOptions {
  format?: CommentsExportFormat;
  includeSensitive?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const EXPORTS_BUCKET = 'exports';
const SIGNED_URL_EXPIRY = 60 * 60 * 24;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Upload text content to Supabase Storage and return a signed URL.
 */
async function uploadTextToStorage(
  content: string,
  filename: string,
  contentType: string
): Promise<{ url: string; sizeBytes: number } | { error: string }> {
  const supabase = await createClient();
  const buffer = Buffer.from(content, 'utf-8');

  const { error: uploadError } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .upload(filename, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error('[export-comments-io] uploadContentToStorage upload failed:', uploadError);
    return { error: '上傳失敗' };
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .createSignedUrl(filename, SIGNED_URL_EXPIRY);

  if (signedError || !signedData?.signedUrl) {
    console.error('[export-comments-io] uploadContentToStorage createSignedUrl failed:', signedError);
    return { error: '建立下載連結失敗' };
  }

  return { url: signedData.signedUrl, sizeBytes: buffer.length };
}

/** Generate timestamped filename */
function generateFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${timestamp}.${extension}`;
}

/**
 * Transform raw comment rows to CommentFull format.
 */
function transformToCommentFull(row: Record<string, unknown>): CommentFull {
  return {
    id: row.id as string,
    targetType: row.target_type as 'post' | 'gallery_item',
    targetId: row.target_id as string,
    parentId: row.parent_id as string | null,
    userId: row.user_id as string,
    userDisplayName: row.user_display_name as string,
    userAvatarUrl: row.user_avatar_url as string | null,
    userEmail: (row.moderation as { user_email?: string })?.user_email ?? null,
    content: row.content as string,
    isSpam: row.is_spam as boolean,
    isApproved: row.is_approved as boolean,
    spamScore: (row.moderation as { spam_score?: number })?.spam_score ?? null,
    spamReason: (row.moderation as { spam_reason?: string })?.spam_reason ?? null,
    ipHash: (row.moderation as { ip_hash?: string })?.ip_hash ?? null,
    linkCount: (row.moderation as { link_count?: number })?.link_count ?? 0,
    likeCount: row.like_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Export all comments as a downloadable file.
 */
export async function exportCommentsBundle(
  options: CommentsExportOptions = {}
): Promise<CommentsExportResult> {
  const format = options.format ?? 'json';

  try {
    const supabase = await createClient();

    // Fetch all comments with moderation data
    const { data: commentRows, error: commentsError } = await supabase
      .from('comments')
      .select('*, moderation:comment_moderation(user_email, ip_hash, spam_score, spam_reason, link_count)')
      .order('created_at', { ascending: true });

    if (commentsError) {
      return { success: false, error: commentsError.message };
    }

    // Build target slug maps
    const targetSlugMap: TargetSlugMap = new Map();

    // Get post slugs
    const { data: posts } = await supabase
      .from('posts')
      .select('id, slug');
    for (const post of posts ?? []) {
      targetSlugMap.set(post.id, post.slug);
    }

    // Get gallery item slugs
    const { data: galleryItems } = await supabase
      .from('gallery_items')
      .select('id, slug');
    for (const item of galleryItems ?? []) {
      targetSlugMap.set(item.id, item.slug);
    }

    // Transform to CommentFull and organize by parent
    const allComments = (commentRows ?? []).map(transformToCommentFull);
    
    // Group comments: top-level and replies
    const topLevelComments: CommentWithReplies[] = [];
    const repliesMap = new Map<string, CommentFull[]>();

    for (const comment of allComments) {
      if (comment.parentId) {
        const replies = repliesMap.get(comment.parentId) ?? [];
        replies.push(comment);
        repliesMap.set(comment.parentId, replies);
      } else {
        topLevelComments.push({
          ...comment,
          replies: [],
        });
      }
    }

    // Attach replies to parent comments
    for (const comment of topLevelComments) {
      comment.replies = repliesMap.get(comment.id) ?? [];
    }

    // Format based on requested format
    const content = format === 'csv'
      ? formatCommentsToCsv(topLevelComments, targetSlugMap, { includeSensitive: options.includeSensitive })
      : formatCommentsToJsonString(topLevelComments, targetSlugMap, { includeSensitive: options.includeSensitive });

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = generateFilename('comments', format);

    const uploadResult = await uploadTextToStorage(content, filename, contentType);

    if ('error' in uploadResult) {
      return { success: false, error: uploadResult.error };
    }

    return {
      success: true,
      downloadUrl: uploadResult.url,
      stats: {
        count: allComments.length,
        bundleSizeBytes: uploadResult.sizeBytes,
      },
    };
  } catch (error) {
    console.error('[export-comments-io] exportCommentsBundle failed:', error);
    return {
      success: false,
      error: '匯出失敗',
    };
  }
}
