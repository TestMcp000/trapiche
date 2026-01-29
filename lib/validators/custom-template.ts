/**
 * Custom Template Validators (Pure Functions)
 *
 * Validates input for custom AI analysis templates.
 * No IO operations - safe for use anywhere.
 *
 * @module lib/validators/custom-template
 * @see lib/types/ai-analysis.ts - CreateCustomTemplateRequest, UpdateCustomTemplateRequest
 * @see doc/specs/completed/ai-analysis-spec.md (custom templates contract)
 */

import {
    type ValidationResult,
    validResult,
    invalidResult,
} from './api-common';

import type {
    CreateCustomTemplateRequest,
    UpdateCustomTemplateRequest,
} from '@/lib/types/ai-analysis';

// =============================================================================
// Constants
// =============================================================================

/** Minimum length for template name */
const MIN_NAME_LENGTH = 1;

/** Maximum length for template name */
const MAX_NAME_LENGTH = 80;

/** Minimum length for prompt text */
const MIN_PROMPT_LENGTH = 1;

/** Maximum length for prompt text (generous limit for complex prompts) */
const MAX_PROMPT_LENGTH = 10000;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate template name.
 * @returns Trimmed name or undefined if invalid
 */
function validateName(name: unknown): ValidationResult<string> {
    if (typeof name !== 'string') {
        return invalidResult('名稱必須為字串');
    }

    const trimmed = name.trim();
    if (trimmed.length < MIN_NAME_LENGTH) {
        return invalidResult('名稱為必填');
    }

    if (trimmed.length > MAX_NAME_LENGTH) {
        return invalidResult(`名稱長度不得超過 ${MAX_NAME_LENGTH} 個字元`);
    }

    return validResult(trimmed);
}

/**
 * Validate prompt text.
 * @returns Validated prompt text
 */
function validatePromptText(promptText: unknown): ValidationResult<string> {
    if (typeof promptText !== 'string') {
        return invalidResult('Prompt 內容必須為字串');
    }

    // Don't trim prompt text - preserve formatting
    if (promptText.length < MIN_PROMPT_LENGTH) {
        return invalidResult('Prompt 內容為必填');
    }

    if (promptText.length > MAX_PROMPT_LENGTH) {
        return invalidResult(`Prompt 內容長度不得超過 ${MAX_PROMPT_LENGTH} 個字元`);
    }

    return validResult(promptText);
}

/**
 * Validate isEnabled flag.
 */
function validateIsEnabled(isEnabled: unknown): ValidationResult<boolean> {
    if (typeof isEnabled !== 'boolean') {
        return invalidResult('isEnabled 必須為布林值');
    }
    return validResult(isEnabled);
}

// =============================================================================
// Validation Error Types
// =============================================================================

export interface CreateCustomTemplateErrors {
    name?: string;
    promptText?: string;
}

export interface UpdateCustomTemplateErrors {
    name?: string;
    promptText?: string;
    isEnabled?: string;
}

// =============================================================================
// Main Validators
// =============================================================================

/**
 * Validate create custom template request.
 *
 * @param input - Raw input data
 * @returns ValidationResult with CreateCustomTemplateRequest
 *
 * @example
 * ```ts
 * const result = validateCreateCustomTemplateInput({
 *   name: 'Weekly Summary',
 *   promptText: 'Summarize the week...'
 * });
 * if (result.valid) {
 *   console.log(result.data.name); // 'Weekly Summary'
 * }
 * ```
 */
export function validateCreateCustomTemplateInput(
    input: unknown
): ValidationResult<CreateCustomTemplateRequest> {
    if (typeof input !== 'object' || input === null) {
        return invalidResult('請求內容必須是物件');
    }

    const req = input as Record<string, unknown>;
    const errors: CreateCustomTemplateErrors = {};

    // Validate name
    const nameResult = validateName(req.name);
    if (!nameResult.valid) {
        errors.name = nameResult.error;
    }

    // Validate promptText
    const promptResult = validatePromptText(req.promptText);
    if (!promptResult.valid) {
        errors.promptText = promptResult.error;
    }

    // Check for errors
    if (Object.keys(errors).length > 0) {
        return {
            valid: false,
            error: Object.values(errors).filter(Boolean).join('; '),
            errors: errors as Record<string, string>,
        };
    }

    return validResult({
        name: nameResult.data!,
        promptText: promptResult.data!,
    });
}

/**
 * Validate update custom template request.
 * All fields are optional, but if provided must be valid.
 *
 * @param input - Raw input data
 * @returns ValidationResult with UpdateCustomTemplateRequest
 */
export function validateUpdateCustomTemplateInput(
    input: unknown
): ValidationResult<UpdateCustomTemplateRequest> {
    if (typeof input !== 'object' || input === null) {
        return invalidResult('請求內容必須是物件');
    }

    const req = input as Record<string, unknown>;
    const errors: UpdateCustomTemplateErrors = {};
    const result: UpdateCustomTemplateRequest = {};

    // Validate name if provided
    if (req.name !== undefined) {
        const nameResult = validateName(req.name);
        if (!nameResult.valid) {
            errors.name = nameResult.error;
        } else {
            result.name = nameResult.data;
        }
    }

    // Validate promptText if provided
    if (req.promptText !== undefined) {
        const promptResult = validatePromptText(req.promptText);
        if (!promptResult.valid) {
            errors.promptText = promptResult.error;
        } else {
            result.promptText = promptResult.data;
        }
    }

    // Validate isEnabled if provided
    if (req.isEnabled !== undefined) {
        const enabledResult = validateIsEnabled(req.isEnabled);
        if (!enabledResult.valid) {
            errors.isEnabled = enabledResult.error;
        } else {
            result.isEnabled = enabledResult.data;
        }
    }

    // Check for errors
    if (Object.keys(errors).length > 0) {
        return {
            valid: false,
            error: Object.values(errors).filter(Boolean).join('; '),
            errors: errors as Record<string, string>,
        };
    }

    // Check that at least one field is provided
    if (Object.keys(result).length === 0) {
        return invalidResult('至少需要提供一個要更新的欄位');
    }

    return validResult(result);
}

// =============================================================================
// Exports for Testing
// =============================================================================

export const _testing = {
    MIN_NAME_LENGTH,
    MAX_NAME_LENGTH,
    MIN_PROMPT_LENGTH,
    MAX_PROMPT_LENGTH,
    validateName,
    validatePromptText,
    validateIsEnabled,
};
