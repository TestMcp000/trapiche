import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = process.cwd();

const IGNORED_DIR_NAMES = new Set([
  '.git',
  '.next',
  '.test-dist',
  'node_modules',
]);

const INLINE_LINK_RE = /!?\[[^\]]*]\(([^)]+)\)/g;
const REF_DEF_RE = /^\s*\[[^\]]+]:\s*(\S+)(?:\s+|$)/;

async function collectMarkdownFiles(dirPath) {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIR_NAMES.has(entry.name)) continue;
      files.push(...(await collectMarkdownFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

function stripCodeFences(markdown) {
  const lines = markdown.split(/\r?\n/);
  const out = [];

  let inFence = false;
  let fenceMarker = null;

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(```|~~~)/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
        fenceMarker = null;
      }
      out.push('');
      continue;
    }

    out.push(inFence ? '' : line);
  }

  return out;
}

function normalizeLinkTarget(rawTarget) {
  let target = rawTarget.trim();
  if (!target) return null;

  if (target.startsWith('<') && target.includes('>')) {
    target = target.slice(1, target.indexOf('>')).trim();
  }

  if (!target) return null;

  if (
    target.startsWith('http://') ||
    target.startsWith('https://') ||
    target.startsWith('mailto:') ||
    target.startsWith('tel:') ||
    target.startsWith('data:')
  ) {
    return null;
  }

  if (target.startsWith('#')) {
    const anchor = target.slice(1).trim();
    if (!anchor) return null;
    return { kind: 'same-file', anchor: normalizeAnchor(anchor) };
  }
  if (target.startsWith('//')) return null;

  // Strip optional title: `path "title"` / `path 'title'`
  const quoteIndex = Math.min(
    ...['"', "'"]
      .map((q) => target.indexOf(q))
      .filter((idx) => idx !== -1)
  );
  if (Number.isFinite(quoteIndex) && quoteIndex > 0) {
    target = target.slice(0, quoteIndex).trim();
  }

  // Keep only the first token if whitespace remains
  const spaceIndex = target.search(/\s/);
  if (spaceIndex !== -1) {
    target = target.slice(0, spaceIndex).trim();
  }

  const hashIndex = target.indexOf('#');
  const beforeHash = (hashIndex === -1 ? target : target.slice(0, hashIndex)).trim();
  const rawAnchor = hashIndex === -1 ? null : target.slice(hashIndex + 1).trim();

  const withoutQuery = (beforeHash.split('?')[0] ?? '').trim();
  if (!withoutQuery) return null;

  // Treat `/foo` as a site path, not a repo file path.
  if (withoutQuery.startsWith('/')) return null;

  const anchor = rawAnchor ? normalizeAnchor(rawAnchor) : null;
  return { kind: 'file', path: withoutQuery, anchor };
}

function normalizeAnchor(anchor) {
  const trimmed = anchor.trim();
  if (!trimmed) return '';
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function buildGitHubSlugger() {
  const seen = new Map();
  return {
    slug(value) {
      const base = slugifyGitHub(value);
      if (!base) return '';
      const current = seen.get(base) ?? 0;
      seen.set(base, current + 1);
      return current === 0 ? base : `${base}-${current}`;
    },
  };
}

function slugifyGitHub(value) {
  return (
    value
      .replace(/<[^>]+>/g, '') // strip HTML tags
      .trim()
      .toLowerCase()
      // Remove most punctuation/symbols, but keep spaces and hyphens.
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      // GitHub-style: each whitespace becomes a hyphen (no collapsing).
      .replace(/\s/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

function collectAnchorsFromMarkdown(markdownText) {
  const lines = stripCodeFences(markdownText);
  const slugger = buildGitHubSlugger();
  const anchors = new Set();

  for (const line of lines) {
    if (!line) continue;

    // Explicit anchors: <a id="..."></a> / <a name="..."></a>
    const explicitAnchorMatch = line.match(/<a\b[^>]*(?:\bid|\bname)\s*=\s*["']([^"']+)["'][^>]*>/i);
    if (explicitAnchorMatch?.[1]) {
      anchors.add(explicitAnchorMatch[1].trim());
    }

    // Headings: GitHub-style slug.
    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*$/);
    if (!headingMatch?.[2]) continue;
    const rawHeading = headingMatch[2].replace(/\s+#+\s*$/, '').trim();
    const slug = slugger.slug(rawHeading);
    if (slug) anchors.add(slug);
  }

  return anchors;
}

function getLineNumber(lines, index) {
  return index + 1;
}

function collectTargetsFromLines(lines) {
  const targets = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (!line) continue;

    const refMatch = line.match(REF_DEF_RE);
    if (refMatch?.[1]) {
      targets.push({
        raw: refMatch[1],
        line: getLineNumber(lines, lineIndex),
      });
    }

    INLINE_LINK_RE.lastIndex = 0;
    let match = INLINE_LINK_RE.exec(line);
    while (match) {
      targets.push({
        raw: match[1] ?? '',
        line: getLineNumber(lines, lineIndex),
      });
      match = INLINE_LINK_RE.exec(line);
    }
  }

  return targets;
}

function resolveRelativeLink(fromMarkdownPath, linkPath) {
  return path.resolve(path.dirname(fromMarkdownPath), linkPath);
}

function formatPath(p) {
  return path.relative(REPO_ROOT, p) || '.';
}

function assertNoBrokenLinks(markdownFilePath, markdownText, getAnchorsForFile) {
  const lines = stripCodeFences(markdownText);
  const candidates = collectTargetsFromLines(lines);
  const missingFiles = [];
  const missingAnchors = [];

  const sourceAnchors = getAnchorsForFile(markdownFilePath, markdownText);

  for (const candidate of candidates) {
    const normalized = normalizeLinkTarget(candidate.raw);
    if (!normalized) continue;

    if (normalized.kind === 'same-file') {
      if (!sourceAnchors.has(normalized.anchor)) {
        missingAnchors.push({
          from: markdownFilePath,
          line: candidate.line,
          raw: candidate.raw,
          anchor: normalized.anchor,
          targetFile: markdownFilePath,
        });
      }
      continue;
    }

    const resolved = resolveRelativeLink(markdownFilePath, normalized.path);
    if (!fs.existsSync(resolved)) {
      missingFiles.push({
        from: markdownFilePath,
        line: candidate.line,
        raw: candidate.raw,
        normalized: normalized.path,
        resolved,
      });
      continue;
    }

    // Anchor checks only for markdown targets. (Skip e.g. GitHub line anchors: foo.ts#L10)
    if (normalized.anchor && resolved.toLowerCase().endsWith('.md')) {
      const targetAnchors = getAnchorsForFile(resolved);
      if (!targetAnchors.has(normalized.anchor)) {
        missingAnchors.push({
          from: markdownFilePath,
          line: candidate.line,
          raw: candidate.raw,
          anchor: normalized.anchor,
          targetFile: resolved,
        });
      }
    }
  }

  return { missingFiles, missingAnchors };
}

const markdownFiles = await collectMarkdownFiles(REPO_ROOT);
const allMissingFiles = [];
const allMissingAnchors = [];

const anchorCache = new Map();
function getAnchorsForFile(markdownFilePath, alreadyReadText) {
  if (anchorCache.has(markdownFilePath)) return anchorCache.get(markdownFilePath);
  const text = alreadyReadText ?? fs.readFileSync(markdownFilePath, 'utf8');
  const anchors = collectAnchorsFromMarkdown(text);
  anchorCache.set(markdownFilePath, anchors);
  return anchors;
}

for (const mdPath of markdownFiles) {
  const content = await fs.promises.readFile(mdPath, 'utf8');
  const { missingFiles, missingAnchors } = assertNoBrokenLinks(mdPath, content, getAnchorsForFile);
  allMissingFiles.push(...missingFiles);
  allMissingAnchors.push(...missingAnchors);
}

if (allMissingFiles.length > 0 || allMissingAnchors.length > 0) {
  console.error('Markdown link check failed:\n');

  if (allMissingFiles.length > 0) {
    console.error('Missing relative targets:\n');
    for (const item of allMissingFiles) {
      console.error(
        `- ${formatPath(item.from)}:${item.line} -> ${item.raw} (resolved: ${formatPath(item.resolved)})`
      );
    }
    console.error(`\nTotal missing targets: ${allMissingFiles.length}\n`);
  }

  if (allMissingAnchors.length > 0) {
    console.error('Missing anchors:\n');
    for (const item of allMissingAnchors) {
      console.error(
        `- ${formatPath(item.from)}:${item.line} -> ${item.raw} (missing: #${item.anchor} in ${formatPath(item.targetFile)})`
      );
    }
    console.error(`\nTotal missing anchors: ${allMissingAnchors.length}\n`);
  }

  console.error(
    `Summary: ${allMissingFiles.length} missing files, ${allMissingAnchors.length} missing anchors.`
  );
  process.exit(1);
}

console.log(`Markdown link check passed (${markdownFiles.length} files).`);
