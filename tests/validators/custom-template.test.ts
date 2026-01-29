/**
 * Custom Template Validator Unit Tests
 *
 * Tests for lib/validators/custom-template.ts
 *
 * @see lib/validators/custom-template.ts
 * @see doc/specs/completed/ai-analysis-spec.md (custom templates contract)
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    validateCreateCustomTemplateInput,
    validateUpdateCustomTemplateInput,
    _testing,
} from '@/lib/validators/custom-template';

const {
    MIN_NAME_LENGTH: _MIN_NAME_LENGTH,
    MAX_NAME_LENGTH,
    MIN_PROMPT_LENGTH: _MIN_PROMPT_LENGTH,
    MAX_PROMPT_LENGTH,
    validateName,
    validatePromptText,
    validateIsEnabled,
} = _testing;

// =============================================================================
// validateName
// =============================================================================

test('validateName: valid names', () => {
    assert.ok(validateName('Test Template').valid);
    assert.equal(validateName('Test Template').data, 'Test Template');
});

test('validateName: trims whitespace', () => {
    const result = validateName('  Trimmed Name  ');
    assert.ok(result.valid);
    assert.equal(result.data, 'Trimmed Name');
});

test('validateName: empty string fails', () => {
    assert.ok(!validateName('').valid);
    assert.ok(!validateName('   ').valid);
});

test('validateName: non-string fails', () => {
    assert.ok(!validateName(null).valid);
    assert.ok(!validateName(undefined).valid);
    assert.ok(!validateName(123).valid);
    assert.ok(!validateName({}).valid);
});

test('validateName: too long fails', () => {
    const longName = 'a'.repeat(MAX_NAME_LENGTH + 1);
    const result = validateName(longName);
    assert.ok(!result.valid);
    assert.ok(result.error?.includes('不得超過'));
});

test('validateName: max length succeeds', () => {
    const maxName = 'a'.repeat(MAX_NAME_LENGTH);
    const result = validateName(maxName);
    assert.ok(result.valid);
    assert.equal(result.data?.length, MAX_NAME_LENGTH);
});

// =============================================================================
// validatePromptText
// =============================================================================

test('validatePromptText: valid prompt', () => {
    const result = validatePromptText('Analyze the data and provide insights.');
    assert.ok(result.valid);
    assert.equal(result.data, 'Analyze the data and provide insights.');
});

test('validatePromptText: preserves formatting', () => {
    const prompt = '  Line 1\n  Line 2  ';
    const result = validatePromptText(prompt);
    assert.ok(result.valid);
    assert.equal(result.data, prompt); // No trim for prompts
});

test('validatePromptText: empty string fails', () => {
    const result = validatePromptText('');
    assert.ok(!result.valid);
    assert.ok(result.error?.includes('必填'));
});

test('validatePromptText: non-string fails', () => {
    assert.ok(!validatePromptText(null).valid);
    assert.ok(!validatePromptText(undefined).valid);
    assert.ok(!validatePromptText(123).valid);
});

test('validatePromptText: too long fails', () => {
    const longPrompt = 'a'.repeat(MAX_PROMPT_LENGTH + 1);
    const result = validatePromptText(longPrompt);
    assert.ok(!result.valid);
    assert.ok(result.error?.includes('不得超過'));
});

// =============================================================================
// validateIsEnabled
// =============================================================================

test('validateIsEnabled: valid booleans', () => {
    assert.ok(validateIsEnabled(true).valid);
    assert.equal(validateIsEnabled(true).data, true);
    assert.ok(validateIsEnabled(false).valid);
    assert.equal(validateIsEnabled(false).data, false);
});

test('validateIsEnabled: non-boolean fails', () => {
    assert.ok(!validateIsEnabled('true').valid);
    assert.ok(!validateIsEnabled(1).valid);
    assert.ok(!validateIsEnabled(null).valid);
    assert.ok(!validateIsEnabled(undefined).valid);
});

// =============================================================================
// validateCreateCustomTemplateInput
// =============================================================================

test('validateCreateCustomTemplateInput: valid input', () => {
    const result = validateCreateCustomTemplateInput({
        name: 'Weekly Summary',
        promptText: 'Summarize the week activities.',
    });
    assert.ok(result.valid);
    assert.equal(result.data?.name, 'Weekly Summary');
    assert.equal(result.data?.promptText, 'Summarize the week activities.');
});

test('validateCreateCustomTemplateInput: trims name', () => {
    const result = validateCreateCustomTemplateInput({
        name: '  Trimmed  ',
        promptText: 'Some prompt',
    });
    assert.ok(result.valid);
    assert.equal(result.data?.name, 'Trimmed');
});

test('validateCreateCustomTemplateInput: missing name fails', () => {
    const result = validateCreateCustomTemplateInput({
        promptText: 'Some prompt',
    });
    assert.ok(!result.valid);
    assert.ok(result.errors?.name);
});

test('validateCreateCustomTemplateInput: missing promptText fails', () => {
    const result = validateCreateCustomTemplateInput({
        name: 'Test',
    });
    assert.ok(!result.valid);
    assert.ok(result.errors?.promptText);
});

test('validateCreateCustomTemplateInput: empty object fails', () => {
    const result = validateCreateCustomTemplateInput({});
    assert.ok(!result.valid);
    assert.ok(result.errors?.name);
    assert.ok(result.errors?.promptText);
});

test('validateCreateCustomTemplateInput: non-object fails', () => {
    assert.ok(!validateCreateCustomTemplateInput(null).valid);
    assert.ok(!validateCreateCustomTemplateInput('string').valid);
    assert.ok(!validateCreateCustomTemplateInput(123).valid);
});

// =============================================================================
// validateUpdateCustomTemplateInput
// =============================================================================

test('validateUpdateCustomTemplateInput: valid partial update (name only)', () => {
    const result = validateUpdateCustomTemplateInput({
        name: 'New Name',
    });
    assert.ok(result.valid);
    assert.equal(result.data?.name, 'New Name');
    assert.equal(result.data?.promptText, undefined);
    assert.equal(result.data?.isEnabled, undefined);
});

test('validateUpdateCustomTemplateInput: valid partial update (promptText only)', () => {
    const result = validateUpdateCustomTemplateInput({
        promptText: 'New prompt text',
    });
    assert.ok(result.valid);
    assert.equal(result.data?.promptText, 'New prompt text');
});

test('validateUpdateCustomTemplateInput: valid partial update (isEnabled only)', () => {
    const result = validateUpdateCustomTemplateInput({
        isEnabled: false,
    });
    assert.ok(result.valid);
    assert.equal(result.data?.isEnabled, false);
});

test('validateUpdateCustomTemplateInput: valid full update', () => {
    const result = validateUpdateCustomTemplateInput({
        name: 'Updated Name',
        promptText: 'Updated prompt',
        isEnabled: true,
    });
    assert.ok(result.valid);
    assert.equal(result.data?.name, 'Updated Name');
    assert.equal(result.data?.promptText, 'Updated prompt');
    assert.equal(result.data?.isEnabled, true);
});

test('validateUpdateCustomTemplateInput: empty object fails', () => {
    const result = validateUpdateCustomTemplateInput({});
    assert.ok(!result.valid);
    assert.ok(result.error?.includes('至少需要提供'));
});

test('validateUpdateCustomTemplateInput: invalid name fails', () => {
    const result = validateUpdateCustomTemplateInput({
        name: '',
    });
    assert.ok(!result.valid);
    assert.ok(result.errors?.name);
});

test('validateUpdateCustomTemplateInput: invalid isEnabled type fails', () => {
    const result = validateUpdateCustomTemplateInput({
        isEnabled: 'true',
    });
    assert.ok(!result.valid);
    assert.ok(result.errors?.isEnabled);
});

test('validateUpdateCustomTemplateInput: non-object fails', () => {
    assert.ok(!validateUpdateCustomTemplateInput(null).valid);
    assert.ok(!validateUpdateCustomTemplateInput('string').valid);
});
