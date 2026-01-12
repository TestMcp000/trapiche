'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { 
  createPortfolioItem, 
  updatePortfolioItem, 
  deletePortfolioItem 
} from '@/lib/modules/content/io';
import { createClient } from '@/lib/infrastructure/supabase/server';
import type { PortfolioItemInput } from '@/lib/types/content';
import { LOCALES } from '@/lib/i18n/locales';

export type PortfolioActionResult = {
  success: boolean;
  error?: string;
};

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
): Promise<PortfolioActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    let result;
    if (id) {
      // Update existing
      result = await updatePortfolioItem(id, item, user.id);
    } else {
      // Create new
      result = await createPortfolioItem(item as PortfolioItemInput, user.id);
    }
    
    if (!result) {
      return { success: false, error: 'Save failed' };
    }
    
    // Revalidate all portfolio caches
    revalidatePortfolioCaches(locale);
    
    return { success: true };
  } catch (err) {
    console.error('Save portfolio action error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Server action to delete a portfolio item.
 */
export async function deletePortfolioAction(
  id: string,
  locale: string
): Promise<PortfolioActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const result = await deletePortfolioItem(id, user.id);
    
    if (!result) {
      return { success: false, error: 'Delete failed' };
    }
    
    // Revalidate all portfolio caches
    revalidatePortfolioCaches(locale);
    
    return { success: true };
  } catch (err) {
    console.error('Delete portfolio action error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Server action to toggle visibility of a portfolio item.
 */
export async function toggleVisibilityAction(
  id: string,
  visible: boolean,
  locale: string
): Promise<PortfolioActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const result = await updatePortfolioItem(id, { is_visible: visible }, user.id);
    
    if (!result) {
      return { success: false, error: 'Update failed' };
    }
    
    // Revalidate all portfolio caches
    revalidatePortfolioCaches(locale);
    
    return { success: true };
  } catch (err) {
    console.error('Toggle visibility action error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
