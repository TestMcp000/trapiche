/**
 * Public Comments API
 * 
 * GET - Fetch approved comments for a target (post or gallery_item)
 * POST - Submit a new comment
 * PATCH - Update a comment
 * DELETE - Delete a comment
 * 
 * Required params: targetType + targetId
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { 
  getCommentsForTarget, 
  getCommentCountForTarget, 
  createComment, 
  deleteComment, 
  updateComment,
  buildPermalink,
  commentToPublicSafe,
  getOwnedCommentIds,
} from '@/lib/modules/comment/io';
import { getAnonLikedItemIds } from '@/lib/reactions/io';
import { collectAllCommentIds, attachLikedByMe } from '@/lib/modules/comment/tree';
import { ANON_ID_COOKIE_NAME, isValidAnonId } from '@/lib/utils/anon-id';
import {
  validateCommentsGetQuery,
  validateCreateCommentRequest,
  validateUpdateCommentRequest,
  validateDeleteCommentQuery,
} from '@/lib/validators/comments';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Validate query parameters
  const validation = validateCommentsGetQuery(searchParams);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { targetType, targetId, countOnly } = validation.data!;

  try {
    if (countOnly) {
      const count = await getCommentCountForTarget(targetType, targetId);
      return NextResponse.json({ count });
    }

    // Get comments (returns CommentPublicSafe[])
    const comments = await getCommentsForTarget(targetType, targetId);

    // Get current user for isMine calculation
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    // Get anon_id from cookie to determine likedByMe
    const cookieStore = await cookies();
    const anonIdCookie = cookieStore.get(ANON_ID_COOKIE_NAME);
    const anonId = anonIdCookie?.value;

    // If we have a valid anonId, fetch liked comment IDs using lib/reactions/io
    let likedCommentIds: Set<string> = new Set();
    if (anonId && isValidAnonId(anonId)) {
      const commentIds = collectAllCommentIds(comments);

      if (commentIds.length > 0) {
        likedCommentIds = await getAnonLikedItemIds(anonId, 'comment', commentIds);
      }
    }

    // Add likedByMe to each comment (including nested replies)
    const commentsWithLikes = attachLikedByMe(comments, likedCommentIds);

    // Add isMine to each comment (server-computed ownership flag)
    // Uses getOwnedCommentIds from io.ts to satisfy architecture boundary
    const commentIds = collectAllCommentIds(commentsWithLikes);
    const ownedIds = currentUserId && commentIds.length > 0
      ? await getOwnedCommentIds(commentIds, targetType, targetId, currentUserId)
      : new Set<string>();
    
    const commentsWithOwnership = attachIsMine(commentsWithLikes, ownedIds);

    return NextResponse.json({ comments: commentsWithOwnership });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

/**
 * Recursively add isMine flag to comments and their replies
 */
function attachIsMine<T extends { id: string; replies?: T[] }>(
  comments: T[],
  ownedIds: Set<string>
): (T & { isMine: boolean; replies?: (T & { isMine: boolean })[] })[] {
  return comments.map(comment => ({
    ...comment,
    isMine: ownedIds.has(comment.id),
    replies: comment.replies
      ? attachIsMine(comment.replies, ownedIds)
      : undefined,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate request body
    const validation = validateCreateCommentRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { targetType, targetId, content, parentId, isAnonymous, honeypotValue, recaptchaToken } = validation.data!;
    
    // Build permalink based on target type
    const permalink = await buildPermalink(targetType, targetId);

    // Get user metadata
    const userMetadata = user.user_metadata || {};
    const fallbackName = userMetadata.full_name || userMetadata.name || user.email?.split('@')[0] || 'Anonymous';
    const displayName = isAnonymous ? 'Anonymous' : fallbackName;
    const avatarUrl = isAnonymous ? null : (userMetadata.avatar_url || userMetadata.picture);

    // Create comment
    const result = await createComment({
      targetType,
      targetId,
      userId: user.id,
      userDisplayName: displayName,
      userAvatarUrl: avatarUrl,
      userEmail: user.email || '',
      content,
      parentId: parentId ?? undefined,
      userAgent: request.headers.get('user-agent') || '',
      headers: request.headers,
      permalink,
      honeypotValue,
      recaptchaToken,
    });

    if (!result.success) {
      const statusCode = result.decision === 'rate_limited' ? 429 : 400;
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      // P0-6: Strip sensitive fields from response
      comment: result.comment ? commentToPublicSafe(result.comment) : undefined,
      decision: result.decision,
      message: result.message,
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const validation = validateDeleteCommentQuery(searchParams);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await deleteComment(validation.data!.commentId, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate request body
    const validation = validateUpdateCommentRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { commentId, content } = validation.data!;
    const result = await updateComment(commentId, user.id, content);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      // P0-6: Strip sensitive fields from response
      comment: result.comment ? commentToPublicSafe(result.comment) : undefined,
      message: result.message || 'Comment updated',
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}
