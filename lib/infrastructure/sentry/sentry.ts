/**
 * Server-only Sentry wrapper module for custom error capture.
 *
 * This module provides type-safe wrappers for Sentry functions that can be used
 * in server-side code (API routes, server actions, IO modules) without importing
 * @sentry/nextjs directly.
 *
 * @see ARCHITECTURE.md (Error Monitoring, IO boundaries)
 */
import 'server-only';

import * as Sentry from '@sentry/nextjs';

/**
 * Capture an exception and send it to Sentry.
 * Use this in catch blocks where you want to report errors to monitoring.
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   captureError(error, { extra: { userId: 'anonymous' } });
 *   throw error; // re-throw if needed
 * }
 */
export function captureError(
  error: unknown,
  context?: Parameters<typeof Sentry.captureException>[1]
): string {
  return Sentry.captureException(error, context);
}

/**
 * Capture a message and send it to Sentry.
 * Use this for logging notable events that aren't exceptions.
 *
 * @example
 * captureMessage('User completed onboarding', 'info');
 */
export function captureMessage(
  message: string,
  level?: Sentry.SeverityLevel
): string {
  return Sentry.captureMessage(message, level);
}

/**
 * Set user context for Sentry.
 * Call this after authentication to associate errors with users.
 * Note: Only set non-PII identifiers (e.g., anonymous IDs, not emails).
 *
 * @example
 * setUser({ id: user.id });
 */
export function setUser(user: Sentry.User | null): void {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging.
 * Breadcrumbs are attached to subsequent error reports.
 *
 * @example
 * addBreadcrumb({
 *   category: 'payment',
 *   message: 'Initiated checkout',
 *   level: 'info',
 * });
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb);
}
