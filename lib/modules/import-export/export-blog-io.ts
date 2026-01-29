/**
 * Blog Export IO Module (Server-only)
 *
 * Orchestrates blog data export operations.
 * Reads data via existing IO modules, formats using pure formatters,
 * and creates downloadable ZIP bundles.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2
 * @see uiux_refactor.md §6.1.2 Phase 1 B
 */
import 'server-only';

import JSZip from 'jszip';
import { createClient } from '@/lib/infrastructure/supabase/server';
import {
  formatBlogPostToMarkdown,
  formatBlogPostsFolderStructure,
} from './formatters/blog-post-markdown';
import { formatBlogCategoriesToJsonString } from './formatters/blog-categories-json';
import type { Post, Category } from '@/lib/types/blog';

// =============================================================================
// Types
// =============================================================================

/** Result of a blog export operation */
export interface BlogExportResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  stats?: {
    postsCount: number;
    categoriesCount: number;
    bundleSizeBytes: number;
  };
}

// =============================================================================
// Constants
// =============================================================================

/** Export file names */
const CATEGORIES_FILENAME = 'categories.json';
const POSTS_FOLDER = 'posts';

/** Storage bucket for exports */
const EXPORTS_BUCKET = 'exports';

/** Signed URL expiration (24 hours in seconds) */
const SIGNED_URL_EXPIRY = 60 * 60 * 24;

// =============================================================================
// Local Queries (no cross-module imports)
// =============================================================================

async function getAllCategoriesForExport(): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name_en');

  if (error) {
    console.error('[exportBlogBundle] Error fetching categories:', error);
    return [];
  }

  return (data ?? []) as Category[];
}

async function getAllPostsForExport(): Promise<Post[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      category:categories(*)
    `)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[exportBlogBundle] Error fetching posts:', error);
    return [];
  }

  return (data ?? []) as unknown as Post[];
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Create a ZIP buffer containing all blog posts and categories.
 *
 * @param posts - Array of blog posts
 * @param categories - Array of categories
 * @returns ZIP buffer
 */
export async function createBlogExportZip(
  posts: Post[],
  categories: Category[]
): Promise<Buffer> {
  const zip = new JSZip();

  // Add categories.json
  const categoriesJson = formatBlogCategoriesToJsonString(categories);
  zip.file(CATEGORIES_FILENAME, categoriesJson);

  // Add posts as Markdown files organized by category
  const postsMap = formatBlogPostsFolderStructure(posts);
  for (const [path, content] of postsMap) {
    zip.file(`${POSTS_FOLDER}/${path}`, content);
  }

  // Generate ZIP buffer
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return buffer;
}

/**
 * Upload a ZIP buffer to Supabase Storage and return a signed URL.
 *
 * @param buffer - The ZIP buffer to upload
 * @param filename - The filename to use in storage
 * @returns Signed download URL
 */
export async function uploadExportToStorage(
  buffer: Buffer,
  filename: string
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .upload(filename, buffer, {
      contentType: 'application/zip',
      upsert: true,
    });

  if (uploadError) {
    console.error('[export-blog-io] uploadExportToStorage upload failed:', uploadError);
    return { error: '上傳失敗' };
  }

  // Create signed URL
  const { data: signedData, error: signedError } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .createSignedUrl(filename, SIGNED_URL_EXPIRY);

  if (signedError || !signedData?.signedUrl) {
    console.error('[export-blog-io] uploadExportToStorage createSignedUrl failed:', signedError);
    return { error: '建立下載連結失敗' };
  }

  return { url: signedData.signedUrl };
}

/**
 * Export all blog data (posts and categories) as a downloadable ZIP.
 *
 * Main entry point for blog export operations.
 *
 * @returns Export result with download URL or error
 */
export async function exportBlogBundle(): Promise<BlogExportResult> {
  try {
    // Fetch all data
    const [posts, categories] = await Promise.all([
      getAllPostsForExport(),
      getAllCategoriesForExport(),
    ]);

    // Create ZIP
    const zipBuffer = await createBlogExportZip(posts as Post[], categories);

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `blog-export-${timestamp}.zip`;

    // Upload to storage
    const uploadResult = await uploadExportToStorage(zipBuffer, filename);

    if ('error' in uploadResult) {
      return { success: false, error: uploadResult.error };
    }

    return {
      success: true,
      downloadUrl: uploadResult.url,
      stats: {
        postsCount: posts.length,
        categoriesCount: categories.length,
        bundleSizeBytes: zipBuffer.length,
      },
    };
  } catch (error) {
    console.error('[export-blog-io] exportBlogBundle failed:', error);
    return {
      success: false,
      error: '匯出失敗',
    };
  }
}

/**
 * Export a single blog post as Markdown.
 *
 * @param postId - The ID of the post to export
 * @returns The formatted Markdown string or error
 */
export async function exportSinglePost(
  post: Post
): Promise<{ markdown: string } | { error: string }> {
  try {
    const markdown = formatBlogPostToMarkdown(post);
    return { markdown };
  } catch (error) {
    console.error('[export-blog-io] exportSinglePost failed:', error);
    return {
      error: '文章格式化失敗',
    };
  }
}
