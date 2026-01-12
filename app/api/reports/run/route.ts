/**
 * Reports Run API
 * 
 * POST - Queue and run a new report
 * 
 * 遵循 ARCHITECTURE.md §3.6 & §3.7：
 * - API routes 只做 parse → validate → call lib → return
 * - Admin 驗證使用 lib/modules/auth 的 isSiteAdmin
 * - 請求驗證使用 lib/validators/reports
 * - 報告建立使用 lib/modules/reports/admin-io
 * - 背景執行使用 lib/modules/reports/reports-run-io
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import { queueReport } from '@/lib/modules/reports/admin-io';
import { runReportInBackground } from '@/lib/modules/reports/reports-run-io';
import { validateRunReportRequest } from '@/lib/validators/reports';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin using lib/modules/auth
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateRunReportRequest(body);
    
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error ?? 'Invalid request' },
        { status: 400 }
      );
    }

    const { type } = validation.data;

    // Queue report using lib/modules/reports/admin-io
    const result = await queueReport(type, user.id);

    if (!result.success) {
      if (result.throttled) {
        return NextResponse.json(
          { 
            error: result.message,
            existing_id: result.existingId
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Start the background job (non-blocking)
    // In production, this would be handled by a separate worker/cron
    runReportInBackground(result.reportId, type);

    return NextResponse.json({
      success: true,
      report_id: result.reportId,
      message: `${type} report queued successfully`,
    });
  } catch (error) {
    console.error('Error in reports/run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
