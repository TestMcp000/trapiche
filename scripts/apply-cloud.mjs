import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const PROJECT_ROOT = process.cwd();

function loadDotenvIfPresent(relPath) {
  const fullPath = path.join(PROJECT_ROOT, relPath);
  if (!existsSync(fullPath)) return;

  const content = readFileSync(fullPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const equalsIndex = line.indexOf('=');
    if (equalsIndex <= 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env: ${key}`);
  }
  return value;
}

function normalizeNav(raw) {
  if (!raw || typeof raw !== 'object') {
    return { version: 2, groups: [] };
  }

  const nav = raw;
  const version = nav.version === 2 ? 2 : 2;
  const groups = Array.isArray(nav.groups) ? nav.groups : [];

  return { version, groups };
}

function ensureMainNavGroup(nav) {
  const mainGroup = {
    id: 'main',
    label: '內容',
    items: [
      { id: 'blog-home', label: '部落格', target: { type: 'blog_index' } },
      { id: 'gallery-home', label: '畫廊', target: { type: 'gallery_index' } },
    ],
  };

  const groups = Array.isArray(nav.groups) ? nav.groups.slice() : [];
  const mainIndex = groups.findIndex((g) => g && typeof g === 'object' && g.id === 'main');

  if (mainIndex === -1) {
    groups.unshift(mainGroup);
    return { version: 2, groups };
  }

  const existing = groups[mainIndex] ?? {};
  const existingItems = Array.isArray(existing.items) ? existing.items.slice() : [];
  const existingItemIds = new Set(existingItems.map((it) => it?.id).filter(Boolean));

  // Ensure order: blog first, gallery second (only if missing).
  if (!existingItemIds.has('gallery-home')) {
    existingItems.unshift(mainGroup.items[1]);
  }
  if (!existingItemIds.has('blog-home')) {
    existingItems.unshift(mainGroup.items[0]);
  }

  groups[mainIndex] = {
    ...existing,
    id: 'main',
    label: typeof existing.label === 'string' && existing.label.trim() ? existing.label : mainGroup.label,
    items: existingItems,
  };

  return { version: 2, groups };
}

function printUsage() {
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/apply-cloud.mjs');
  console.log('');
  console.log('Env sources (first found wins):');
  console.log('  - .env.vercel');
  console.log('  - .env.local');
  console.log('  - .env');
  console.log('');
  console.log('Required env:');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL');
  console.log('  - SUPABASE_SERVICE_ROLE_KEY');
  console.log('');
}

async function main() {
  // Prefer prod-like env first (the repo keeps a dedicated .env.vercel)
  loadDotenvIfPresent('.env.vercel');
  loadDotenvIfPresent('.env.local');
  loadDotenvIfPresent('.env');

  const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const now = new Date().toISOString();

  console.log('==> Enabling features: blog + gallery');
  const { error: upsertFeaturesError } = await supabase
    .from('feature_settings')
    .upsert(
      [
        {
          feature_key: 'blog',
          is_enabled: true,
          display_order: 1,
          description_en: 'Blog posts and articles section',
          description_zh: '部落格文章區塊',
          updated_at: now,
        },
        {
          feature_key: 'gallery',
          is_enabled: true,
          display_order: 2,
          description_en: 'Pinterest-style image gallery',
          description_zh: 'Pinterest 風格圖片畫廊',
          updated_at: now,
        },
      ],
      { onConflict: 'feature_key' }
    );

  if (upsertFeaturesError) {
    throw new Error(`Failed to upsert feature_settings: ${upsertFeaturesError.message}`);
  }

  console.log('==> Ensuring hamburger_nav contains Blog + Gallery links');
  const { data: existingNavRow, error: readNavError } = await supabase
    .from('site_content')
    .select('id, section_key, content_zh, is_published')
    .eq('section_key', 'hamburger_nav')
    .maybeSingle();

  if (readNavError) {
    throw new Error(`Failed to read site_content(hamburger_nav): ${readNavError.message}`);
  }

  const baseNav = normalizeNav(existingNavRow?.content_zh);
  const nextNav = ensureMainNavGroup(baseNav);

  if (!existingNavRow) {
    const { error: insertNavError } = await supabase.from('site_content').insert({
      section_key: 'hamburger_nav',
      content_en: nextNav,
      content_zh: nextNav,
      is_published: true,
      updated_at: now,
    });

    if (insertNavError) {
      throw new Error(`Failed to insert site_content(hamburger_nav): ${insertNavError.message}`);
    }
  } else {
    const { error: updateNavError } = await supabase
      .from('site_content')
      .update({
        content_en: nextNav,
        content_zh: nextNav,
        is_published: true,
        updated_at: now,
      })
      .eq('section_key', 'hamburger_nav');

    if (updateNavError) {
      throw new Error(`Failed to update site_content(hamburger_nav): ${updateNavError.message}`);
    }
  }

  console.log('');
  console.log('DONE');
  console.log('- blog/gallery enabled (feature_settings)');
  console.log('- hamburger_nav updated & published');
  console.log('- Note: frontend caches may take up to ~60s to refresh');
}

main().catch((err) => {
  console.error('');
  console.error('ERROR:', err?.message ?? String(err));
  printUsage();
  process.exit(1);
});

