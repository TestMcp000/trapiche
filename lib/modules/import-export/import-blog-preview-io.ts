/**
 * Blog Import Preview IO Module (Server-only)
 *
 * Handles blog import preview operations (dry run validation without DB writes).
 * Parses ZIP bundles and validates data structure.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §4
 * @see uiux_refactor.md §6.1.2 Phase 1 B
 */
import 'server-only';

import JSZip from 'jszip';
import { parseBlogPostMarkdown } from './parsers/blog-post-markdown';
import { parseBlogCategoriesJsonString } from './parsers/blog-categories-json';
import {
  validateBlogPostData,
  validateBlogCategoryData,
  findDuplicateCategorySlugs,
} from './validators/blog';
import type {
  ParsedBlogPost,
  ParsedBlogCategory,
  BlogPostImportData,
  BlogCategoryImportData,
} from '@/lib/types/import-export';

// =============================================================================
// Types
// =============================================================================

/** Individual item preview in import */
export interface ImportPreviewItem {
  slug: string;
  title?: string;
  valid: boolean;
  errors?: Record<string, string>;
  warnings?: string[];
}

/** Import preview result (dry run) */
export interface BlogImportPreview {
  success: boolean;
  error?: string;
  categories: {
    total: number;
    valid: number;
    items: ImportPreviewItem[];
  };
  posts: {
    total: number;
    valid: number;
    items: ImportPreviewItem[];
  };
  /** Category slugs found in posts but not in categories bundle */
  missingCategories: string[];
}

// =============================================================================
// Constants
// =============================================================================

/** Expected file structure */
const CATEGORIES_FILENAME = 'categories.json';

// =============================================================================
// ZIP Extraction Helpers
// =============================================================================

/**
 * Extract and parse categories from ZIP bundle.
 */
export async function extractCategories(
  zip: JSZip
): Promise<{ categories: ParsedBlogCategory[]; error?: string }> {
  const categoriesFile = zip.file(CATEGORIES_FILENAME);
  
  if (!categoriesFile) {
    return { categories: [], error: 'Missing categories.json' };
  }

  const content = await categoriesFile.async('string');
  const parseResult = parseBlogCategoriesJsonString(content);

  if (!parseResult.success || !parseResult.data) {
    return { categories: [], error: parseResult.error };
  }

  return { categories: parseResult.data.data };
}

/**
 * Extract and parse posts from ZIP bundle.
 */
export async function extractPosts(
  zip: JSZip
): Promise<{ posts: ParsedBlogPost[]; errors: Array<{ path: string; error: string }> }> {
  const posts: ParsedBlogPost[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  // Find all .md files in posts folder
  const postFiles = zip.file(/^posts\/.*\.md$/);

  for (const file of postFiles) {
    const content = await file.async('string');
    const parseResult = parseBlogPostMarkdown(content);

    if (parseResult.success && parseResult.data) {
      posts.push(parseResult.data);
    } else {
      errors.push({ path: file.name, error: parseResult.error ?? '未知的解析錯誤' });
    }
  }

  return { posts, errors };
}

// =============================================================================
// Preview (Dry Run)
// =============================================================================

/**
 * Preview a blog import bundle without writing to database.
 *
 * Validates all data and returns a summary of what would be imported.
 *
 * @param zipBuffer - The uploaded ZIP file as a Buffer
 * @returns Preview result with validation details
 */
export async function previewBlogImport(
  zipBuffer: Buffer | ArrayBuffer
): Promise<BlogImportPreview> {
  try {
    // Load ZIP
    const zip = await JSZip.loadAsync(zipBuffer);

    // Extract categories
    const { categories, error: catError } = await extractCategories(zip);
    if (catError) {
      return {
        success: false,
        error: catError,
        categories: { total: 0, valid: 0, items: [] },
        posts: { total: 0, valid: 0, items: [] },
        missingCategories: [],
      };
    }

    // Validate categories
    const categoryItems: ImportPreviewItem[] = [];
    const validCategories: BlogCategoryImportData[] = [];
    const categorySlugs = new Set<string>();

    // Check for duplicate slugs
    const duplicateSlugs = findDuplicateCategorySlugs(categories);
    if (duplicateSlugs.length > 0) {
      return {
        success: false,
        error: `Duplicate category slugs found: ${duplicateSlugs.join(', ')}`,
        categories: { total: categories.length, valid: 0, items: [] },
        posts: { total: 0, valid: 0, items: [] },
        missingCategories: [],
      };
    }

    for (const cat of categories) {
      const result = validateBlogCategoryData(cat);
      if (result.valid && result.data) {
        validCategories.push(result.data);
        categorySlugs.add(cat.slug);
        categoryItems.push({ slug: cat.slug, valid: true });
      } else {
        categoryItems.push({ slug: cat.slug, valid: false, errors: result.errors });
      }
    }

    // Extract and validate posts
    const { posts, errors: parseErrors } = await extractPosts(zip);
    const postItems: ImportPreviewItem[] = [];
    const validPosts: BlogPostImportData[] = [];
    const missingCategories = new Set<string>();

    // Add parse errors
    for (const err of parseErrors) {
      postItems.push({
        slug: err.path,
        valid: false,
        errors: { parse: err.error },
      });
    }

    for (const post of posts) {
      const result = validateBlogPostData(post);
      if (result.valid && result.data) {
        // Check if category exists in bundle
        if (!categorySlugs.has(result.data.category_slug)) {
          missingCategories.add(result.data.category_slug);
        }
        validPosts.push(result.data);
        postItems.push({
          slug: post.frontmatter.slug,
          title: post.frontmatter.title_en,
          valid: true,
        });
      } else {
        postItems.push({
          slug: post.frontmatter.slug,
          title: post.frontmatter.title_en,
          valid: false,
          errors: result.errors,
        });
      }
    }

    return {
      success: true,
      categories: {
        total: categories.length,
        valid: validCategories.length,
        items: categoryItems,
      },
      posts: {
        total: posts.length + parseErrors.length,
        valid: validPosts.length,
        items: postItems,
      },
      missingCategories: Array.from(missingCategories),
    };
  } catch (error) {
    return {
      success: false,
      error: `處理 ZIP 失敗：${error instanceof Error ? error.message : String(error)}`,
      categories: { total: 0, valid: 0, items: [] },
      posts: { total: 0, valid: 0, items: [] },
      missingCategories: [],
    };
  }
}
