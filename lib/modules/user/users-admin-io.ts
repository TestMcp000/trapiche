/**
 * Users Admin IO (Aggregator)
 *
 * Re-exports all user admin IO submodules for backward compatibility.
 * This module maintains the original import surface to minimize ripple effects.
 *
 * @module lib/modules/user/users-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module split pattern
 */

import 'server-only';

// =============================================================================
// Re-export List Operations
// =============================================================================

export {
  getUserList,
  getUserListFiltered,
  getUserListFilteredPaged,
  transformDirectoryToSummary,
} from './users-list-admin-io';

export type {
  UserDirectoryWithProfileRow,
  UserListFilterParams,
  UserListPagedParams,
  UserListPagedResult,
} from './users-list-admin-io';

// =============================================================================
// Re-export Detail Operations
// =============================================================================

export {
  getUserById,
  transformProfileToDetail,
  transformAppointmentToSummary,
} from './users-detail-admin-io';

// =============================================================================
// Re-export Types for Convenience
// =============================================================================

export type {
  UserDirectoryRow,
  UserDirectorySummary,
  UserAdminProfileRow,
  UserAdminProfileDetail,
  UserAppointmentRow,
  UserAppointmentSummary,
  UserDetail,
} from '@/lib/types/user';
