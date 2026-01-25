/**
 * Guardrail test: Home JSON-LD SSoT compliance (ARCHITECTURE.md §3.11)
 * 
 * Ensures that app/[locale]/page.tsx does not contain hardcoded brand fallback strings.
 * The siteName and description must be sourced from:
 * 1. company_settings.company_name_short
 * 2. site_content(section_key='metadata')
 * 3. next-intl translations
 * 
 * NO hardcoded brand strings are allowed.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('Home page.tsx does not contain hardcoded brand fallback strings (ARCHITECTURE §3.11)', () => {
    const pagePath = join(process.cwd(), 'app', '[locale]', 'page.tsx');
    const pageContent = readFileSync(pagePath, 'utf-8');

    // These patterns detect hardcoded brand fallbacks in siteName assignment
    // We check for patterns like: || 'QN LNK' or || 'Quantum Nexus'
    const hardcodedBrandFallbackPatterns = [
        /\|\|\s*['"]QN LNK['"]/,
        /\|\|\s*['"]Quantum Nexus['"]/,
        /\|\|\s*['"]Quantum Nexus LNK['"]/,
    ];

    for (const pattern of hardcodedBrandFallbackPatterns) {
        const match = pattern.exec(pageContent);
        assert.equal(
            match,
            null,
            `Found hardcoded brand fallback in page.tsx: "${match?.[0]}". ` +
            `Per ARCHITECTURE.md §3.11, siteName must use SSoT fallback chain without hardcoded brand strings.`
        );
    }
});

test('Home page.tsx does not contain hardcoded Chinese description strings', () => {
    const pagePath = join(process.cwd(), 'app', '[locale]', 'page.tsx');
    const pageContent = readFileSync(pagePath, 'utf-8');

    // Check for specific hardcoded description that was previously in the file
    const hardcodedDescriptions = [
        '建構連結社群的量子啟發數位解決方案',
    ];

    for (const desc of hardcodedDescriptions) {
        const found = pageContent.includes(desc);
        assert.equal(
            found,
            false,
            `Found hardcoded description in page.tsx: "${desc}". ` +
            `Per ARCHITECTURE.md §3.11, description must be sourced from site_content or i18n.`
        );
    }
});

test('Home page.tsx uses resolveSiteName helper for SSoT compliance', () => {
    const pagePath = join(process.cwd(), 'app', '[locale]', 'page.tsx');
    const pageContent = readFileSync(pagePath, 'utf-8');

    // Verify the SSoT helper function exists and is used
    assert.ok(
        pageContent.includes('resolveSiteName'),
        'page.tsx should use resolveSiteName helper for SSoT fallback chain'
    );

    // Verify the SSoT fallback chain is documented in the helper (documentation requirement)
    const helperPath = join(process.cwd(), 'lib', 'site', 'site-metadata.ts');
    const helperContent = readFileSync(helperPath, 'utf-8');

    assert.ok(
        helperContent.includes('company_settings.company_name_short'),
        'resolveSiteName should document company_settings as priority 1'
    );
});
