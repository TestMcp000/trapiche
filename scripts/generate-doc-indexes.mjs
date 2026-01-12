import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes('--check');

const INLINE_LINK_RE = /!?\[([^\]]*)]\(([^)]+)\)/g;

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments);
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function writeText(filePath, content) {
  await fs.writeFile(filePath, content, 'utf8');
}

async function listMarkdownFiles(dirPath, { excludeNames = new Set() } = {}) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .filter((name) => !excludeNames.has(name))
    .map((name) => path.join(dirPath, name));
}

function extractTitle(markdownText) {
  const lines = markdownText.split(/\r?\n/);
  for (const line of lines) {
    const normalizedLine = line.replace(/^\uFEFF/, '');
    const match = normalizedLine.match(/^#\s+(.+?)\s*$/);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractBlockquoteMeta(markdownText) {
  const lines = markdownText.split(/\r?\n/);
  const meta = new Map();

  // Scan only near the top to avoid false positives.
  for (let i = 0; i < Math.min(lines.length, 40); i += 1) {
    const line = lines[i] ?? '';
    const match = line.match(/^\s*>\s*(?:\*\*)?([^:*]+?)(?:\*\*)?\s*:\s*(.+?)\s*$/);
    if (!match?.[1] || !match?.[2]) continue;
    meta.set(match[1].trim().toLowerCase(), match[2].trim());
  }

  return meta;
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
    target.startsWith('data:') ||
    target.startsWith('//')
  ) {
    return null;
  }

  if (target.startsWith('#')) return null;
  if (target.startsWith('/')) return null;

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

  return { path: withoutQuery, anchor: rawAnchor || null };
}

function extractLinks(markdownText) {
  const links = [];
  const lines = markdownText.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? '';
    INLINE_LINK_RE.lastIndex = 0;
    let match = INLINE_LINK_RE.exec(line);
    while (match) {
      links.push({ text: match[1] ?? '', raw: match[2] ?? '' });
      match = INLINE_LINK_RE.exec(line);
    }
  }
  return links;
}

function resolveRelative(fromFilePath, relativePath) {
  return path.resolve(path.dirname(fromFilePath), relativePath);
}

function relFromIndex(indexFilePath, targetFilePath) {
  const relative = path.relative(path.dirname(indexFilePath), targetFilePath);
  return relative.replaceAll('\\', '/');
}

function getAutoSectionMarkers(sectionName) {
  return {
    start: `<!-- AUTO-GENERATED:${sectionName}:START -->`,
    end: `<!-- AUTO-GENERATED:${sectionName}:END -->`,
  };
}

function replaceAutoSection(existingText, sectionName, newBody) {
  const { start, end } = getAutoSectionMarkers(sectionName);
  const startIndex = existingText.indexOf(start);
  const endIndex = existingText.indexOf(end);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(
      `Missing auto section markers for ${sectionName}. Expected:\n${start}\n...\n${end}`
    );
  }

  const before = existingText.slice(0, startIndex + start.length);
  const after = existingText.slice(endIndex);

  const normalizedBody = newBody.trimEnd();
  return `${before}\n\n${normalizedBody}\n\n${after}`;
}

function formatTableCell(value) {
  return value && value.trim() ? value.trim().replaceAll('\n', ' ') : '—';
}

function inferSpecsDocType(filePath) {
  const name = path.basename(filePath).toLowerCase();
  return name.endsWith('-spec.md') ? 'Spec' : 'PRD';
}

