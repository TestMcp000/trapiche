/**
 * lib/infrastructure/akismet/index.ts
 *
 * Central export point for Akismet spam API.
 *
 * @see ARCHITECTURE.md §3.4.1
 */
export {
  type AkismetCheckParams,
  type AkismetResult,
  verifyAkismetKey,
  checkSpam,
  reportSpam,
  reportHam,
} from './akismet-io';
