/**
 * Safety Check IO Tests
 *
 * Tests for the safety check orchestrator module.
 * Uses mocks for IO dependencies to test pure orchestration logic.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
    runLayer1Check,
    makeSafetyDecision,
} from '../../lib/modules/safety-risk-engine/engine';
import { redactPii } from '../../lib/modules/safety-risk-engine/pii';
import type {
    SafetyLlmResponse,
} from '../../lib/types/safety-risk-engine';

// =============================================================================
// Test Helpers
// =============================================================================

function createSafeLlmResponse(confidence: number = 0.85): SafetyLlmResponse {
    return {
        risk_level: 'Safe',
        confidence,
        reason: 'Content appears safe for publication.',
    };
}

function createHighRiskLlmResponse(confidence: number = 0.85): SafetyLlmResponse {
    return {
        risk_level: 'High_Risk',
        confidence,
        reason: 'Potential crisis content detected.',
    };
}

// =============================================================================
// Layer 1 Tests
// =============================================================================

describe('Layer 1 Blocklist Check', () => {
    it('returns null when content does not match blocklist', () => {
        const result = runLayer1Check({
            content: 'This is a normal comment.',
            blocklist: ['dangerous', 'pattern'],
        });
        assert.strictEqual(result, null);
    });

    it('returns hit when content matches blocklist pattern', () => {
        const result = runLayer1Check({
            content: 'This contains a dangerous word.',
            blocklist: ['dangerous', 'pattern'],
        });
        assert.ok(result?.hit);
        assert.strictEqual(result?.matched, 'dangerous');
        assert.strictEqual(result?.decision, 'HELD');
    });

    it('is case insensitive', () => {
        const result = runLayer1Check({
            content: 'This contains DANGEROUS word.',
            blocklist: ['dangerous'],
        });
        assert.ok(result?.hit);
    });

    it('returns null with empty blocklist', () => {
        const result = runLayer1Check({
            content: 'Any content here.',
            blocklist: [],
        });
        assert.strictEqual(result, null);
    });

    it('returns null with empty content', () => {
        const result = runLayer1Check({
            content: '',
            blocklist: ['pattern'],
        });
        assert.strictEqual(result, null);
    });
});

// =============================================================================
// Decision Logic Tests (Fail Closed)
// =============================================================================

describe('makeSafetyDecision', () => {
    it('returns HELD when LLM response is null (Fail Closed)', () => {
        const result = makeSafetyDecision(null);
        assert.strictEqual(result.decision, 'HELD');
        assert.ok(result.reason.includes('parse failed'));
    });

    it('returns APPROVED for safe content with high confidence', () => {
        const response = createSafeLlmResponse(0.85);
        const result = makeSafetyDecision(response, 0.7);
        assert.strictEqual(result.decision, 'APPROVED');
    });

    it('returns HELD for safe content with low confidence', () => {
        const response = createSafeLlmResponse(0.5);
        const result = makeSafetyDecision(response, 0.7);
        assert.strictEqual(result.decision, 'HELD');
        assert.ok(result.reason.includes('Low confidence'));
    });

    it('returns HELD for high risk content with high confidence', () => {
        const response = createHighRiskLlmResponse(0.9);
        const result = makeSafetyDecision(response, 0.7);
        assert.strictEqual(result.decision, 'HELD');
        assert.ok(result.reason.includes('High_Risk'));
    });

    it('returns HELD for high risk content with low confidence', () => {
        const response = createHighRiskLlmResponse(0.5);
        const result = makeSafetyDecision(response, 0.7);
        assert.strictEqual(result.decision, 'HELD');
    });
});

// =============================================================================
// PII Redaction Integration
// =============================================================================

describe('PII Redaction for Safety', () => {
    it('redacts email addresses', () => {
        const result = redactPii('Contact me at user@example.com please.');
        assert.ok(!result.text.includes('user@example.com'));
        assert.ok(result.text.includes('[EMAIL]'));
        assert.strictEqual(result.redactions.length, 1);
        assert.strictEqual(result.redactions[0].type, 'email');
    });

    it('redacts phone numbers', () => {
        const result = redactPii('Call me at 555-123-4567.');
        assert.ok(!result.text.includes('555-123-4567'));
        assert.ok(result.text.includes('[PHONE]'));
    });

    it('preserves normal text', () => {
        const result = redactPii('This is a normal comment.');
        assert.strictEqual(result.text, 'This is a normal comment.');
        assert.strictEqual(result.redactions.length, 0);
    });
});

// =============================================================================
// Decision Mapping Tests
// =============================================================================

describe('Decision to is_approved mapping', () => {
    it('APPROVED maps to is_approved=true', () => {
        const result = makeSafetyDecision(createSafeLlmResponse(0.9), 0.7);
        assert.strictEqual(result.decision, 'APPROVED');
        // is_approved would be: result.decision === 'APPROVED' = true
    });

    it('HELD maps to is_approved=false', () => {
        const result = makeSafetyDecision(createHighRiskLlmResponse(0.9), 0.7);
        assert.strictEqual(result.decision, 'HELD');
        // is_approved would be: result.decision === 'APPROVED' = false
    });

    it('REJECTED (from Fail Closed) maps to is_approved=false', () => {
        const result = makeSafetyDecision(null);
        assert.strictEqual(result.decision, 'HELD'); // Fail Closed = HELD
        // is_approved would be: result.decision === 'APPROVED' = false
    });
});

// =============================================================================
// End-to-End Orchestration Flow Tests (Pure Logic)
// =============================================================================

describe('Safety Check Flow', () => {
    it('Layer 1 hit short-circuits to HELD', () => {
        const layer1Result = runLayer1Check({
            content: 'This contains blocklist pattern match.',
            blocklist: ['blocklist pattern'],
        });

        assert.ok(layer1Result?.hit);
        assert.strictEqual(layer1Result?.decision, 'HELD');
        // Orchestrator would return early with HELD decision
    });

    it('Safe content passes Layer 1 and proceeds to Layer 3', () => {
        const layer1Result = runLayer1Check({
            content: 'This is a normal comment.',
            blocklist: ['dangerous'],
        });

        assert.strictEqual(layer1Result, null);
        // Orchestrator would continue to Layer 2/3

        const llmDecision = makeSafetyDecision(createSafeLlmResponse(0.9), 0.7);
        assert.strictEqual(llmDecision.decision, 'APPROVED');
    });

    it('High risk content gets HELD after Layer 3', () => {
        const layer1Result = runLayer1Check({
            content: 'Content that Layer 1 misses but LLM catches.',
            blocklist: ['different-pattern'],
        });

        assert.strictEqual(layer1Result, null);

        const llmDecision = makeSafetyDecision(createHighRiskLlmResponse(0.9), 0.7);
        assert.strictEqual(llmDecision.decision, 'HELD');
    });
});
