/**
 * Safety Risk Engine - Admin IO Module (Aggregator)
 *
 * Re-exports all admin IO submodules for backward compatibility.
 * This module maintains the original import surface to minimize ripple effects.
 *
 * @see doc/specs/completed/safety-risk-engine-spec.md §9.3
 * @see ARCHITECTURE.md §3.4 - IO module split pattern
 */
import 'server-only';

// =============================================================================
// Re-export all submodules
// =============================================================================

// Assessment persistence, moderation pointer updates, and queue read
export {
    insertCommentSafetyAssessment,
    updateCommentModerationSafetyPointer,
    persistSafetyAssessment,
    getSafetyQueueItems,
    getSafetyAssessmentDetail,
} from './assessments-admin-io';
export type { SafetyPointerUpdate } from './assessments-admin-io';

// Moderation actions (label, status, approve, reject)
export {
    labelSafetyAssessment,
    updateSafetyAssessmentHumanReviewedStatus,
    approveSafetyComment,
    rejectSafetyComment,
} from './moderation-admin-io';

// Training dataset operations
export { promoteSafetyAssessmentToTrainingDataset } from './training-dataset-admin-io';

// Corpus CRUD operations
export {
    getSafetyCorpusItems,
    createSafetyCorpusItem,
    updateSafetyCorpusItem,
    updateSafetyCorpusStatus,
    deleteSafetyCorpusItem,
    promoteToCorpus,
} from './corpus-admin-io';

// Settings operations
export {
    getSafetySettingsForAdmin,
    updateSafetySettings,
} from './settings-admin-io';

// =============================================================================
// Re-export types for convenience
// =============================================================================

export type {
    SafetyQueueItem,
    SafetyQueueFilters,
    SafetyCorpusItem,
    SafetyCorpusStatus,
    SafetyCorpusKind,
    SafetyAssessmentDetail,
    SafetyHumanLabel,
} from '@/lib/types/safety-risk-engine';
