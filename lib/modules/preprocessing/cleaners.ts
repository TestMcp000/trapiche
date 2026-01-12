/**
 * Content Cleaners (Pure Functions)
 * @see doc/specs/completed/DATA_PREPROCESSING.md §2
 * @see uiux_refactor.md §6.4
 *
 * Pure functions for cleaning raw content before embedding.
 *
 * IMPORTANT: This module contains ONLY pure functions.
 * No IO, no side effects, no external dependencies.
 */

import type {
  CleanerConfig,
  CleanedContent,
  CleanResult,
  RemovedContent,
  RemovedContentType,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Default Config
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CLEANER_CONFIG: CleanerConfig = {
  removeHtml: true,
  removeMarkdown: true,
  removeUrls: true,
  removeEmails: true,
  removeNoise: true,
  normalizeUnicode: true,
  normalizeWhitespace: true,
  preserveHeadingStructure: false,
  customPatterns: undefined,
};

// ─────────────────────────────────────────────────────────────────────────────
// Noise Patterns (PRD §2.2.2)
// ─────────────────────────────────────────────────────────────────────────────

/** Patterns for visual noise that should be removed */
const NOISE_PATTERNS: RegExp[] = [
  // Navigation patterns
  /^(Home|About|Contact|Products|Services)(\s*\|\s*[\w\s]+)+$/gim,
  /^\s*(首頁|關於|聯絡|產品|服務)(\s*[\|｜]\s*[\u4e00-\u9fff\w\s]+)+$/gim,
  // Copyright notices
  /©\s*\d{4}.*$/gim,
  /Copyright\s*©?\s*\d{4}.*$/gim,
  // UI prompts
  /點此閱讀更多|閱讀更多|查看更多|了解更多/gi,
  /Read more|View more|Learn more|Click here/gi,
  /Loading\.{2,}|載入中\.{2,}/gi,
  // Ad markers
  /\[AD\]|\[廣告\]|\[Sponsored\]|Sponsored/gi,
  // Empty link placeholders
  /\[link\]|\[連結\]/gi,
];

// ─────────────────────────────────────────────────────────────────────────────
// Unicode Normalization Maps (PRD §2.2.3)
// ─────────────────────────────────────────────────────────────────────────────

/** Full-width to half-width character mappings */
const FULLWIDTH_TO_HALFWIDTH: Record<string, string> = {
  '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
  '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
  'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E',
  'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J',
  'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O',
  'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T',
  'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y', 'Ｚ': 'Z',
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e',
  'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j',
  'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o',
  'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't',
  'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
  '，': ',', '。': '.', '！': '!', '？': '?',
  '：': ':', '；': ';', '（': '(', '）': ')',
  '　': ' ',
};

// ─────────────────────────────────────────────────────────────────────────────
// Individual Cleaners (Pure Functions)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remove HTML tags from content, preserving text.
 * Handles script/style tags specially to remove their content.
 * @pure
 */
export function removeHtmlTags(content: string): string {
  return content
    // Remove script/style tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove all other HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

/**
 * Remove Markdown syntax from content.
 * Optionally preserves heading structure markers.
 * @pure
 */
export function removeMarkdownSyntax(
  content: string,
  preserveHeadings: boolean = false
): string {
  let result = content
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    // Remove emphasis (but keep text)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove links (keep text)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '');

  // Handle headings
  if (!preserveHeadings) {
    result = result.replace(/^#{1,6}\s+/gm, '');
  }

  return result;
}

/**
 * Remove URLs from content.
 * @pure
 */
export function removeUrls(content: string): string {
  return content.replace(/https?:\/\/[^\s]+/g, '');
}

/**
 * Remove/redact email addresses from content.
 * @pure
 */
export function removeEmails(content: string): string {
  return content.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
}

/**
 * Remove visual noise patterns from content.
 * @pure
 */
export function removeNoisePatterns(content: string): string {
  let result = content;
  for (const pattern of NOISE_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result;
}

/**
 * Normalize Unicode: convert full-width to half-width characters.
 * @pure
 */
export function normalizeUnicode(content: string): string {
  // Apply NFC normalization first
  let result = content.normalize('NFC');

  // Convert full-width to half-width
  for (const [fullWidth, halfWidth] of Object.entries(FULLWIDTH_TO_HALFWIDTH)) {
    result = result.split(fullWidth).join(halfWidth);
  }

  return result;
}

/**
 * Normalize whitespace (multiple spaces/newlines -> single).
 * @pure
 */
export function normalizeWhitespace(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Cleaner with Tracking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply a single cleaner with removal tracking.
 * @pure
 */
function applyCleanerWithTracking(
  content: string,
  cleanerFn: (s: string) => string,
  type: RemovedContentType,
  name: string
): CleanResult {
  const before = content;
  const output = cleanerFn(content);
  const removed: RemovedContent[] = [];

  if (before !== output) {
    removed.push({ type, original: `[${name} applied]` });
  }

  return { output, removed, metadata: { cleaner: name } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Cleaner Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply all cleaning operations based on config.
 * Returns cleaned content with metadata.
 * @pure
 */
export function cleanContent(
  raw: string,
  config: CleanerConfig = DEFAULT_CLEANER_CONFIG
): CleanedContent {
  let cleaned = raw;
  const removedPatterns: string[] = [];
  const cleanersApplied: string[] = [];

  // 1. Remove HTML (highest priority)
  if (config.removeHtml) {
    const before = cleaned;
    cleaned = removeHtmlTags(cleaned);
    if (before !== cleaned) {
      removedPatterns.push('html');
      cleanersApplied.push('HtmlStripper');
    }
  }

  // 2. Remove Noise patterns
  if (config.removeNoise) {
    const before = cleaned;
    cleaned = removeNoisePatterns(cleaned);
    if (before !== cleaned) {
      removedPatterns.push('noise');
      cleanersApplied.push('NoiseFilter');
    }
  }

  // 3. Remove Markdown
  if (config.removeMarkdown) {
    const before = cleaned;
    cleaned = removeMarkdownSyntax(cleaned, config.preserveHeadingStructure);
    if (before !== cleaned) {
      removedPatterns.push('markdown');
      cleanersApplied.push('MarkdownStripper');
    }
  }

  // 4. Remove URLs
  if (config.removeUrls) {
    const before = cleaned;
    cleaned = removeUrls(cleaned);
    if (before !== cleaned) {
      removedPatterns.push('urls');
      cleanersApplied.push('UrlRemover');
    }
  }

  // 5. Remove Emails (redact)
  if (config.removeEmails) {
    const before = cleaned;
    cleaned = removeEmails(cleaned);
    if (before !== cleaned) {
      removedPatterns.push('emails');
      cleanersApplied.push('EmailRedactor');
    }
  }

  // 6. Normalize Unicode
  if (config.normalizeUnicode) {
    const before = cleaned;
    cleaned = normalizeUnicode(cleaned);
    if (before !== cleaned) {
      removedPatterns.push('unicode');
      cleanersApplied.push('UnicodeNormalizer');
    }
  }

  // 7. Normalize Whitespace (always last before custom)
  if (config.normalizeWhitespace) {
    cleaned = normalizeWhitespace(cleaned);
    cleanersApplied.push('WhitespaceNormalizer');
  }

  // 8. Apply custom patterns if provided
  if (config.customPatterns && config.customPatterns.length > 0) {
    for (const pattern of config.customPatterns) {
      const before = cleaned;
      cleaned = cleaned.replace(pattern, '');
      if (before !== cleaned) {
        removedPatterns.push(pattern.source);
        cleanersApplied.push('CustomPattern');
      }
    }
  }

  const originalLength = raw.length;
  const cleanedLength = cleaned.length;

  return {
    raw,
    cleaned,
    removedPatterns,
    metadata: {
      originalLength,
      cleanedLength,
      cleaningRatio: originalLength > 0 ? cleanedLength / originalLength : 1,
      cleanersApplied,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Exports (for direct use)
// ─────────────────────────────────────────────────────────────────────────────

export {
  applyCleanerWithTracking,
  NOISE_PATTERNS,
  FULLWIDTH_TO_HALFWIDTH,
};
