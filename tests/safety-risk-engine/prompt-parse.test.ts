/**
 * Prompt Composition & Parsing Tests
 *
 * Tests for lib/modules/safety-risk-engine/prompt.ts
 *
 * @see lib/modules/safety-risk-engine/prompt.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    SAFETY_SYSTEM_PROMPT,
    formatRagContext,
    composeSafetyPrompt,
    getSafetyPromptMessages,
    isValidSafetyLlmResponse,
    extractJsonFromResponse,
    parseSafetyLlmResponse,
    normalizeConfidence,
} from '../../lib/modules/safety-risk-engine/prompt';

import type { SafetyRagContext } from '../../lib/types/safety-risk-engine';

// =============================================================================
// Test Fixtures
// =============================================================================

const MOCK_RAG_CONTEXT: SafetyRagContext[] = [
    { text: '登出人生常用於自殺隱喻', label: '登出人生', score: 0.92 },
    { text: '想永遠睡著在此語境下意味著自殺意念', label: '永遠睡著', score: 0.88 },
];

const VALID_LLM_RESPONSE = {
    risk_level: 'High_Risk',
    confidence: 0.85,
    reason: '留言包含自殺意念暗示',
};

// =============================================================================
// formatRagContext Tests
// =============================================================================

describe('Prompt - formatRagContext', () => {
    it('formats RAG context items correctly', () => {
        const result = formatRagContext(MOCK_RAG_CONTEXT);

        assert.ok(result.includes('登出人生'));
        assert.ok(result.includes('92%'));
        assert.ok(result.includes('永遠睡著'));
        assert.ok(result.includes('88%'));
    });

    it('returns placeholder for empty context', () => {
        const result = formatRagContext([]);
        assert.equal(result, '（無相關語料參考）');
    });

    it('returns placeholder for null/undefined', () => {
        const result1 = formatRagContext(null as unknown as SafetyRagContext[]);
        const result2 = formatRagContext(undefined as unknown as SafetyRagContext[]);
        assert.equal(result1, '（無相關語料參考）');
        assert.equal(result2, '（無相關語料參考）');
    });
});

// =============================================================================
// composeSafetyPrompt Tests
// =============================================================================

describe('Prompt - composeSafetyPrompt', () => {
    it('composes prompt with comment and RAG context', () => {
        const comment = '今天很累，想登出人生';
        const result = composeSafetyPrompt(comment, MOCK_RAG_CONTEXT);

        assert.ok(result.includes(comment));
        assert.ok(result.includes('登出人生'));
        assert.ok(result.includes('[RAG 上下文]'));
        assert.ok(result.includes('[留言]'));
    });

    it('composes prompt without RAG context', () => {
        const comment = '一般留言內容';
        const result = composeSafetyPrompt(comment, []);

        assert.ok(result.includes(comment));
        assert.ok(result.includes('（無相關語料參考）'));
    });
});

// =============================================================================
// getSafetyPromptMessages Tests
// =============================================================================

describe('Prompt - getSafetyPromptMessages', () => {
    it('returns array with system and user messages', () => {
        const messages = getSafetyPromptMessages('test comment', []);

        assert.equal(messages.length, 2);
        assert.equal(messages[0].role, 'system');
        assert.equal(messages[1].role, 'user');
    });

    it('includes system prompt content', () => {
        const messages = getSafetyPromptMessages('test', []);
        assert.equal(messages[0].content, SAFETY_SYSTEM_PROMPT);
    });
});

// =============================================================================
// isValidSafetyLlmResponse Tests
// =============================================================================

describe('Prompt - isValidSafetyLlmResponse', () => {
    it('accepts valid response', () => {
        assert.equal(isValidSafetyLlmResponse(VALID_LLM_RESPONSE), true);
    });

    it('accepts Safe risk level', () => {
        const response = { risk_level: 'Safe', confidence: 0.9, reason: 'Normal content' };
        assert.equal(isValidSafetyLlmResponse(response), true);
    });

    it('rejects invalid risk_level', () => {
        const response = { risk_level: 'Medium', confidence: 0.8, reason: 'test' };
        assert.equal(isValidSafetyLlmResponse(response), false);
    });

    it('rejects confidence out of range', () => {
        const response1 = { risk_level: 'High_Risk', confidence: 1.5, reason: 'test' };
        const response2 = { risk_level: 'High_Risk', confidence: -0.1, reason: 'test' };
        assert.equal(isValidSafetyLlmResponse(response1), false);
        assert.equal(isValidSafetyLlmResponse(response2), false);
    });

    it('rejects missing reason', () => {
        const response = { risk_level: 'High_Risk', confidence: 0.8 };
        assert.equal(isValidSafetyLlmResponse(response), false);
    });

    it('rejects empty reason', () => {
        const response = { risk_level: 'High_Risk', confidence: 0.8, reason: '' };
        assert.equal(isValidSafetyLlmResponse(response), false);
    });

    it('rejects null/undefined', () => {
        assert.equal(isValidSafetyLlmResponse(null), false);
        assert.equal(isValidSafetyLlmResponse(undefined), false);
    });

    it('rejects non-object', () => {
        assert.equal(isValidSafetyLlmResponse('string'), false);
        assert.equal(isValidSafetyLlmResponse(123), false);
    });
});

// =============================================================================
// extractJsonFromResponse Tests
// =============================================================================

describe('Prompt - extractJsonFromResponse', () => {
    it('extracts plain JSON', () => {
        const raw = '{"risk_level": "High_Risk", "confidence": 0.85, "reason": "test"}';
        const result = extractJsonFromResponse(raw);
        assert.equal(result, raw);
    });

    it('extracts JSON from markdown code block', () => {
        const json = '{"risk_level": "High_Risk", "confidence": 0.85, "reason": "test"}';
        const raw = '```json\n' + json + '\n```';
        const result = extractJsonFromResponse(raw);
        assert.equal(result, json);
    });

    it('extracts JSON from code block without language', () => {
        const json = '{"risk_level": "Safe", "confidence": 0.9, "reason": "ok"}';
        const raw = '```\n' + json + '\n```';
        const result = extractJsonFromResponse(raw);
        assert.equal(result, json);
    });

    it('extracts JSON with extra whitespace', () => {
        const raw = '  \n  {"risk_level": "High_Risk", "confidence": 0.85, "reason": "test"}  \n  ';
        const result = extractJsonFromResponse(raw);
        assert.ok(result?.includes('"risk_level"'));
    });

    it('returns null for empty string', () => {
        assert.equal(extractJsonFromResponse(''), null);
    });

    it('returns null for non-JSON content', () => {
        assert.equal(extractJsonFromResponse('This is just text'), null);
    });
});

// =============================================================================
// parseSafetyLlmResponse Tests
// =============================================================================

describe('Prompt - parseSafetyLlmResponse', () => {
    it('parses valid JSON response', () => {
        const raw = JSON.stringify(VALID_LLM_RESPONSE);
        const result = parseSafetyLlmResponse(raw);

        assert.notEqual(result, null);
        assert.equal(result!.risk_level, 'High_Risk');
        assert.equal(result!.confidence, 0.85);
    });

    it('parses JSON wrapped in markdown code block', () => {
        const raw = '```json\n' + JSON.stringify(VALID_LLM_RESPONSE) + '\n```';
        const result = parseSafetyLlmResponse(raw);

        assert.notEqual(result, null);
        assert.equal(result!.risk_level, 'High_Risk');
    });

    it('returns null for invalid JSON', () => {
        const raw = '{ invalid json }';
        const result = parseSafetyLlmResponse(raw);
        assert.equal(result, null);
    });

    it('returns null for valid JSON with invalid structure', () => {
        const raw = '{"foo": "bar"}';
        const result = parseSafetyLlmResponse(raw);
        assert.equal(result, null);
    });

    it('returns null for empty input', () => {
        assert.equal(parseSafetyLlmResponse(''), null);
        assert.equal(parseSafetyLlmResponse(null as unknown as string), null);
    });
});

// =============================================================================
// normalizeConfidence Tests
// =============================================================================

describe('Prompt - normalizeConfidence', () => {
    it('returns value in range unchanged', () => {
        assert.equal(normalizeConfidence(0.5), 0.5);
        assert.equal(normalizeConfidence(0), 0);
        assert.equal(normalizeConfidence(1), 1);
    });

    it('clamps values above 1', () => {
        assert.equal(normalizeConfidence(1.5), 1);
        assert.equal(normalizeConfidence(100), 1);
    });

    it('clamps values below 0', () => {
        assert.equal(normalizeConfidence(-0.5), 0);
        assert.equal(normalizeConfidence(-100), 0);
    });

    it('returns 0 for NaN', () => {
        assert.equal(normalizeConfidence(NaN), 0);
    });

    it('returns 0 for non-number', () => {
        assert.equal(normalizeConfidence('0.5' as unknown as number), 0);
    });
});
