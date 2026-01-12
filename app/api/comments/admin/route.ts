/**
 * Admin Comments API
 * 
 * GET - Fetch all comments with filters
 * PATCH - Approve/reject/mark as spam
 * DELETE - Bulk delete comments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
// Phase 2.4: Import admin functions from admin-io.ts
import {
  getCommentsForAdmin,
  approveComment,
  markAsSpam,
  adminDeleteComment,
  bulkApprove,
  bulkDelete,
  bulkMarkAsSpam,
} from '@/lib/modules/comment/admin-io';
import {
  validateAdminCommentsQuery,
  validateAdminCommentPatchRequest,
  validateAdminCommentDeleteQuery,
} from '@/lib/validators/comments';

/**
 * Verify admin access via DB site_admins
 */
async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { authorized: false, error: 'Unauthorized' };
  }

  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return { authorized: false, error: 'Forbidden' };
  }

  return { authorized: true, user };
}

export async function GET(request: NextRequest) {
  const { authorized, error } = await verifyAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 401 });
  }

  const { searchParams } = new URL(request.url);
  
  // Validate query parameters
  const validation = validateAdminCommentsQuery(searchParams);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { status, targetType, targetId, search, limit, offset } = validation.data!;

  try {
    const result = await getCommentsForAdmin({
      status: status ?? 'all',
      targetType,
      targetId,
      search,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching admin comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { authorized, error } = await verifyAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 401 });
  }

  try {
    const body = await request.json();
    
    // Validate request body
    const validation = validateAdminCommentPatchRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { action, commentId, commentIds } = validation.data!;

    // Bulk actions
    if (commentIds && commentIds.length > 0) {
      let result;
      switch (action) {
        case 'approve':
          result = await bulkApprove(commentIds);
          break;
        case 'spam':
          result = await bulkMarkAsSpam(commentIds);
          break;
        case 'delete':
          result = await bulkDelete(commentIds);
          break;
      }

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: result.message });
    }

    // Single comment actions
    if (!commentId) {
      return NextResponse.json({ error: 'commentId is required for single actions' }, { status: 400 });
    }

    let result;
    switch (action) {
      case 'approve':
        result = await approveComment(commentId);
        break;
      case 'spam':
        result = await markAsSpam(commentId);
        break;
      case 'delete':
        result = await adminDeleteComment(commentId);
        break;
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, comment: result.comment });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { authorized, error } = await verifyAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const validation = validateAdminCommentDeleteQuery(searchParams);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await adminDeleteComment(validation.data!.commentId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}

