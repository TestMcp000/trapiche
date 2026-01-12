/**
 * Akismet Feedback API
 * 
 * POST - Send spam/ham feedback to Akismet for model training
 * 
 * When an admin approves a comment that was flagged as spam (ham),
 * or marks a comment as spam that was not detected, we report
 * this to Akismet to improve future detection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import { reportSpam, reportHam } from '@/lib/infrastructure/akismet/akismet-io';
import { validateCommentFeedbackRequest } from '@/lib/validators/comments';
import { getCommentForFeedback } from '@/lib/modules/comment/admin-io';

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

export async function POST(request: NextRequest) {
  const { authorized, error } = await verifyAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 401 });
  }

  try {
    const body = await request.json();
    
    // Validate request body
    const validation = validateCommentFeedbackRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { commentId, feedbackType } = validation.data!;

    // Get comment details and permalink using IO function
    const result = await getCommentForFeedback(commentId);
    
    if (!result.success || !result.params) {
      return NextResponse.json({ error: result.error || 'Comment not found' }, { status: 404 });
    }

    // Send feedback to Akismet
    let success: boolean;
    if (feedbackType === 'spam') {
      success = await reportSpam(result.params);
    } else {
      success = await reportHam(result.params);
    }

    if (!success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to send feedback to Akismet (API may not be configured)' 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Reported as ${feedbackType} to Akismet` 
    });
  } catch (error) {
    console.error('Error sending Akismet feedback:', error);
    return NextResponse.json({ error: 'Failed to send feedback' }, { status: 500 });
  }
}
