/**
 * IO Module Size Inspector
 * Guardrail for ARCHITECTURE.md §3.4: IO 模組不可變成雜物抽屜
 *
 * Rules:
 * - IO modules (`*-io.ts`, `io.ts`, `admin-io.ts`, `*-admin-io.ts`) must be < 300 lines
 * - IO modules must have ≤ 12 exported functions (unless thin facade)
 *
 * Thin Facade Exception (per ARCHITECTURE.md §3.4):
 * - "拆分後允許保留一個薄的 aggregator（例如 lib/modules/embedding/io.ts 只 re-export）"
 * - A thin facade is allowed to exceed 12 exported functions if:
 *   - It has ≤3 direct function definitions (export function / export const =)
 *   - It is primarily re-exporting from other modules (export { } from)
 *   - It stays under the 300 line limit
 *
 * Usage:
 *   node scripts/inspect-io-module-size.mjs          # List all IO modules with stats
 *   node scripts/inspect-io-module-size.mjs --check  # Exit(1) if any violations
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const LIB_DIR = path.join(REPO_ROOT, "lib");

const MAX_LINES = 300;
const MAX_EXPORTED_FUNCTIONS = 12;
const MAX_DIRECT_EXPORTS_FOR_FACADE = 3;

const IGNORED_DIR_NAMES = new Set([
  ".git",
  ".next",
  ".test-dist",
  "node_modules",
]);

// Matches IO module filenames: io.ts, *-io.ts, admin-io.ts, *-admin-io.ts
const IO_MODULE_PATTERN = /(?:^io\.ts$|.*-io\.ts$)/;

// ─────────────────────────────────────────────────────────────────────────────
// File Collection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively collect all IO module files under the given directory.
 * @param {string} dirPath - The directory to scan
 * @returns {Promise<string[]>} Array of absolute file paths
 */
async function collectIoModules(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIR_NAMES.has(entry.name)) continue;
      files.push(...(await collectIoModules(fullPath)));
      continue;
    }

    if (entry.isFile() && IO_MODULE_PATTERN.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

// ─────────────────────────────────────────────────────────────────────────────
// Source Analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip single-line and multi-line comments from TypeScript source.
 * This is a pragmatic stripper, not a full TS parser.
 * @param {string} source - The source code
 * @returns {string} Source without comments
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

/**
 * Count the number of lines in source code.
 * @param {string} source - The source code
 * @returns {number} Line count
 */
function countLines(source) {
  return source.split(/\r?\n/).length;
}

/**
 * @typedef {Object} ExportCounts
 * @property {number} direct - Directly defined exports (export function, export const =)
 * @property {number} reExport - Re-exported from other modules (export { } from)
 * @property {number} total - Total exported functions
 */

/**
 * Count exported functions in source code.
 * Counts: export function, export async function, export { ... } re-exports
 * Does NOT count: export type, export interface, export const (non-function)
 * @param {string} source - The source code
 * @returns {ExportCounts} Export counts broken down by type
 */
function countExportedFunctions(source) {
  const code = stripComments(source);
  let direct = 0;
  let reExport = 0;

  // Pattern 1: export function / export async function
  const directExportMatches = code.match(
    /\bexport\s+(?:async\s+)?function\s+\w+/g,
  );
  if (directExportMatches) {
    direct += directExportMatches.length;
  }

  // Pattern 2: export const funcName = (...) => / export const funcName = function
  // This captures arrow functions and function expressions
  const constFunctionMatches = code.match(
    /\bexport\s+const\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function\s*\()/g,
  );
  if (constFunctionMatches) {
    direct += constFunctionMatches.length;
  }

  // Pattern 3: Named re-exports from other modules
  // export { foo, bar } from './module'
  // export { foo as baz } from './module'
  const reExportBlocks = code.matchAll(
    /\bexport\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g,
  );
  for (const match of reExportBlocks) {
    const names = match[1].split(",");
    // Filter out type-only exports: "type Foo", "type Foo as Bar"
    const nonTypeNames = names.filter((n) => !n.trim().startsWith("type "));
    reExport += nonTypeNames.length;
  }

  return { direct, reExport, total: direct + reExport };
}

/**
 * Count exported constants (non-function) in source code.
 * @param {string} source - The source code
 * @returns {number} Exported const count
 */
function countExportedConsts(source) {
  const code = stripComments(source);
  let count = 0;

  // Pattern: export const NAME = <non-function>
  // We need to exclude function expressions and arrow functions
  const lines = code.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip if not an export const
    if (!trimmed.startsWith("export const ")) continue;

    // Skip if it's a function (arrow or function expression)
    if (/=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function\s*\()/.test(trimmed)) {
      continue;
    }

    // Check if it's actually a const declaration (has '=')
    if (trimmed.includes("=")) {
      count++;
    }
  }

  return count;
}

/**
 * Check if a module is a thin facade (primarily re-exports).
 * A thin facade has mostly re-exports and very few direct definitions.
 * Per ARCHITECTURE.md §3.4: "拆分後允許保留一個薄的 aggregator"
 * @param {ExportCounts} exports - Export counts
 * @param {number} lines - Line count
 * @returns {boolean} True if this is a thin facade
 */
