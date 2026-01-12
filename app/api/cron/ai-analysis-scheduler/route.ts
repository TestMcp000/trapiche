/**
 * AI Analysis Scheduler Cron Worker
 *
 * Processes due analysis schedules and creates pending reports.
 * Called by an external scheduler (e.g. cron-job.org with CRON_SECRET)
 * or Vercel Cron at regular intervals.
 *
 * @see lib/modules/ai-analysis/analysis-schedules-io.ts - Schedule operations
 * @see uiux_refactor.md §4 item 6 - Scheduled Reports
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSchedulesDueNow,
  markScheduleExecuted,
} from '@/lib/modules/ai-analysis/analysis-schedules-io';
import { createReport } from '@/lib/modules/ai-analysis/analysis-reports-write-io';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ProcessResult {
  scheduleId: string;
  scheduleName: string;
  status: 'created' | 'error';
  reportId?: string;
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // 2. Get due schedules
    const schedules = await getSchedulesDueNow();

    if (schedules.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: 'No schedules due for execution',
      });
    }

    // 3. Process each schedule (create pending report)
    const results: ProcessResult[] = [];

    for (const schedule of schedules) {
      try {
        // Create pending report with schedule configuration
        const result = await createReport(schedule.createdBy, {
          templateId: schedule.templateId,
          dataTypes: schedule.dataTypes,
          mode: schedule.mode,
          modelId: schedule.modelId,
          filters: schedule.filters,
          ragConfig: schedule.ragConfig,
        });

        if ('error' in result) {
          throw new Error(result.error);
        }

        const reportId = result.id;

        // Update schedule with next run time
        await markScheduleExecuted(
          schedule.id,
          reportId,
          schedule.scheduleCron,
          schedule.timezone
        );

        results.push({
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          status: 'created',
          reportId,
        });

        console.log(
          `[ai-analysis-scheduler] Created report ${reportId} from schedule ${schedule.id} (${schedule.name})`
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          status: 'error',
          error: errorMessage,
        });

        console.error(
          `[ai-analysis-scheduler] Failed to process schedule ${schedule.id}:`,
          errorMessage
        );
      }
    }

    const successCount = results.filter((r) => r.status === 'created').length;
    const errorCount = results.filter((r) => r.status === 'error').length;

    return NextResponse.json({
      processed: results.length,
      success: successCount,
      errors: errorCount,
      results,
    });
  } catch (error) {
    console.error('[ai-analysis-scheduler] Worker error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
