/**
 * Reports List API
 * 
 * GET - Get list of reports (admin only)
 * 
 * 遵循 ARCHITECTURE.md §3.6 & §3.7：
 * - API types 定義於 lib/types/reports.ts
 * - IO 邏輯集中於 lib/modules/reports/admin-io.ts
 * - Admin 驗證使用 lib/modules/auth 的 isSiteAdmin
 * - 本 route 只做 parse → validate → 呼叫 lib → return
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import { listReports } from '@/lib/modules/reports/admin-io';

export async function GET() {
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

    // Use lib/modules/reports/admin-io for DB operations
    const reports = await listReports(50);

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error('Error in reports list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
