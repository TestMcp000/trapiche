import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

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

function printUsage(exitCode) {
  const lines = [
    '',
    'Usage:',
    '  node scripts/db.mjs <add|seed|drop|reset|list> [--feature <name>]',
    '',
    'Examples:',
    '  node scripts/db.mjs add',
    '  node scripts/db.mjs reset',
    '  node scripts/db.mjs add --feature shop',
    '  node scripts/db.mjs seed --feature theme',
    '',
    'DB URL env:',
    '  - SUPABASE_DB_URL (preferred)',
    '  - DATABASE_URL',
    '',
    'Notes:',
    '  - Requires `psql` in PATH.',
    '  - `shop` add requires Supabase extensions: pg_cron + vault.',
    '',
  ];
  console.error(lines.join('\n'));
  process.exit(exitCode);
}

loadDotenvIfPresent('.env.local');
loadDotenvIfPresent('.env');

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  printUsage(0);
}

const command = args[0];
let feature = null;
for (let i = 1; i < args.length; i += 1) {
  const current = args[i];
  if (current === '--feature' || current === '-f') {
    feature = args[i + 1] ?? null;
    i += 1;
  }
}

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (command !== 'list' && !dbUrl) {
  console.error('Missing DB URL. Set `SUPABASE_DB_URL` (or `DATABASE_URL`).');
  console.error(
    'Supabase Dashboard → Settings → Database → Connection string → URI (use the privileged user for DDL).'
  );
  process.exit(1);
}

const PATHS = {
  combined: {
    add: 'supabase/COMBINED_ADD.sql',
    seed: 'supabase/COMBINED_SEED.sql',
    drop: 'supabase/COMBINED_DROP.sql',
  },
  features: {
    main: {
      add: ['supabase/02_add/01_main.sql'],
      seed: ['supabase/03_seed/01_main.sql', 'supabase/03_seed/06_blog.sql'],
      drop: ['supabase/01_drop/01_main.sql'],
    },
    comments: {
      add: ['supabase/02_add/02_comments.sql'],
      seed: ['supabase/03_seed/02_comments.sql'],
      drop: ['supabase/01_drop/02_comments.sql'],
    },
    reports: {
      add: ['supabase/02_add/03_reports.sql'],
      seed: [],
      drop: ['supabase/01_drop/03_reports.sql'],
    },
    gallery: {
      add: ['supabase/02_add/04_gallery.sql'],
      seed: ['supabase/03_seed/05_gallery.sql'],
      drop: ['supabase/01_drop/04_gallery.sql'],
    },
    reactions: {
      add: ['supabase/02_add/05_reactions.sql', 'supabase/02_add/06_cross_triggers.sql'],
      seed: [],
      drop: ['supabase/01_drop/05_reactions.sql'],
    },
    feature_settings: {
      add: ['supabase/02_add/06_feature_settings.sql'],
      seed: ['supabase/03_seed/04_features_landing.sql'],
      drop: ['supabase/01_drop/06_feature_settings.sql'],
    },
    shop: {
      add: [
        'supabase/02_add/06_feature_settings.sql',
        'supabase/02_add/07_shop.sql',
        'supabase/02_add/08_shop_functions.sql',
      ],
      seed: ['supabase/03_seed/03_shop.sql'],
      drop: ['supabase/01_drop/07_shop.sql'],
    },
    landing_sections: {
      add: ['supabase/02_add/09_landing_sections.sql'],
      seed: ['supabase/03_seed/04_features_landing.sql'],
      drop: ['supabase/01_drop/09_landing_sections.sql'],
    },
    theme: {
      add: ['supabase/02_add/10_theme.sql'],
      seed: ['supabase/03_seed/07_theme.sql'],
      drop: ['supabase/01_drop/10_theme.sql'],
    },
    users: {
      add: ['supabase/02_add/11_users.sql'],
      seed: [],
      drop: ['supabase/01_drop/11_users.sql'],
    },
    ai_analysis: {
      add: ['supabase/02_add/12_ai_analysis.sql', 'supabase/02_add/15_ai_analysis_templates.sql', 'supabase/02_add/17_ai_analysis_custom_template_refs.sql', 'supabase/02_add/18_ai_analysis_report_shares.sql'],
      seed: [],
      drop: ['supabase/01_drop/18_ai_analysis_report_shares.sql', 'supabase/01_drop/17_ai_analysis_custom_template_refs.sql', 'supabase/01_drop/15_ai_analysis_templates.sql', 'supabase/01_drop/12_ai_analysis.sql'],
    },
    embedding: {
      add: ['supabase/02_add/13_embeddings.sql'],
      seed: [],
      drop: ['supabase/01_drop/13_embeddings.sql'],
    },
    page_views: {
      add: ['supabase/02_add/16_page_views.sql'],
      seed: [],
      drop: ['supabase/01_drop/16_page_views.sql'],
    },
  },
};

function resolvePaths(p) {
  const list = Array.isArray(p) ? p : [p];
  return list.map((item) => path.resolve(PROJECT_ROOT, item));
}

function assertFilesExist(filePaths) {
  for (const filePath of filePaths) {
    if (!existsSync(filePath)) {
      console.error(`Missing SQL file: ${filePath}`);
      process.exit(1);
    }
  }
}

function runPsqlFile(filePath) {
  const displayPath = path.relative(PROJECT_ROOT, filePath);
  console.log(`\n==> Running ${displayPath}`);

  const result = spawnSync(
    'psql',
    ['-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f', filePath, dbUrl],
    { stdio: 'inherit' }
  );

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error('`psql` not found. Install PostgreSQL client tools (psql) and ensure it is in PATH.');
      process.exit(1);
    }
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function listFeatures() {
  console.log('Available features:');
  for (const name of Object.keys(PATHS.features)) {
    console.log(`- ${name}`);
  }
}

if (command === 'list') {
  listFeatures();
  process.exit(0);
}

if (!['add', 'seed', 'drop', 'reset'].includes(command)) {
  console.error(`Unknown command: ${command}`);
  printUsage(1);
}

let filesToRun = [];

if (!feature) {
  if (command === 'reset') {
    filesToRun = resolvePaths([
      PATHS.combined.drop,
      PATHS.combined.add,
      PATHS.combined.seed,
    ]);
  } else {
    filesToRun = resolvePaths(PATHS.combined[command]);
  }
} else {
  const entry = PATHS.features[feature];
  if (!entry) {
    console.error(`Unknown feature: ${feature}`);
    listFeatures();
    process.exit(1);
  }

  if (command === 'reset') {
    filesToRun = resolvePaths([...entry.drop, ...entry.add, ...entry.seed]);
  } else {
    filesToRun = resolvePaths(entry[command]);
  }
}

assertFilesExist(filesToRun);

for (const filePath of filesToRun) {
  runPsqlFile(filePath);
}

