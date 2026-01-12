export interface ReadingTimeOptions {
  /** English words per minute */
  enWordsPerMinute?: number;
  /** Chinese characters per minute */
  zhCharsPerMinute?: number;
  /** Minimum minutes returned (default: 1) */
  minimumMinutes?: number;
}

/**
 * Calculate reading time using:
 * - English: ~200 words/minute
 * - Chinese: ~500 chars/minute
 *
 * Returns the longer of the two, rounded up, with a minimum of 1 minute.
 */
export function calculateReadingTimeMinutes(
  enContent: string | null | undefined,
  zhContent: string | null | undefined,
  options: ReadingTimeOptions = {}
): number {
  const en = enContent ?? '';
  const zh = zhContent ?? '';

  const enWordsPerMinute = options.enWordsPerMinute ?? 200;
  const zhCharsPerMinute = options.zhCharsPerMinute ?? 500;
  const minimumMinutes = options.minimumMinutes ?? 1;

  const enWords = en.trim().split(/\s+/).filter(Boolean).length;
  const enMinutes = enWords / enWordsPerMinute;

  const zhChars = zh.replace(/\s/g, '').length;
  const zhMinutes = zhChars / zhCharsPerMinute;

  const minutes = Math.ceil(Math.max(enMinutes, zhMinutes));
  return Math.max(minimumMinutes, minutes);
}

