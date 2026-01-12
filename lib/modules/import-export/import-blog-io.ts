/**
 * Blog Import IO Module (Server-only) - Facade
 *
 * Re-exports blog import operations from capability-scoped modules.
 * This file exists for backwards compatibility with existing consumers.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §4
 * @see uiux_refactor.md §6.1.2 Phase 1 B
 */
import 'server-only';

// Re-export types and preview operations
export type {
  ImportPreviewItem,
  BlogImportPreview,
} from './import-blog-preview-io';

export { previewBlogImport } from './import-blog-preview-io';

// Re-export types and apply operations
export type { BlogImportResult } from './import-blog-apply-io';

export { applyBlogImport } from './import-blog-apply-io';
