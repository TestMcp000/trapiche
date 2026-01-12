import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Tests run with `cwd` = repo root (set by `scripts/test.mjs`)
const repoRoot = process.cwd();

function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function listSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.next' ||
        entry.name === '.git' ||
        entry.name === '.test-dist'
      ) {
        continue;
      }
      files.push(...listSourceFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.mts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function stripComments(source: string): string {
  // This is a pragmatic stripper for architecture checks (not a full TS parser).
  // It intentionally favors fewer false-positives in comment blocks.
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function getTopDirective(source: string): 'use client' | 'use server' | null {
  const lines = source.split(/\r?\n/);
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (inBlockComment) {
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) {
        inBlockComment = true;
      }
      continue;
    }

    if (trimmed.startsWith('//') || trimmed === '') {
      continue;
    }

    if (trimmed === `'use client';` || trimmed === `"use client";`) return 'use client';
    if (trimmed === `'use server';` || trimmed === `"use server";`) return 'use server';

    return null;
  }

  return null;
}

function hasImport(source: string, modulePath: string): boolean {
  return new RegExp(`from\\s+['"]${modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`).test(source);
}

test('Client/server boundaries are consistent', () => {
  const roots = ['app', 'components', 'lib']
    .map((p) => path.join(repoRoot, p))
    .filter((p) => fs.existsSync(p));

  const files = [
    ...roots.flatMap((p) => listSourceFiles(p)),
    path.join(repoRoot, 'middleware.ts'),
    path.join(repoRoot, 'next.config.ts'),
  ].filter((p) => fs.existsSync(p));

  const errors: string[] = [];

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf8');
    const directive = getTopDirective(source);
    const isClient = directive === 'use client';

    const code = stripComments(source);

    const importsSupabaseClient = code.includes(`@/lib/infrastructure/supabase/client`) || code.includes(`'@/lib/infrastructure/supabase/client'`) || code.includes(`"@/lib/infrastructure/supabase/client"`);
    const importsSupabaseServer = code.includes(`@/lib/infrastructure/supabase/server`) || code.includes(`'@/lib/infrastructure/supabase/server'`) || code.includes(`"@/lib/infrastructure/supabase/server"`);

    const importsNextHeaders = hasImport(code, 'next/headers');
    const importsNextServer = hasImport(code, 'next/server');

    const usesBrowserApis =
      /\bwindow\./.test(code) ||
      /\bdocument\./.test(code) ||
      /\bnavigator\./.test(code) ||
      /\blocalStorage\b/.test(code) ||
      /\bsessionStorage\b/.test(code);

    // Rule 1: Anything that uses browser-only APIs must be a client component.
    if (usesBrowserApis && !isClient) {
      errors.push(`${path.relative(repoRoot, filePath)} uses browser APIs but is not a client component`);
    }

    // Rule 2: Supabase browser client must only be imported from client components.
    if (importsSupabaseClient && !isClient) {
      errors.push(`${path.relative(repoRoot, filePath)} imports "@/lib/infrastructure/supabase/client" but is not a client component`);
    }

    // Rule 3: Server-only modules must not be imported from client components.
    if (isClient && (importsSupabaseServer || importsNextHeaders || importsNextServer)) {
      errors.push(`${path.relative(repoRoot, filePath)} is a client component but imports server-only modules (next/headers, next/server, or supabase/server)`);
    }
  }

  assert.deepEqual(errors, []);
});