async function generateSpecsSection({ indexPath, dirPath }) {
  const files = await listMarkdownFiles(dirPath, {
    excludeNames: new Set(['README.md', 'TEMPLATE.md', 'PRD_TEMPLATE.md']),
  });

  files.sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

  const rows = [];
  for (const filePath of files) {
    const text = await readText(filePath);
    const title = extractTitle(text) ?? path.basename(filePath);
    const meta = extractBlockquoteMeta(text);
    const status = meta.get('status') ?? '—';
    const updated = meta.get('last updated') ?? meta.get('date') ?? '—';
    const type = inferSpecsDocType(filePath);

    const href = relFromIndex(indexPath, filePath);
    const fileLink = `[${path.basename(filePath)}](${href})`;
    rows.push({ fileLink, type, status, updated, title });
  }

  const tableLines = [
    '| File | Type | Status | Last Updated | Title |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| ${formatTableCell(r.fileLink)} | ${formatTableCell(r.type)} | ${formatTableCell(
          r.status
        )} | ${formatTableCell(r.updated)} | ${formatTableCell(r.title)} |`
    ),
  ];

  return tableLines.join('\n');
}

function inferDateFromFilename(filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})-/);
  return match?.[1] ?? null;
}

async function generateArchiveIndex() {
  const indexPath = repoPath('doc', 'archive', 'README.md');
  const archiveDir = repoPath('doc', 'archive');
  const files = await listMarkdownFiles(archiveDir, {
    excludeNames: new Set(['README.md', 'TEMPLATE.md']),
  });

  files.sort((a, b) => path.basename(b).localeCompare(path.basename(a)));

  const rows = [];
  for (const filePath of files) {
    const text = await readText(filePath);
    const title = extractTitle(text) ?? '—';
    const meta = extractBlockquoteMeta(text);
    const status = meta.get('status') ?? meta.get('**status**') ?? '—';
    const date =
      meta.get('last updated') ??
      meta.get('date') ??
      meta.get('**date**') ??
      inferDateFromFilename(path.basename(filePath)) ??
      '—';

    const fileLink = `[${path.basename(filePath)}](${path.basename(filePath)})`;
    rows.push({ fileLink, date, status, title });
  }

  const tableLines = [
    '| File | Date | Status | Title |',
    '| --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| ${formatTableCell(r.fileLink)} | ${formatTableCell(r.date)} | ${formatTableCell(
          r.status
        )} | ${formatTableCell(r.title)} |`
    ),
  ];

  return tableLines.join('\n');
}

async function updateIndexFile({ indexPath, sectionName, generatedBody }) {
  const existing = await readText(indexPath);
  const updated = replaceAutoSection(existing, sectionName, generatedBody);

  if (updated === existing) return { changed: false };

  if (CHECK_ONLY) return { changed: true };

  await writeText(indexPath, updated);
  return { changed: true };
}

const specsIndexPath = repoPath('doc', 'specs', 'README.md');
const completedSpecsBody = await generateSpecsSection({
  indexPath: specsIndexPath,
  dirPath: repoPath('doc', 'specs', 'completed'),
});
const proposedSpecsBody = await generateSpecsSection({
  indexPath: specsIndexPath,
  dirPath: repoPath('doc', 'specs', 'proposed'),
});

const archiveBody = await generateArchiveIndex();

const changes = [];
changes.push(
  await updateIndexFile({
    indexPath: specsIndexPath,
    sectionName: 'SPECS_COMPLETED',
    generatedBody: completedSpecsBody,
  })
);
changes.push(
  await updateIndexFile({
    indexPath: specsIndexPath,
    sectionName: 'SPECS_PROPOSED',
    generatedBody: proposedSpecsBody,
  })
);
changes.push(
  await updateIndexFile({
    indexPath: repoPath('doc', 'archive', 'README.md'),
    sectionName: 'ARCHIVE',
    generatedBody: archiveBody,
  })
);

const changedCount = changes.filter((c) => c.changed).length;

if (CHECK_ONLY) {
  if (changedCount > 0) {
    console.error(
      `Docs index check failed: ${changedCount} file(s) would change. Run: npm run docs:generate-indexes`
    );
    process.exit(1);
  }
  console.log('Docs index check passed.');
} else {
  console.log(`Docs indexes updated (${changedCount} file(s) changed).`);
}