function isThinFacade(exports, lines) {
  // A thin facade:
  // 1. Has mostly re-exports (≤3 direct exports allowed for orchestration)
  // 2. Is relatively short (lines <= MAX_LINES)
  // 3. Has re-exports (otherwise it's just a small module)
  return (
    exports.direct <= MAX_DIRECT_EXPORTS_FOR_FACADE &&
    exports.reExport > 0 &&
    lines <= MAX_LINES
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis & Reporting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} IoModuleStats
 * @property {string} path - Relative path from repo root
 * @property {number} lines - Total line count
 * @property {ExportCounts} exports - Export counts (direct, reExport, total)
 * @property {number} exportedConsts - Count of exported constants
 * @property {boolean} isFacade - True if module is a thin facade
 * @property {boolean} violatesLines - True if lines > MAX_LINES
 * @property {boolean} violatesExports - True if total exports > MAX and not a facade
 */

/**
 * Analyze a single IO module file.
 * @param {string} filePath - Absolute path to the file
 * @returns {IoModuleStats} Analysis results
 */
function analyzeIoModule(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const relPath = path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");

  const lines = countLines(source);
  const exports = countExportedFunctions(source);
  const exportedConsts = countExportedConsts(source);
  const isFacade = isThinFacade(exports, lines);

  return {
    path: relPath,
    lines,
    exports,
    exportedConsts,
    isFacade,
    violatesLines: lines > MAX_LINES,
    // Facades are exempt from the export count limit
    violatesExports: !isFacade && exports.total > MAX_EXPORTED_FUNCTIONS,
  };
}

/**
 * Format stats for console output.
 * @param {IoModuleStats} stats - Module statistics
 * @returns {string} Formatted output line
 */
function formatStats(stats) {
  const lineStatus = stats.violatesLines ? "❌" : "✓";
  const exportStatus = stats.violatesExports ? "❌" : "✓";
  const facadeLabel = stats.isFacade ? " [facade]" : "";

  return [
    `${stats.path}${facadeLabel}`,
    `  Lines: ${stats.lines} ${lineStatus}`,
    `  Exports: ${stats.exports.total} (direct: ${stats.exports.direct}, re-export: ${stats.exports.reExport}) ${exportStatus}`,
    `  Consts: ${stats.exportedConsts}`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const isCheckMode = process.argv.includes("--check");

  const ioModules = await collectIoModules(LIB_DIR);

  if (ioModules.length === 0) {
    console.log("No IO modules found in lib/");
    process.exit(0);
  }

  const allStats = ioModules.map(analyzeIoModule);
  const violations = allStats.filter(
    (s) => s.violatesLines || s.violatesExports,
  );

  if (isCheckMode) {
    // Check mode: only show violations and exit with appropriate code
    if (violations.length === 0) {
      const facadeCount = allStats.filter((s) => s.isFacade).length;
      console.log(
        `✓ All ${allStats.length} IO modules comply with size constraints`,
      );
      console.log(
        `  (max ${MAX_LINES} lines, max ${MAX_EXPORTED_FUNCTIONS} exported functions)`,
      );
      console.log(
        `  (${facadeCount} thin facade modules detected, exempt from export limit)`,
      );
      process.exit(0);
    }

    console.error(
      `\n❌ ${violations.length} IO module(s) violate ARCHITECTURE.md §3.4 constraints:\n`,
    );

    for (const stats of violations) {
      const reasons = [];
      if (stats.violatesLines) {
        reasons.push(`${stats.lines} lines > ${MAX_LINES}`);
      }
      if (stats.violatesExports) {
        reasons.push(
          `${stats.exports.total} exported functions > ${MAX_EXPORTED_FUNCTIONS} (direct: ${stats.exports.direct}, not a facade)`,
        );
      }
      console.error(`  ${stats.path}`);
      console.error(`    → ${reasons.join(", ")}`);
    }

    console.error(
      `\nFix: Split into smaller *-io.ts sub-modules per ARCHITECTURE.md §3.4`,
    );
    console.error(
      `Note: Thin facades (≤${MAX_DIRECT_EXPORTS_FOR_FACADE} direct exports, primarily re-exports) are exempt from export limit`,
    );
    process.exit(1);
  }

  // Report mode: show all modules
  console.log(`\nIO Module Size Report (${allStats.length} modules)\n`);
  console.log(
    `Constraints: max ${MAX_LINES} lines, max ${MAX_EXPORTED_FUNCTIONS} exported functions`,
  );
  console.log(
    `Exception: Thin facades (≤${MAX_DIRECT_EXPORTS_FOR_FACADE} direct, primarily re-exports) exempt from export limit\n`,
  );
  console.log("─".repeat(70));

  // Sort by lines descending for visibility
  allStats.sort((a, b) => b.lines - a.lines);

  for (const stats of allStats) {
    console.log(formatStats(stats));
    console.log("");
  }

  console.log("─".repeat(70));

  const facadeCount = allStats.filter((s) => s.isFacade).length;
  if (violations.length > 0) {
    console.log(`\n⚠️  ${violations.length} module(s) exceed constraints`);
  } else {
    console.log(
      `\n✓ All modules comply with constraints (${facadeCount} facades detected)`,
    );
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
