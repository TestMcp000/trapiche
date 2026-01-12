import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, '..');
const outDir = path.join(repoRoot, '.test-dist');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function collectTestFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

fs.rmSync(outDir, { recursive: true, force: true });

// Compile TS tests (and their imports) to `.test-dist`
run(process.execPath, [
  path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc'),
  '-p',
  path.join(repoRoot, 'tsconfig.test.json'),
]);

const compiledTestsDir = path.join(outDir, 'tests');
if (!fs.existsSync(compiledTestsDir)) {
  console.error(`No compiled tests found at: ${compiledTestsDir}`);
  process.exit(1);
}

const testFiles = collectTestFiles(compiledTestsDir);
if (testFiles.length === 0) {
  console.error(`No *.test.js files found under: ${compiledTestsDir}`);
  process.exit(1);
}

// Run Node's built-in test runner against compiled JS
const nodeResult = spawnSync(process.execPath, [
  '-r',
  path.join(repoRoot, 'scripts', 'test-alias.cjs'),
  '--test',
  ...testFiles,
], {
  cwd: repoRoot,
  stdio: 'inherit',
});

process.exit(nodeResult.status ?? 1);
