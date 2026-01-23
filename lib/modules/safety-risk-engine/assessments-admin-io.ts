/**
 * Safety Risk Engine - Assessments Admin IO Facade
 *
 * Thin aggregator re-exporting from split modules:
 * - assessments-read-admin-io.ts: Queue/detail reads
 * - assessments-write-admin-io.ts: Insert/update/persist
 *
 * @see doc/specs/completed/safety-risk-engine-spec.md §9.3
 * @see ARCHITECTURE.md §3.4 - IO module split
 */
import 'server-only';

// =============================================================================
// Re-exports: Read Operations
// =============================================================================
export {
    getSafetyQueueItems,
    getSafetyAssessmentDetail,
} from './assessments-read-admin-io';

// =============================================================================
// Re-exports: Write Operations
// =============================================================================
export {
    type SafetyPointerUpdate,
    insertCommentSafetyAssessment,
    updateCommentModerationSafetyPointer,
    persistSafetyAssessment,
} from './assessments-write-admin-io';
