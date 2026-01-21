/**
 * Company Settings Pure Helpers
 *
 * Pure utility functions for working with company settings data.
 * This module contains no IO operations - only data transformation.
 *
 * @module lib/modules/content/company-settings
 * @see ARCHITECTURE.md §3.4 - Pure modules (no side effects)
 */

import type { CompanySetting } from '@/lib/types/content';

/**
 * Get a company setting value by key
 *
 * Single source of truth for company_settings lookup behavior.
 * Centralizes trim and empty-string handling to prevent drift.
 *
 * @param settings - Array of company settings
 * @param key - Setting key to look up
 * @param defaultValue - Value to return if key not found or value is empty (default: '')
 * @returns Trimmed setting value, or defaultValue if not found/empty
 *
 * @example
 * const email = getCompanySettingValue(settings, 'email');
 * const ctaUrl = getCompanySettingValue(settings, 'home_event_cta_url', 'https://example.com');
 */
export function getCompanySettingValue(
    settings: CompanySetting[],
    key: string,
    defaultValue = ''
): string {
    const setting = settings.find((s) => s.key === key);
    if (!setting) {
        return defaultValue;
    }

    const trimmed = setting.value?.trim() ?? '';
    return trimmed === '' ? defaultValue : trimmed;
}
