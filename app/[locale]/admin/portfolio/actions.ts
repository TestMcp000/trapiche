'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { 
  createPortfolioItem, 
  updatePortfolioItem, 
  deletePortfolioItem 
} from '@/lib/modules/content/io';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';
import type { PortfolioItemInput } from '@/lib/types/content';
import { LOCALES } from '@/lib/i18n/locales';

/**
 * Revalidate all portfolio-related caches
 */
function revalidatePortfolioCaches(locale: string) {
  // Invalidate cached portfolio data
  revalidateTag('portfolio', { expire: 0 });
  
  // Revalidate paths for all locales
  for (const loc of LOCALES) {
    revalidatePath(`/${loc}`);
    revalidatePath(`/${loc}/portfolio`);
  }
  
  // Revalidate admin path for current locale
  revalidatePath(`/${locale}/admin/portfolio`);
  
  // Revalidate sitemap
  revalidatePath('/sitemap.xml');
}

/**
 * Server action to save (create or update) a portfolio item.
 */
export async function savePortfolioAction(
  id: string | null,
  item: Partial<PortfolioItemInput>,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }
    
    let result;
    if (id) {
      // Update existing
      result = await updatePortfolioItem(id, item, guard.userId);
    } else {
      // Create new
      result = await createPortfolioItem(item as PortfolioItemInput, guard.userId);
    }
    
    if (!result) {
      return actionError(id ? ADMIN_ERROR_CODES.UPDATE_FAILED : ADMIN_ERROR_CODES.CREATE_FAILED);
    }
    
    // Revalidate all portfolio caches
    revalidatePortfolioCaches(locale);
    
    return actionSuccess();
  } catch (err) {
    console.error('Save portfolio action error:', err);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Server action to delete a portfolio item.
 */
export async function deletePortfolioAction(
  id: string,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }
    
    if (!id) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await deletePortfolioItem(id, guard.userId);
    
    if (!result) {
      return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
    }
    
    // Revalidate all portfolio caches
    revalidatePortfolioCaches(locale);
    
    return actionSuccess();
  } catch (err) {
    console.error('Delete portfolio action error:', err);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Server action to toggle visibility of a portfolio item.
 */
export async function toggleVisibilityAction(
  id: string,
  visible: boolean,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }
    
    if (!id) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await updatePortfolioItem(id, { is_visible: visible }, guard.userId);
    
    if (!result) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }
    
    // Revalidate all portfolio caches
    revalidatePortfolioCaches(locale);
    
    return actionSuccess();
  } catch (err) {
    console.error('Toggle visibility action error:', err);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}
