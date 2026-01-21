/**
 * NEXT_PUBLIC_SITE_URL Single Source Guardrail Test
 *
 * Ensures that NEXT_PUBLIC_SITE_URL is ONLY read from lib/site/site-url.ts.
 * Other modules should import SITE_URL from that file, not read the env var directly.
 *
 * @see ARCHITECTURE.md §3.11 (SITE_URL single source)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Recursively find all .ts/.tsx/.mts files in a directory.
 */
function findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules, .next, and other non-source directories
        if (entry.isDirectory()) {
            if (
                entry.name === 'node_modules' ||
                entry.name === '.next' ||
                entry.name === '.git' ||
                entry.name === 'dist' ||
                entry.name === '.test-dist'
            ) {
                continue;
            }
            files.push(...findTypeScriptFiles(fullPath));
        } else if (
            entry.isFile() &&
            (entry.name.endsWith('.ts') ||
                entry.name.endsWith('.tsx') ||
                entry.name.endsWith('.mts'))
        ) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * Check if a file contains actual NEXT_PUBLIC_SITE_URL env access.
 * Detects:
 *   - process.env.NEXT_PUBLIC_SITE_URL
 *   - process.env['NEXT_PUBLIC_SITE_URL']
 *   - process.env["NEXT_PUBLIC_SITE_URL"]
 * Does NOT detect:
 *   - Comments mentioning NEXT_PUBLIC_SITE_URL
 *   - String literals in documentation
 */
function containsSiteUrlEnvReference(filePath: string): boolean {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Match actual env var access patterns:
    // process.env.NEXT_PUBLIC_SITE_URL
    // process.env['NEXT_PUBLIC_SITE_URL']
    // process.env["NEXT_PUBLIC_SITE_URL"]
    const envAccessPattern =
        /process\.env\.(NEXT_PUBLIC_SITE_URL|['"]NEXT_PUBLIC_SITE_URL['"]|\['NEXT_PUBLIC_SITE_URL'\]|\["NEXT_PUBLIC_SITE_URL"\])/;
    return envAccessPattern.test(content);
}

describe('NEXT_PUBLIC_SITE_URL single source', () => {
    // Resolve project root - handle both source and .test-dist execution
    const testDir = __dirname;
    const projectRoot = testDir.includes('.test-dist')
        ? path.resolve(testDir, '..', '..') // .test-dist/tests -> project root
        : path.resolve(testDir, '..'); // tests -> project root

    const allowedFile = path.join(
        projectRoot,
        'lib',
        'site',
        'site-url.ts'
    );

    // Normalize path for comparison
    const normalizedAllowedFile = path.normalize(allowedFile);

    it('NEXT_PUBLIC_SITE_URL should only appear in lib/site/site-url.ts', () => {
        const directories = ['app', 'components', 'lib'].map((d) =>
            path.join(projectRoot, d)
        );

        const violations: string[] = [];

        for (const dir of directories) {
            if (!fs.existsSync(dir)) continue;

            const files = findTypeScriptFiles(dir);

            for (const file of files) {
                const normalizedFile = path.normalize(file);

                // Skip the allowed single source file
                if (normalizedFile === normalizedAllowedFile) continue;

                if (containsSiteUrlEnvReference(file)) {
                    // Get relative path for clearer error message
                    const relPath = path.relative(projectRoot, file);
                    violations.push(relPath);
                }
            }
        }

        if (violations.length > 0) {
            assert.fail(
                `NEXT_PUBLIC_SITE_URL SSoT violation detected!\n\n` +
                `The following files reference NEXT_PUBLIC_SITE_URL directly:\n` +
                violations.map((v) => `  - ${v}`).join('\n') +
                `\n\n` +
                `Fix: Import SITE_URL from '@/lib/site/site-url' instead of reading ` +
                `process.env.NEXT_PUBLIC_SITE_URL directly.\n` +
                `See ARCHITECTURE.md §3.11 for details.`
            );
        }
    });

    it('lib/site/site-url.ts should exist as the single source', () => {
        assert.ok(
            fs.existsSync(allowedFile),
            `Single source file not found: ${allowedFile}`
        );
    });
});
