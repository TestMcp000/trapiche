'use server';

/**
 * Server actions for blog category management
 *
 * Follows ARCHITECTURE.md principles:
 * - Server actions only do: parse/validate → call lib → revalidate
 * - No direct .from() queries in app layer
 * - IO boundaries enforced via lib/modules/blog/admin-io.ts
 *
 * Uses unified ActionResult<T> type with error codes for i18n/security.
 * @see lib/types/action-result.ts - ActionResult types
 * @see lib/modules/auth/admin-guard.ts - Auth guard helpers
 * @see lib/modules/blog/admin-io.ts - Category IO functions
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
  getCategoriesWithPostCount,
  createCategory,
  deleteCategory,
} from '@/lib/modules/blog/admin-io';
import {
  ADMIN_ERROR_CODES,
  actionSuccess,
  actionError,
  type ActionResult,
} from '@/lib/types/action-result';
import { isValidSlug } from '@/lib/validators/slug';
import type { CategoryWithCount } from '@/lib/types/blog';

// ============================================================================
// Types
// ============================================================================

export interface CreateCategoryInput {
  name_en: string;
  name_zh: string;
  slug: string;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Fetch all categories with post counts
 */
export async function fetchCategoriesAction(): Promise<ActionResult<CategoryWithCount[]>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    const categories = await getCategoriesWithPostCount();
    return actionSuccess(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Create a new category
 */
export async function createCategoryAction(
  input: CreateCategoryInput,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    // Validate input
    if (!input.name_en?.trim() || !input.name_zh?.trim() || !input.slug?.trim()) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    // Validate slug format (single source: lib/validators/slug.ts)
    if (!isValidSlug(input.slug)) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const category = await createCategory({
      name_en: input.name_en.trim(),
      name_zh: input.name_zh.trim(),
      slug: input.slug.trim(),
    });

    if (!category) {
      return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
    }

    // Revalidate after successful creation
    revalidateTag('blog', { expire: 0 });
    revalidatePath(`/${locale}/admin/categories`);
    revalidatePath(`/${locale}/blog`);

    return actionSuccess();
  } catch (error) {
    console.error('Error creating category:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Delete a category
 */
export async function deleteCategoryAction(
  categoryId: string,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    if (!categoryId) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const success = await deleteCategory(categoryId);

    if (!success) {
      return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
    }

    // Revalidate after successful deletion
    revalidateTag('blog', { expire: 0 });
    revalidatePath(`/${locale}/admin/categories`);
    revalidatePath(`/${locale}/blog`);

    return actionSuccess();
  } catch (error) {
    console.error('Error deleting category:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}
