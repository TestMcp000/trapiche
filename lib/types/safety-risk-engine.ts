/**
 * Safety Risk Engine Types
 *
 * Domain types for the Safety Risk Engine module.
 * Aligned with doc/specs/proposed/safety-risk-engine-spec.md §5.2.
 *
 * @see doc/specs/proposed/safety-risk-engine-spec.md
 */

// =============================================================================
// Core Decision Types
// =============================================================================

/**
 * Safety decision outcomes.
 * - APPROVED: Content is safe to publish
 * - HELD: Content requires human review (Fail Closed default)
 * - REJECTED: Reserved (not used by Safety V1)
 */
export type SafetyDecision = 'APPROVED' | 'HELD' | 'REJECTED';

/**
 * Risk level classification from LLM.
 */
export type SafetyRiskLevel = 'Safe' | 'High_Risk' | 'Uncertain';

/**
 * Human-reviewed status for fine-tuning ETL.
 * - pending: not reviewed yet
 * - verified_safe: reviewed and confirmed safe
 * - verified_risk: reviewed and confirmed high risk
 * - corrected: model output was wrong and corrected for training
 */
export type SafetyHumanReviewedStatus =
    | 'pending'
    | 'verified_safe'
    | 'verified_risk'
    | 'corrected';

/**
 * Human label for feedback loop (per spec §5.2).
 */
export type SafetyHumanLabel =
    | 'True_Positive'
    | 'False_Positive'
    | 'True_Negative'
    | 'False_Negative';

// =============================================================================
// LLM Response Types
// =============================================================================

/**
 * Expected JSON structure from LLM response.
 * Must match the prompt contract in prompt.ts.
 */
export interface SafetyLlmResponse {
    /** Risk level classification. */
    risk_level: SafetyRiskLevel;

    /** Confidence score (0.0 to 1.0). */
    confidence: number;

    /** Brief explanation of the assessment. */
    reason: string;
}

// =============================================================================
// RAG Context Types
// =============================================================================

/**
 * RAG context item from semantic search.
 * Represents a matched safety corpus item.
 */
export interface SafetyRagContext {
    /** Content text from safety corpus. */
    text: string;

    /** Label/title from safety corpus item. */
    label: string;

    /** Similarity or rerank score. */
    score: number;
}

// =============================================================================
// Assessment Types
// =============================================================================

/**
 * Complete safety assessment draft.
 * Used for creating DB records in comment_safety_assessments.
 * Aligned with spec §5.2.
 */
export interface SafetyAssessmentDraft {
    /** Final decision outcome. */
    decision: SafetyDecision;

    /** Layer 1 blocklist hit (if any). */
    layer1Hit: string | null;

    /** Layer 2 RAG context matches. */
    layer2Context: SafetyRagContext[];

    /** AI provider used (e.g., 'openrouter'). */
    provider: string;

    /** Model ID used for assessment. */
    modelId: string;

    /** Risk level from LLM. */
    aiRiskLevel: SafetyRiskLevel;

    /** Confidence score from LLM. */
    confidence: number;

    /** Reason from LLM. */
    aiReason: string;

    /** Latency in milliseconds (optional, for monitoring). */
    latencyMs?: number;
}

// =============================================================================
// Engine Input/Output Types
// =============================================================================

/**
 * Input for Layer 1 (pure) engine check.
 */
export interface SafetyLayer1Input {
    /** Content to check. */
    content: string;

    /** Blocklist patterns (optional, can be from settings). */
    blocklist?: string[];
}

/**
 * Output from Layer 1 check.
 */
export interface SafetyLayer1Output {
    /** Whether content hit a blocklist pattern. */
    hit: boolean;

    /** Matched pattern (if hit). */
    matched: string | null;

    /** Suggested decision if hit. */
    decision?: SafetyDecision;

    /** Reason for decision. */
    reason?: string;
}

// =============================================================================
// Settings Types
// =============================================================================

/**
 * Safety settings (from safety_settings table).
 * Subset of fields needed by the engine.
 */
export interface SafetyEngineSettings {
    /** Whether safety engine is enabled. */
    isEnabled: boolean;

    /** Model ID for LLM. */
    modelId: string;

    /** Timeout for LLM call in milliseconds. */
    timeoutMs: number;

    /** Confidence threshold for auto-approval. */
    riskThreshold: number;

    /** Active dataset batch ID for fine-tuning ETL/promotions. */
    trainingActiveBatch: string;

    /** Message to show for HELD status. */
    heldMessage: string;

    /** Message to show for REJECTED status. */
    rejectedMessage: string;

