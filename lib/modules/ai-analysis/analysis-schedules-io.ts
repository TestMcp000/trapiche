/**
 * AI Analysis Schedules IO (Aggregator)
 *
 * Re-exports all schedule IO submodules for backward compatibility.
 * This module maintains the original import surface to minimize ripple effects.
 *
 * @see lib/types/ai-analysis.ts - Type definitions
 * @see ARCHITECTURE.md §3.4 - IO module split pattern
 */

import 'server-only';

// =============================================================================
// Re-export CRUD Operations
// =============================================================================

export {
  createSchedule,
  listSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  toggleScheduleEnabled,
  mapRowToSchedule,
  mapRowToListItem,
} from './analysis-schedule-crud-io';

export type { ScheduleRow } from './analysis-schedule-crud-io';

// =============================================================================
// Re-export Cron Worker Operations
// =============================================================================

export {
  calculateNextRunTime,
  getSchedulesDueNow,
  markScheduleExecuted,
} from './analysis-schedule-run-io';
