/**
 * Blog Import Apply IO Module (Server-only)
 *
 * Handles blog import apply operations using atomic RPC for transaction safety.
 * Processes validated data through a single database transaction.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §4.4 (rollback strategy)
 * @see uiux_refactor.md §6.1.2 Phase 1 B.3
 */
import 'server-only';

import JSZip from 'jszip';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { validateBlogPostData, validateBlogCategoryData } from './validators/blog';
import { extractCategories, extractPosts } from './import-blog-preview-io';
import type { BlogPostImportData, BlogCategoryImportData } from '@/lib/types/import-export';

// =============================================================================
// Types
// =============================================================================

/** Import apply result - atomic all-or-nothing */
export interface BlogImportResult {
  success: boolean;
  error?: string;
  categoriesImported: number;
  postsImported: number;
}

// =============================================================================
// RPC Response Types
// =============================================================================

interface ImportBundleRpcResponse {
  success: boolean;
  error?: string;
  categories_count: number;
  posts_count: number;
}

// =============================================================================
// Apply Import (Atomic via RPC)
// =============================================================================

/**
 * Apply a blog import bundle to the database atomically.
 *
 * Uses `import_blog_bundle_atomic` RPC for transaction safety:
 * - If any category or post fails, the entire import is rolled back
 * - No partial success states are possible
 *
 * Prerequisites:
 * - Data should be validated via preview first (previewBlogImport)
 * - Invalid items should be rejected before calling this function
 *
 * @param zipBuffer - The uploaded ZIP file as a Buffer
 * @param authorId - The author ID to use for imported posts
 * @returns Import result with counts (all-or-nothing)
 */
export async function applyBlogImport(
  zipBuffer: Buffer | ArrayBuffer,
  authorId: string
): Promise<BlogImportResult> {
  try {
    // Load and validate ZIP
    const zip = await JSZip.loadAsync(zipBuffer);

    // Extract and validate categories
    const { categories, error: catError } = await extractCategories(zip);
    if (catError) {
      return {
        success: false,
        error: catError,
        categoriesImported: 0,
        postsImported: 0,
      };
    }

    const validCategories: BlogCategoryImportData[] = [];
    const categoryErrors: string[] = [];
    for (const cat of categories) {
      const result = validateBlogCategoryData(cat);
      if (result.valid && result.data) {
        validCategories.push(result.data);
      } else {
        const errMsg = result.errors ? Object.values(result.errors).join(', ') : 'Unknown error';
        categoryErrors.push(`Category ${cat.slug || 'unknown'}: ${errMsg}`);
      }
    }

    // Extract and validate posts
    const { posts } = await extractPosts(zip);
    const validPosts: BlogPostImportData[] = [];
    const postErrors: string[] = [];
    for (const post of posts) {
      const result = validateBlogPostData(post);
      if (result.valid && result.data) {
        validPosts.push(result.data);
      } else {
        const errMsg = result.errors ? Object.values(result.errors).join(', ') : 'Unknown error';
        postErrors.push(`Post ${post.frontmatter.slug || 'unknown'}: ${errMsg}`);
      }
    }

    // If there are validation errors, fail before attempting import
    const allErrors = [...categoryErrors, ...postErrors];
    if (allErrors.length > 0) {
      return {
        success: false,
        error: `Validation failed: ${allErrors.slice(0, 3).join('; ')}${allErrors.length > 3 ? ` (+${allErrors.length - 3} more)` : ''}`,
        categoriesImported: 0,
        postsImported: 0,
      };
    }

    // Convert to JSONB format for RPC
    const categoriesJson = validCategories.map((cat) => ({
      slug: cat.slug,
      name_en: cat.name_en,
      name_zh: cat.name_zh,
      created_at: null, // Let DB set created_at
    }));

    const postsJson = validPosts.map((post) => ({
      slug: post.slug,
      category_slug: post.category_slug,
      title_en: post.title_en,
      title_zh: post.title_zh,
      content_en: post.content_en,
      content_zh: post.content_zh,
      excerpt_en: post.excerpt_en || null,
      excerpt_zh: post.excerpt_zh || null,
      cover_image_url_en: post.cover_image_url_en || null,
      cover_image_url_zh: post.cover_image_url_zh || null,
      cover_image_alt_en: post.cover_image_alt_en || null,
      cover_image_alt_zh: post.cover_image_alt_zh || null,
      visibility: post.visibility || 'draft',
      created_at: post.created_at || null,
    }));

    // Execute atomic import via RPC
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('import_blog_bundle_atomic', {
      p_categories: categoriesJson,
      p_posts: postsJson,
      p_author_id: authorId,
    });

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`,
        categoriesImported: 0,
        postsImported: 0,
      };
    }

    // Parse RPC response
    const result = data as ImportBundleRpcResponse;
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Import failed (unknown error)',
        categoriesImported: 0,
        postsImported: 0,
      };
    }

    return {
      success: true,
      categoriesImported: result.categories_count,
      postsImported: result.posts_count,
    };
  } catch (error) {
    return {
      success: false,
      error: `Import failed: ${error instanceof Error ? error.message : String(error)}`,
      categoriesImported: 0,
      postsImported: 0,
    };
  }
}