test('Public UI does not depend on admin-only modules', () => {
  const roots = ['app', 'components']
    .map((p) => path.join(repoRoot, p))
    .filter((p) => fs.existsSync(p));

  const files = roots.flatMap((p) => listSourceFiles(p));
  const errors: string[] = [];

  for (const filePath of files) {
    const rel = toPosixPath(path.relative(repoRoot, filePath));
    const isAdminUi = rel.startsWith('app/[locale]/admin/') || rel.startsWith('components/admin/');
    if (isAdminUi) continue;

    const isPublicUi =
      (rel.startsWith('app/[locale]/') && !rel.startsWith('app/[locale]/admin/')) ||
      (rel.startsWith('components/') && !rel.startsWith('components/admin/'));

    if (!isPublicUi) continue;

    const source = fs.readFileSync(filePath, 'utf8');
    const code = stripComments(source);

    if (code.includes(`@/components/admin`)) {
      errors.push(`${rel} imports admin UI via "@/components/admin"`);
    }

    if (code.includes(`react-image-crop`)) {
      errors.push(`${rel} imports react-image-crop (admin-only dependency)`);
    }
  }

  assert.deepEqual(errors, []);
});

test('Selected lib modules stay pure (no Next/React/Supabase/IO)', () => {
  const pureModules = [
    'lib/utils/reading-time.ts',
    'lib/security/sanitize.ts',
    'lib/seo/hreflang.ts',
    'lib/seo/jsonld.ts',
    'lib/spam/engine.ts',
    'lib/modules/comment/tree.ts',
    'lib/utils/slug.ts',
    'lib/validators/comment-settings.ts',
    'lib/utils/cloudinary-url.ts',
    'lib/security/ip.ts',
    'lib/utils/anon-id.ts',
    // Shop pure modules (Phase A) - migrated to lib/modules/shop
    'lib/modules/shop/variants.ts',
    'lib/modules/shop/pricing.ts',
    'lib/modules/shop/order-status.ts',
    'lib/modules/shop/invoice-schema.ts',
    'lib/modules/shop/payment-config.ts',
    // Theme pure modules (Phase 0)
    'lib/modules/theme/presets.ts',
    'lib/modules/theme/resolve.ts',
    'lib/modules/theme/fonts.ts',
    'lib/modules/theme/font-selection.ts',
  ].map((p) => path.join(repoRoot, p));

  const violations: string[] = [];

  for (const filePath of pureModules) {
    const source = fs.readFileSync(filePath, 'utf8');
    const code = stripComments(source);

    const forbidden = [
      { pattern: /\bfetch\s*\(/, label: 'fetch(' },
      { pattern: /\bconsole\./, label: 'console.*' },
      { pattern: /\bcreateClient\s*\(/, label: 'createClient(' },
      { pattern: /@supabase\//, label: '@supabase/*' },
      { pattern: /from\s+['"]next\//, label: 'next/* import' },
      { pattern: /from\s+['"]react['"]/, label: 'react import' },
      { pattern: /\bwindow\./, label: 'window.*' },
      { pattern: /\bdocument\./, label: 'document.*' },
    ];

    for (const rule of forbidden) {
      if (rule.pattern.test(code)) {
        violations.push(`${path.relative(repoRoot, filePath)} contains forbidden dependency: ${rule.label}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test('Client components do not import server-only/SSR modules (shop boundaries)', () => {
  // P3-2: Forbid 'use client' files from importing:
  // - next/cache
  // - @/lib/modules/shop (to avoid Supabase client in client bundle)
  const roots = ['app', 'components', 'lib']
    .map((p) => path.join(repoRoot, p))
    .filter((p) => fs.existsSync(p));

  const files = roots.flatMap((p) => listSourceFiles(p));
  const errors: string[] = [];

  const forbiddenImports = [
    { pattern: /from\s+['"]next\/cache['"]/, label: 'next/cache' },
    { pattern: /@\/lib\/modules\/shop['"]/, label: '@/lib/modules/shop' },
  ];

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf8');
    const directive = getTopDirective(source);
    const isClient = directive === 'use client';

    if (!isClient) continue;

    const code = stripComments(source);
    const rel = toPosixPath(path.relative(repoRoot, filePath));

    for (const rule of forbiddenImports) {
      if (rule.pattern.test(code)) {
        errors.push(`${rel} is a client component but imports ${rule.label}`);
      }
    }
  }

  assert.deepEqual(errors, []);
});

test('Public UI does not import admin-only heavy dependencies (recharts)', () => {
  // P3-2: public UI should not import admin-only heavy deps like recharts
  const roots = ['app', 'components']
    .map((p) => path.join(repoRoot, p))
    .filter((p) => fs.existsSync(p));

  const files = roots.flatMap((p) => listSourceFiles(p));
  const errors: string[] = [];

  // Admin-only heavy dependencies
  const heavyDeps = ['recharts'];

  for (const filePath of files) {
    const rel = toPosixPath(path.relative(repoRoot, filePath));
    const isAdminUi = rel.startsWith('app/[locale]/admin/') || rel.startsWith('components/admin/');
    if (isAdminUi) continue;

    const isPublicUi =
      (rel.startsWith('app/[locale]/') && !rel.startsWith('app/[locale]/admin/')) ||
      (rel.startsWith('components/') && !rel.startsWith('components/admin/'));

    if (!isPublicUi) continue;

    const source = fs.readFileSync(filePath, 'utf8');
    const code = stripComments(source);

    for (const dep of heavyDeps) {
      if (code.includes(`'${dep}'`) || code.includes(`"${dep}"`)) {
        errors.push(`${rel} imports admin-only heavy dependency: ${dep}`);
      }
    }
  }

  assert.deepEqual(errors, []);
});

test('API routes do not contain direct Supabase queries (IO must be in lib)', () => {
  // Phase 3 guardrail: API routes should delegate DB operations to lib/*/io.ts
  const apiRoutesDir = path.join(repoRoot, 'app', 'api');

  if (!fs.existsSync(apiRoutesDir)) {
    return; // Skip if no API routes
  }

  const routeFiles = listSourceFiles(apiRoutesDir).filter((f) =>
    f.endsWith('route.ts') || f.endsWith('route.tsx')
  );

  const errors: string[] = [];

  // Patterns that indicate direct DB access in routes
  const forbiddenPatterns = [
    { pattern: /\.from\s*\(\s*['"]/, label: '.from(\'...\') - direct Supabase query' },
    { pattern: /createAdminClient\s*\(/, label: 'createAdminClient() - service role in route' },
  ];

  for (const filePath of routeFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    const code = stripComments(source);
    const rel = toPosixPath(path.relative(repoRoot, filePath));

    for (const rule of forbiddenPatterns) {
      if (rule.pattern.test(code)) {
        errors.push(`${rel} contains ${rule.label}`);
      }
    }
  }

  assert.deepEqual(errors, []);
});

test('Service role client is isolated to server-only IO modules', () => {
  const libDir = path.join(repoRoot, 'lib');
  if (!fs.existsSync(libDir)) {
    return;
  }

  const files = listSourceFiles(libDir);
  const errors: string[] = [];

  for (const filePath of files) {
    const rel = toPosixPath(path.relative(repoRoot, filePath));

    // Factory itself is the source of service role access (canonical location).
    if (rel === 'lib/infrastructure/supabase/admin.ts') continue;

    const source = fs.readFileSync(filePath, 'utf8');
    const code = stripComments(source);

    if (!/createAdminClient\s*\(/.test(code)) continue;

    const isAllowedIoModule = /(^|\/)(io|admin-io|payment-io|cache-io|.+-io)\.ts$/.test(rel);
    if (!isAllowedIoModule) {
      errors.push(`${rel} uses createAdminClient() but is not an *-io module`);
    }

    const hasServerOnlyImport = /import\s+['"]server-only['"]/.test(code);
    if (!hasServerOnlyImport) {
      errors.push(`${rel} uses createAdminClient() but is missing import 'server-only';`);
    }
  }

  assert.deepEqual(errors, []);
});

test('External API fetch modules must be *-io.ts with server-only', () => {
  const libDir = path.join(repoRoot, 'lib');
  if (!fs.existsSync(libDir)) return;

  const files = listSourceFiles(libDir);
  const errors: string[] = [];

  for (const filePath of files) {
    const rel = toPosixPath(path.relative(repoRoot, filePath));

    // Skip supabase factories (they have their own rules)
    if (rel.startsWith('lib/infrastructure/supabase/')) continue;
    // Skip cache wrapper (fetch is used for internal Next.js cache)
    if (rel.includes('/cache/')) continue;
    // Skip auth module (uses config/env helpers, not external API)
    if (rel.startsWith('lib/modules/auth/')) continue;
    // Skip security module (pure utility using env for salt)
    if (rel.startsWith('lib/security/')) continue;

    const source = fs.readFileSync(filePath, 'utf8');
    const code = stripComments(source);

    // Check for fetch() usage - this indicates external API I/O
    const usesFetch = /\bfetch\s*\(/.test(code);

    if (!usesFetch) continue;

    const isIoModule = /(^|\/)(io|admin-io|payment-io|cache-io|.+-io)\.ts$/.test(rel);
    if (!isIoModule) {
      errors.push(`${rel} uses fetch() but is not an *-io module`);
      continue;
    }

    const hasServerOnlyImport = /import\s+['"]server-only['"]/.test(code);
    if (!hasServerOnlyImport) {
      errors.push(`${rel} uses fetch() but is missing import 'server-only';`);
    }
  }

  assert.deepEqual(errors, []);
});

test('Admin routes must not contain legacy action file names', () => {
  // P1: Guardrail per uiux_refactor.md §4.1 - admin routes must use actions.ts
  // and not *-action.ts or *-actions.ts to maintain consistent naming.
  const adminDir = path.join(repoRoot, 'app', '[locale]', 'admin');
  if (!fs.existsSync(adminDir)) return;

  const files = listSourceFiles(adminDir);
  const errors: string[] = [];

  // Legacy patterns that should not exist
  const legacyPattern = /-action\.ts$|-actions\.ts$/;

  for (const filePath of files) {
    const rel = toPosixPath(path.relative(repoRoot, filePath));
    const basename = path.basename(filePath);

    if (legacyPattern.test(basename)) {
      errors.push(`${rel} uses legacy action naming; rename to actions.ts`);
    }
  }

  assert.deepEqual(errors, []);
});

test('All IO modules must include server-only import', () => {
  // P1: Guardrail per uiux_refactor.md §3.5 - all *-io.ts modules must be server-only
  // to prevent accidental import into client bundles.
  const libDir = path.join(repoRoot, 'lib');
  if (!fs.existsSync(libDir)) return;

  const files = listSourceFiles(libDir);
  const errors: string[] = [];

  for (const filePath of files) {
    const rel = toPosixPath(path.relative(repoRoot, filePath));

    // Check if this is an IO module
    const isIoModule = /(^|\/)(io|admin-io|payment-io|cache-io|.+-io)\.ts$/.test(rel);
    if (!isIoModule) continue;

    // Skip supabase factories (they have their own rules)
    if (rel.startsWith('lib/infrastructure/supabase/')) continue;

    const source = fs.readFileSync(filePath, 'utf8');
    const code = stripComments(source);

    const hasServerOnlyImport = /import\s+['"]server-only['"]/.test(code);
    if (!hasServerOnlyImport) {
      errors.push(`${rel} is an IO module but is missing import 'server-only';`);
    }
  }

  assert.deepEqual(errors, []);
});

test('AI SDK imports are restricted to allowed locations (bundle guard)', () => {
  // P1: Guardrail per uiux_refactor.md §6.1 - AI SDKs must not leak into client bundle
  // - openai: ONLY allowed in supabase/functions/**
  // - openrouter: ONLY allowed in lib/infrastructure/openrouter/** with server-only, NOT in 'use client' files
  const roots = ['app', 'components', 'lib']
    .map((p) => path.join(repoRoot, p))
    .filter((p) => fs.existsSync(p));

  const files = roots.flatMap((p) => listSourceFiles(p));
  const errors: string[] = [];

  // Patterns for AI SDK imports
  const openaiPattern = /from\s+['"]openai['"]|require\s*\(\s*['"]openai['"]\s*\)/;
  const openrouterPattern = /from\s+['"]openrouter['"]|require\s*\(\s*['"]openrouter['"]\s*\)|['"]openrouter['"]/;

  for (const filePath of files) {
    const rel = toPosixPath(path.relative(repoRoot, filePath));
    const source = fs.readFileSync(filePath, 'utf8');
    const code = stripComments(source);
    const directive = getTopDirective(source);
    const isClient = directive === 'use client';

    // Rule 1: openai SDK is FORBIDDEN in app/components/lib (only allowed in supabase/functions)
    if (openaiPattern.test(code)) {
      errors.push(`${rel} imports 'openai' SDK - only allowed in supabase/functions/**`);
    }

    // Rule 2: openrouter in client components is FORBIDDEN
    if (isClient && openrouterPattern.test(code)) {
      errors.push(`${rel} is a client component but imports/uses 'openrouter'`);
    }

    // Rule 3: openrouter in lib must have server-only (if it's in lib/infrastructure/openrouter)
    if (rel.startsWith('lib/') && openrouterPattern.test(code)) {
      const hasServerOnly = /import\s+['"]server-only['"]/.test(code);
      const isAllowedDir = rel.startsWith('lib/infrastructure/openrouter/');
      if (!isAllowedDir) {
        errors.push(`${rel} uses 'openrouter' but is not in lib/infrastructure/openrouter/`);
      } else if (!hasServerOnly) {
        errors.push(`${rel} uses 'openrouter' but is missing import 'server-only'`);
      }
    }
  }

  assert.deepEqual(errors, []);
});

test('Edge Functions are isolated from Next.js/React runtime', () => {
  // P1: Guardrail per uiux_refactor.md §6.1 - Supabase Edge Functions must not import Next/React
  const edgeFunctionsDir = path.join(repoRoot, 'supabase', 'functions');

  if (!fs.existsSync(edgeFunctionsDir)) {
    // Directory doesn't exist yet - this is expected before Module C implementation
    return;
  }

  const files = listSourceFiles(edgeFunctionsDir);
  const errors: string[] = [];

  // Forbidden patterns for Edge Functions
  const forbiddenPatterns = [
    { pattern: /from\s+['"]next\//, label: 'next/* import' },
    { pattern: /from\s+['"]react['"]/, label: 'react import' },
    { pattern: /from\s+['"]react-dom['"]/, label: 'react-dom import' },
    { pattern: /@\/app\//, label: '@/app/* import (Next.js route)' },
    { pattern: /from\s+['"]@\/app\//, label: '@/app/* import' },
  ];

  for (const filePath of files) {
    const rel = toPosixPath(path.relative(repoRoot, filePath));
    const source = fs.readFileSync(filePath, 'utf8');
    const code = stripComments(source);

    for (const rule of forbiddenPatterns) {
      if (rule.pattern.test(code)) {
        errors.push(`${rel} (Edge Function) imports forbidden module: ${rule.label}`);
      }
    }
  }

  assert.deepEqual(errors, []);
});

test('Import/Export heavy deps must not be in client bundle', () => {
  // P1: Guardrail per uiux_refactor.md §6.1.1 - heavy deps for import/export
  // (gray-matter, jszip, papaparse, exceljs) must stay server-only in lib/modules/import-export/
  const roots = ['app', 'components']
    .map((p) => path.join(repoRoot, p))
    .filter((p) => fs.existsSync(p));

  const files = roots.flatMap((p) => listSourceFiles(p));
  const errors: string[] = [];

  // Heavy deps that must not appear in app/components
  const heavyDeps = ['gray-matter', 'jszip', 'papaparse', 'exceljs'];

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf8');
    const code = stripComments(source);
    const rel = toPosixPath(path.relative(repoRoot, filePath));

    for (const dep of heavyDeps) {
      // Check for import statements
      const importPattern = new RegExp(`from\\s+['"]${dep}['"]`);
      const requirePattern = new RegExp(`require\\s*\\(\\s*['"]${dep}['"]\\s*\\)`);
      if (importPattern.test(code) || requirePattern.test(code)) {
        errors.push(`${rel} imports heavy dep '${dep}' (must be server-only in lib/modules/import-export/)`);
      }
    }
  }

  assert.deepEqual(errors, []);
});

test('Cohere API access is restricted to lib/rerank/ with server-only', () => {
  // P1: Guardrail per uiux_refactor.md §6.4.2 item 3 - Cohere SDK/API access
  // must be restricted to lib/rerank/ and must be server-only
  const roots = ['app', 'components', 'lib']
    .map((p) => path.join(repoRoot, p))
    .filter((p) => fs.existsSync(p));

  const files = roots.flatMap((p) => listSourceFiles(p));
  const errors: string[] = [];

  // Patterns that indicate Cohere API usage
  const coherePatterns = [
    { pattern: /from\s+['"]cohere['"]/, label: 'Cohere SDK import' },
    { pattern: /from\s+['"]cohere-ai['"]/, label: 'Cohere SDK import' },
    { pattern: /api\.cohere\.com/, label: 'Cohere API URL' },
    { pattern: /COHERE_API_KEY/, label: 'COHERE_API_KEY usage' },
  ];

  for (const filePath of files) {
    const rel = toPosixPath(path.relative(repoRoot, filePath));
    const source = fs.readFileSync(filePath, 'utf8');
    const code = stripComments(source);
    const directive = getTopDirective(source);
    const isClient = directive === 'use client';

    for (const rule of coherePatterns) {
      if (!rule.pattern.test(code)) continue;

      // Rule 1: Cohere in client components is FORBIDDEN
      if (isClient) {
        errors.push(`${rel} is a client component but uses ${rule.label}`);
        continue;
      }

      // Rule 2: Cohere must only be in lib/rerank/
      const isAllowedDir = rel.startsWith('lib/rerank/');
      if (!isAllowedDir) {
        errors.push(`${rel} uses ${rule.label} but is not in lib/rerank/`);
        continue;
      }

      // Rule 3: Cohere in lib/rerank/ must have server-only
      const hasServerOnly = /import\s+['"]server-only['"]/.test(code);
      if (!hasServerOnly) {
        errors.push(`${rel} uses ${rule.label} but is missing import 'server-only'`);
      }
    }
  }

  assert.deepEqual(errors, []);
});

test('Admin navigation components must disable prefetch', () => {
  // Guardrail: doc/archive/2025-12-31-admin-performance-archive.md (Admin navigation prefetch={false})
  // on all Link components to prevent unnecessary chunk prefetching on admin entry.
  const navigationFiles = [
    'components/admin/common/AdminSidebar.tsx',
    'components/admin/common/AdminTabs.tsx',
  ].map((p) => path.join(repoRoot, p)).filter((p) => fs.existsSync(p));

  const errors: string[] = [];

  for (const filePath of navigationFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    const code = stripComments(source);
    const rel = toPosixPath(path.relative(repoRoot, filePath));

    // Count <Link occurrences (JSX Link tags, not import statements)
    const linkMatches = code.match(/<Link\b/g) || [];
    const prefetchFalseMatches = code.match(/prefetch=\{false\}/g) || [];

    if (linkMatches.length > prefetchFalseMatches.length) {
      errors.push(
        `${rel} has ${linkMatches.length} <Link> but only ${prefetchFalseMatches.length} have prefetch={false}`
      );
    }
  }

  assert.deepEqual(errors, []);
});
