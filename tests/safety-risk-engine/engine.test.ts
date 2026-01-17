/**
 * Safety Engine Tests
 *
 * Tests for lib/modules/safety-risk-engine/engine.ts
 *
 * @see lib/modules/safety-risk-engine/engine.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    checkBlocklist,
    runLayer1Check,
    makeSafetyDecision,
    shouldBlockPublication,
    requiresHumanReview,
    runSafetyEngine,
    DEFAULT_CONFIDENCE_THRESHOLD,
} from '../../lib/modules/safety-risk-engine/engine';

import type { SafetyLlmResponse } from '../../lib/types/safety-risk-engine';

// =============================================================================
// Test Fixtures
// =============================================================================

const TEST_BLOCKLIST = ['自殺方法', '結束生命'];

const HIGH_RISK_RESPONSE: SafetyLlmResponse = {
    risk_level: 'High_Risk',
    confidence: 0.85,
    reason: '包含自殺意念暗示',
};

const SAFE_RESPONSE: SafetyLlmResponse = {
    risk_level: 'Safe',
    confidence: 0.9,
    reason: '正常情緒表達',
};

const LOW_CONFIDENCE_RESPONSE: SafetyLlmResponse = {
    risk_level: 'Safe',
    confidence: 0.5,
    reason: '不確定是否為危機訊號',
};

// =============================================================================
// checkBlocklist Tests
// =============================================================================

describe('Engine - checkBlocklist', () => {
    it('detects blocklist hit', () => {
        const result = checkBlocklist('我想找自殺方法', TEST_BLOCKLIST);

        assert.equal(result.hit, true);
        assert.equal(result.matched, '自殺方法');
        assert.equal(result.decision, 'HELD');
    });

    it('returns no hit for clean content', () => {
        const result = checkBlocklist('今天心情不錯', TEST_BLOCKLIST);

        assert.equal(result.hit, false);
        assert.equal(result.matched, null);
    });

    it('is case insensitive', () => {
        const result = checkBlocklist('TEST自殺方法test', TEST_BLOCKLIST);
        assert.equal(result.hit, true);
    });

    it('handles empty blocklist', () => {
        const result = checkBlocklist('任何內容', []);
        assert.equal(result.hit, false);
    });

    it('handles empty content', () => {
        const result = checkBlocklist('', TEST_BLOCKLIST);
        assert.equal(result.hit, false);
    });

    it('handles null/undefined content', () => {
        const result1 = checkBlocklist(null as unknown as string, TEST_BLOCKLIST);
        const result2 = checkBlocklist(undefined as unknown as string, TEST_BLOCKLIST);

        assert.equal(result1.hit, false);
        assert.equal(result2.hit, false);
    });
});

// =============================================================================
// runLayer1Check Tests
// =============================================================================

describe('Engine - runLayer1Check', () => {
    it('returns result for blocklist hit', () => {
        const result = runLayer1Check({
            content: '找結束生命的方法',
            blocklist: TEST_BLOCKLIST,
        });

        assert.notEqual(result, null);
        assert.equal(result!.hit, true);
        assert.equal(result!.decision, 'HELD');
    });

    it('returns null for clean content', () => {
        const result = runLayer1Check({
            content: '今天是美好的一天',
            blocklist: TEST_BLOCKLIST,
        });

        assert.equal(result, null);
    });

    it('uses empty blocklist when not provided', () => {
        const result = runLayer1Check({ content: '任何內容' });
        assert.equal(result, null);
    });
});

// =============================================================================
// makeSafetyDecision Tests
// =============================================================================

describe('Engine - makeSafetyDecision', () => {
    describe('Fail Closed behavior', () => {
        it('returns HELD for null response', () => {
            const result = makeSafetyDecision(null);

            assert.equal(result.decision, 'HELD');
            assert.ok(result.reason.includes('parse failed'));
        });
    });

    describe('Confidence threshold', () => {
        it('returns HELD for low confidence', () => {
            const result = makeSafetyDecision(LOW_CONFIDENCE_RESPONSE, DEFAULT_CONFIDENCE_THRESHOLD);

            assert.equal(result.decision, 'HELD');
            assert.ok(result.reason.includes('Low confidence'));
        });

        it('uses custom threshold', () => {
            // 0.5 confidence should pass with 0.4 threshold
            const result = makeSafetyDecision(LOW_CONFIDENCE_RESPONSE, 0.4);

            // Should still be Safe (not triggered by low confidence)
            assert.equal(result.decision, 'APPROVED');
        });
    });

    describe('Risk level handling', () => {
        it('returns HELD for High risk', () => {
            const result = makeSafetyDecision(HIGH_RISK_RESPONSE);

            assert.equal(result.decision, 'HELD');
            assert.ok(result.reason.includes('High_Risk'));
        });

        it('returns APPROVED for Safe with high confidence', () => {
            const result = makeSafetyDecision(SAFE_RESPONSE);

            assert.equal(result.decision, 'APPROVED');
            assert.ok(result.reason.includes('Safe'));
        });
    });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('Engine - Helper Functions', () => {
    describe('shouldBlockPublication', () => {
        it('returns true for HELD', () => {
            assert.equal(shouldBlockPublication('HELD'), true);
        });

        it('returns true for REJECTED', () => {
            assert.equal(shouldBlockPublication('REJECTED'), true);
        });

        it('returns false for APPROVED', () => {
            assert.equal(shouldBlockPublication('APPROVED'), false);
        });
    });

    describe('requiresHumanReview', () => {
        it('returns true for HELD', () => {
            assert.equal(requiresHumanReview('HELD'), true);
        });

        it('returns false for REJECTED', () => {
            assert.equal(requiresHumanReview('REJECTED'), false);
        });

        it('returns false for APPROVED', () => {
            assert.equal(requiresHumanReview('APPROVED'), false);
        });
    });
});

// =============================================================================
// runSafetyEngine Tests
// =============================================================================

describe('Engine - runSafetyEngine', () => {
    it('blocks on Layer 1 hit', () => {
        const result = runSafetyEngine({
            content: '提到自殺方法',
            blocklist: TEST_BLOCKLIST,
        });

        assert.equal(result.decision, 'HELD');
        assert.equal(result.blockedByLayer1, true);
        assert.notEqual(result.layer1Hit, null);
    });

    it('uses LLM response when no Layer 1 hit', () => {
        const result = runSafetyEngine({
            content: '需要LLM分析的內容',
            blocklist: TEST_BLOCKLIST,
            llmResponse: SAFE_RESPONSE,
        });

        assert.equal(result.decision, 'APPROVED');
        assert.equal(result.blockedByLayer1, false);
        assert.equal(result.layer1Hit, null);
    });

    it('returns HELD when LLM response is null', () => {
        const result = runSafetyEngine({
            content: '任何內容',
            blocklist: [],
            llmResponse: null,
        });

        assert.equal(result.decision, 'HELD');
        assert.equal(result.blockedByLayer1, false);
    });

    it('respects custom confidence threshold', () => {
        const result = runSafetyEngine({
            content: '內容',
            blocklist: [],
            llmResponse: LOW_CONFIDENCE_RESPONSE,
            confidenceThreshold: 0.4, // Lower threshold
        });

        assert.equal(result.decision, 'APPROVED');
    });

    it('uses pre-computed Layer 1 result', () => {
        const result = runSafetyEngine({
            content: '忽略這個內容',
            blocklist: [],
            layer1Result: {
                hit: true,
                matched: '預先計算的命中',
                decision: 'HELD',
                reason: 'Pre-computed hit',
            },
        });

        assert.equal(result.decision, 'HELD');
        assert.equal(result.blockedByLayer1, true);
        assert.equal(result.layer1Hit, '預先計算的命中');
    });
});
