/**
 * lib/infrastructure/sentry/index.ts
 *
 * Central export point for Sentry monitoring.
 *
 * @see ARCHITECTURE.md §3.4.1
 */
export { captureError, captureMessage, setUser, addBreadcrumb } from './sentry';
