/**
 * Company Settings Getter Tests
 *
 * Guardrail tests for the centralized company settings lookup helper.
 * Ensures consistent behavior for trim, empty-string, and default value handling.
 *
 * @see lib/modules/content/company-settings.ts
 * @see doc/archive/2026-01-21-step-plan-v2-home-uiux-gallery-hotspots-hamburger-nav.md (PR-21)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCompanySettingValue } from '@/lib/modules/content/company-settings';
import type { CompanySetting } from '@/lib/types/content';

// Helper to create mock settings
function createSetting(key: string, value: string): CompanySetting {
    return {
        id: `test-${key}`,
        key,
        value,
        category: 'test',
        label_en: key,
        label_zh: key,
        updated_at: new Date().toISOString(),
    };
}

describe('getCompanySettingValue', () => {
    const mockSettings: CompanySetting[] = [
        createSetting('email', 'test@example.com'),
        createSetting('company_name', '  Test Company  '),
        createSetting('empty_value', ''),
        createSetting('whitespace_only', '   '),
    ];

    it('should return correct value when key exists', () => {
        const result = getCompanySettingValue(mockSettings, 'email');
        assert.strictEqual(result, 'test@example.com');
    });

    it('should trim whitespace from values', () => {
        const result = getCompanySettingValue(mockSettings, 'company_name');
        assert.strictEqual(result, 'Test Company');
    });

    it('should return default when key not found', () => {
        const result = getCompanySettingValue(mockSettings, 'nonexistent');
        assert.strictEqual(result, '');
    });

    it('should return custom default when key not found', () => {
        const result = getCompanySettingValue(mockSettings, 'nonexistent', 'fallback');
        assert.strictEqual(result, 'fallback');
    });

    it('should return default when value is empty string', () => {
        const result = getCompanySettingValue(mockSettings, 'empty_value', 'default');
        assert.strictEqual(result, 'default');
    });

    it('should return default when value is whitespace-only', () => {
        const result = getCompanySettingValue(mockSettings, 'whitespace_only', 'default');
        assert.strictEqual(result, 'default');
    });

    it('should return empty string as default when no default provided', () => {
        const result = getCompanySettingValue(mockSettings, 'empty_value');
        assert.strictEqual(result, '');
    });

    it('should handle empty settings array', () => {
        const result = getCompanySettingValue([], 'any_key', 'fallback');
        assert.strictEqual(result, 'fallback');
    });
});
