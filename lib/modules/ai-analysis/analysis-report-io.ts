/**
 * AI Analysis Report IO Facade
 *
 * Re-exports from capability-scoped modules for backwards compatibility.
 * Maintains existing import paths for app layer code.
 *
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §2.3 - Report management
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */
import 'server-only';

// =============================================================================
// Read Operations (from analysis-reports-read-io.ts)
// =============================================================================

export {
  type CronStatus,
  getReport,
  getReportByUser,
  listReports,
  getPendingReports,
  getCronStatus,
} from './analysis-reports-read-io';

// =============================================================================
// Write Operations (from analysis-reports-write-io.ts)
// =============================================================================

export {
  createReport,
  updateReportStatus,
  deleteReport,
  deleteOldReports,
} from './analysis-reports-write-io';
