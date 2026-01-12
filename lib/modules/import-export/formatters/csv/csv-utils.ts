/**
 * CSV Utility Functions (Pure)
 *
 * SSOT for CSV formatting helpers used across all CSV exporters.
 * Follows PRD format rules: ISO 8601 UTC times, cents for amounts, empty string for null.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md (CSV format rules)
 * @see uiux_refactor.md §4 item 2
 */

// =============================================================================
// Cell Escaping
// =============================================================================

/**
 * Escape a value for CSV cell.
 * Rules:
 * - null/undefined → empty string
 * - Strings containing comma, newline, or quote are wrapped in quotes
 * - Quotes within strings are doubled
 *
 * @param value - The value to escape
 * @returns Escaped string safe for CSV
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Check if cell needs quoting
  const needsQuoting = str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"');

  if (needsQuoting) {
    // Escape internal quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return str;
}

// =============================================================================
// Value Transformations
// =============================================================================

/**
 * Convert a timestamp to ISO 8601 UTC format.
 *
 * @param ts - Timestamp (string, Date, null, or undefined)
 * @returns ISO 8601 UTC string or empty string if null/undefined
 */
export function toIsoUtc(ts: string | Date | null | undefined): string {
  if (ts === null || ts === undefined) {
    return '';
  }

  const date = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString();
}

/**
 * Convert null/undefined to empty string, otherwise return string value.
 *
 * @param value - Value to convert
 * @returns String representation or empty string
 */
export function nullToEmpty(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Convert a boolean to CSV-friendly string.
 *
 * @param value - Boolean value
 * @returns 'true' or 'false'
 */
export function boolToCsv(value: boolean): string {
  return value ? 'true' : 'false';
}

/**
 * Convert an array to CSV-friendly string (comma-separated within quotes).
 *
 * @param arr - Array of values
 * @returns Quoted string with comma-separated values
 */
export function arrayToCsvValue(arr: unknown[] | null | undefined): string {
  if (!arr || arr.length === 0) {
    return '';
  }
  // Join with comma and escape the result
  return escapeCsvCell(arr.join(','));
}

// =============================================================================
// Row/CSV Generation
// =============================================================================

/**
 * Convert an array of cell values to a CSV row string.
 *
 * @param values - Array of pre-escaped cell values
 * @returns Comma-separated row string
 */
export function arrayToCsvRow(values: string[]): string {
  return values.join(',');
}

/**
 * Generate a complete CSV string from headers and rows.
 *
 * @param headers - Column header names
 * @param rows - 2D array of cell values (each sub-array is a row)
 * @returns Complete CSV string with CRLF line endings
 */
export function toCsv(headers: string[], rows: string[][]): string {
  // Escape headers
  const headerRow = arrayToCsvRow(headers.map(escapeCsvCell));

  // Build data rows (values should already be escaped by caller)
  const dataRows = rows.map(arrayToCsvRow);

  // Use CRLF for maximum compatibility
  return [headerRow, ...dataRows].join('\r\n');
}