    /** Layer 1 blocklist patterns. */
    layer1Blocklist: string[];
}

// =============================================================================
// PII Redaction Types
// =============================================================================

/**
 * Type of PII that was redacted.
 */
export type PiiType = 'email' | 'phone' | 'url' | 'address';

/**
 * Single PII redaction record.
 */
export interface PiiRedaction {
    /** Type of PII. */
    type: PiiType;

    /** Position in original text. */
    start: number;

    /** Position end in original text. */
    end: number;
}

/**
 * Result of PII redaction.
 */
export interface PiiRedactionResult {
    /** Text with PII redacted. */
    text: string;

    /** List of redactions applied. */
    redactions: PiiRedaction[];
}

// =============================================================================
// Admin UI Types
// =============================================================================

/**
 * Safety queue item for admin list view.
 * Represents a HELD comment with safety assessment info.
 */
export interface SafetyQueueItem {
    /** Comment ID. */
    commentId: string;

    /** Comment content snippet. */
    content: string;

    /** Target type (post or gallery_item). */
    targetType: 'post' | 'gallery_item';

    /** Target ID. */
    targetId: string;

    /** Target title for display. */
    targetTitle: string;

    /** Author display name. */
    authorName: string;

    /** Comment created at. */
    createdAt: string;

    /** Latest safety risk level. */
    riskLevel: SafetyRiskLevel | null;

    /** Latest confidence score. */
    confidence: number | null;

    /** AI reason summary. */
    aiReason: string | null;

    /** Layer 1 hit (if any). */
    layer1Hit: string | null;

    /** Assessment ID (for detail fetch). */
    assessmentId: string | null;
}

/**
 * Safety queue filters for admin list.
 */
export interface SafetyQueueFilters {
    /** Filter by risk level. */
    riskLevel?: SafetyRiskLevel;

    /** Minimum confidence threshold. */
    confidenceMin?: number;

    /** Maximum confidence threshold. */
    confidenceMax?: number;

    /** Filter by target type. */
    targetType?: 'post' | 'gallery_item';

    /** Date range start. */
    dateFrom?: string;

    /** Date range end. */
    dateTo?: string;

    /** Search text. */
    search?: string;

    /** Pagination offset. */
    offset?: number;

    /** Page size limit. */
    limit?: number;
}

/**
 * Safety corpus item status.
 */
export type SafetyCorpusStatus = 'draft' | 'active' | 'deprecated';

/**
 * Safety corpus item kind.
 */
export type SafetyCorpusKind = 'slang' | 'case';

/**
 * Safety corpus item for admin CRUD.
 */
export interface SafetyCorpusItem {
    /** Item ID. */
    id: string;

    /** Kind: slang or case. */
    kind: SafetyCorpusKind;

    /** Status: draft, active, deprecated. */
    status: SafetyCorpusStatus;

    /** Label/title. */
    label: string;

    /** Content text. */
    content: string;

    /** Created at. */
    createdAt: string;

    /** Updated at. */
    updatedAt: string;

    /** Created by user ID. */
    createdBy: string | null;

    /** Updated by user ID. */
    updatedBy: string | null;
}

/**
 * Safety assessment detail for admin review.
 */
export interface SafetyAssessmentDetail {
    /** Assessment ID. */
    id: string;

    /** Comment ID. */
    commentId: string;

    /** Created at. */
    createdAt: string;

    /** Decision. */
    decision: SafetyDecision;

    /** Layer 1 blocklist hit. */
    layer1Hit: string | null;

    /** Layer 2 RAG context. */
    layer2Context: SafetyRagContext[];

    /** AI provider. */
    provider: string;

    /** Model ID. */
    modelId: string | null;

    /** AI risk level. */
    aiRiskLevel: SafetyRiskLevel | null;

    /** Confidence score. */
    confidence: number | null;

    /** AI reason. */
    aiReason: string | null;

    /** Latency in ms. */
    latencyMs: number | null;

    /** Human label (feedback). */
    humanLabel: SafetyHumanLabel | null;

    /** Human-reviewed status (fine-tuning ETL). */
    humanReviewedStatus: SafetyHumanReviewedStatus | null;

    /** Reviewed by user ID. */
    reviewedBy: string | null;

    /** Reviewed at. */
    reviewedAt: string | null;
}

// =============================================================================
// Fine-tuning Dataset Types
// =============================================================================

export interface SafetyTrainingDatasetRow {
    id: string;
    inputMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    outputJson: SafetyLlmResponse;
    sourceLogId: string | null;
    datasetBatch: string;
    createdBy: string | null;
    createdAt: string;
}
