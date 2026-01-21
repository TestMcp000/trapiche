/**
 * SEO Canonical Redirects Tests
 *
 * PR-17: Guardrail tests to ensure canonicalization uses permanentRedirect (301/308),
 * not redirect (307), as required by ARCHITECTURE.md §3.11.
 *
 * @see ARCHITECTURE.md §3.11 (SEO / URL 單一來源)
 * @see doc/meta/STEP_PLAN.md PR-17 (Gallery item canonicalization)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GALLERY_ITEM_PAGE_PATH = join(
    process.cwd(),
    'app/[locale]/gallery/items/[category]/[slug]/page.tsx'
);

describe('SEO Canonical Redirects (ARCHITECTURE.md §3.11 compliance)', () => {
    describe('Gallery item page canonicalization', () => {
        it('must use permanentRedirect, not redirect', () => {
            const content = readFileSync(GALLERY_ITEM_PAGE_PATH, 'utf-8');

            // Assert: permanentRedirect is imported and used
            const hasPermanentRedirectImport = /import\s*\{[^}]*permanentRedirect[^}]*\}\s*from\s*['"]next\/navigation['"]/.test(content);
            const hasPermanentRedirectCall = /permanentRedirect\s*\(/.test(content);

            assert.ok(
                hasPermanentRedirectImport,
                'Gallery item page must import permanentRedirect from next/navigation'
            );
            assert.ok(
                hasPermanentRedirectCall,
                'Gallery item page must call permanentRedirect() for canonicalization'
            );

            // Assert: redirect() is NOT used (to avoid 307 temporary redirects)
            // Check import statement: should NOT have standalone 'redirect' (without 'permanent' prefix)
            const importMatch = content.match(/import\s*\{([^}]*)\}\s*from\s*['"]next\/navigation['"]/);
            if (importMatch) {
                const imports = importMatch[1].split(',').map((s) => s.trim());
                const hasStandaloneRedirectImport = imports.some(
                    (imp) => imp === 'redirect' || imp.startsWith('redirect ')
                );
                assert.ok(
                    !hasStandaloneRedirectImport,
                    'Gallery item page must NOT import redirect from next/navigation (use permanentRedirect instead for SEO compliance)'
                );
            }

            // Check for standalone redirect() call in non-comment code lines
            const lines = content.split('\n');
            const hasStandaloneRedirectCall = lines.some((line) => {
                // Skip comment lines
                const trimmed = line.trim();
                if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
                    return false;
                }
                // Skip lines containing permanentRedirect to avoid false positives
                if (line.includes('permanentRedirect')) return false;
                // Match standalone redirect() call - must have word boundary before 'redirect'
                // and NOT be preceded by 'permanent'
                return /(?<!permanent)\bredirect\s*\(/.test(line);
            });

            assert.ok(
                !hasStandaloneRedirectCall,
                'Gallery item page must NOT call redirect() (use permanentRedirect instead to avoid 307 temporary redirects)'
            );
        });
    });
});