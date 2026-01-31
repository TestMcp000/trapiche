/**
 * Normalize escaped newline sequences stored as literal text.
 *
 * Some seed/import pipelines store `\n` / `\r\n` as two characters (`\` + `n`)
 * inside Postgres text fields (because standard_conforming_strings treats
 * backslashes as ordinary characters).
 *
 * This helper converts those literal sequences into real control characters
 * so Markdown/text rendering works as expected.
 */

export function normalizeEscapedNewlines(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');
}

