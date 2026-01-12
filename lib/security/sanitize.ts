/**
 * Content sanitization and validation utilities
 * 
 * Provides HTML sanitization, length validation, and URL detection
 * for comment content.
 */

/**
 * Pattern to detect URLs in text
 */
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

/**
 * Pattern to detect potentially malicious content
 */
const DANGEROUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,      // onclick=, onerror=, etc.
  /data:\s*text\/html/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
];

export interface SanitizeResult {
  content: string;
  linkCount: number;
  truncated: boolean;
  rejected: boolean;
  rejectReason?: string;
}

/**
 * Sanitize comment content
 * 
 * @param content - Raw content from user
 * @param maxLength - Maximum allowed length (default: 4000)
 * @returns Sanitized content with metadata
 */
export function sanitizeContent(content: string, maxLength: number = 4000): SanitizeResult {
  if (!content || typeof content !== 'string') {
    return {
      content: '',
      linkCount: 0,
      truncated: false,
      rejected: true,
      rejectReason: 'Empty content',
    };
  }

  // Check for dangerous content
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      return {
        content: '',
        linkCount: 0,
        truncated: false,
        rejected: true,
        rejectReason: 'Contains potentially dangerous content',
      };
    }
  }

  // Trim and normalize whitespace
  let sanitized = content.trim();
  
  // Remove excessive line breaks (more than 3 consecutive)
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');
  
  // Remove null bytes and other control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Count links before truncation
  const links = sanitized.match(URL_PATTERN) || [];
  const linkCount = links.length;

  // Truncate if too long
  let truncated = false;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    // Try to cut at a word boundary
    const lastSpace = sanitized.lastIndexOf(' ');
    if (lastSpace > maxLength - 100) {
      sanitized = sanitized.substring(0, lastSpace);
    }
    sanitized += '…';
    truncated = true;
  }

  return {
    content: sanitized,
    linkCount,
    truncated,
    rejected: false,
  };
}

/**
 * Strip all HTML tags from content
 * Used for plain text extraction
 */
export function stripHtml(content: string): string {
  return content.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML special characters
 * Prevents XSS when displaying user content
 */
export function escapeHtml(content: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return content.replace(/[&<>"']/g, (char) => escapeMap[char]);
}

/**
 * Count URLs in content
 */
export function countLinks(content: string): number {
  const matches = content.match(URL_PATTERN);
  return matches ? matches.length : 0;
}

/**
 * Validate content length
 */
export function isValidLength(content: string, minLength: number = 1, maxLength: number = 4000): boolean {
  const length = content.trim().length;
  return length >= minLength && length <= maxLength;
}

/**
 * Check if content is too short (likely spam or meaningless)
 */
export function isTooShort(content: string, minLength: number = 3): boolean {
  return content.trim().length < minLength;
}

/**
 * Check if content is too repetitive (spam indicator)
 * Returns true if the same word/phrase is repeated excessively
 */
export function isRepetitive(content: string, threshold: number = 5): boolean {
  const words = content.toLowerCase().split(/\s+/);
  const wordCount: Record<string, number> = {};
  
  for (const word of words) {
    if (word.length > 2) {  // Ignore very short words
      wordCount[word] = (wordCount[word] || 0) + 1;
      if (wordCount[word] > threshold) {
        return true;
      }
    }
  }
  
  return false;
}
