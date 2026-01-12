/**
 * Anonymous ID utilities for like/reaction tracking
 * 
 * Pure module - no IO dependencies.
 * Uses cookie-based UUID v4 for anonymous user identification.
 */

/**
 * Cookie name for storing anonymous user ID
 */
export const ANON_ID_COOKIE_NAME = 'anon_id';

/**
 * UUID v4 regex pattern for validation
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate if a value is a valid UUID v4 format
 * 
 * @param value - The value to validate
 * @returns true if value is a valid UUID v4
 */
export function isValidAnonId(value: string | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return UUID_V4_REGEX.test(value);
}

/**
 * Generate a new UUID v4 for anonymous identification
 * Uses crypto.randomUUID() for secure generation
 * 
 * @returns A new UUID v4 string
 */
export function generateAnonId(): string {
  return crypto.randomUUID();
}
