/**
 * Content IO Layer (Facade)
 *
 * Thin re-export module that provides backward compatibility.
 * All implementations are in capability-focused submodules.
 *
 * @module lib/modules/content/io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 *
 * Submodules:
 * - site-content-io.ts: Site content sections
 * - portfolio-io.ts: Portfolio items
 * - services-io.ts: Services
 * - company-settings-io.ts: Company settings
 * - history-io.ts: Content history tracking
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { PortfolioItemInput, ServiceInput } from '@/lib/types/content';

// =============================================================================
// Site Content
// =============================================================================

export {
  getSiteContent,
  getAllSiteContent,
  getPublishedSiteContent,
  updateSiteContent,
  togglePublishSiteContent,
} from './site-content-io';

// =============================================================================
// Portfolio
// =============================================================================

export {
  getAllPortfolioItems,
  getVisiblePortfolioItems,
  getPortfolioItemById,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  reorderPortfolioItems,
} from './portfolio-io';

// =============================================================================
// Services
// =============================================================================

export {
  getAllServices,
  getVisibleServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from './services-io';

// =============================================================================
// Company Settings
// =============================================================================

export {
  getCompanySettings,
  getCompanySetting,
  updateCompanySetting,
} from './company-settings-io';

// =============================================================================
// History
// =============================================================================

export {
  recordHistory,
  getContentHistory,
  getAllRecentHistory,
} from './history-io';

// =============================================================================
// Cross-module Operations (kept in facade to avoid circular dependencies)
// =============================================================================

// Import submodule functions for restoreFromHistory
import { updateSiteContent } from './site-content-io';
import { updatePortfolioItem } from './portfolio-io';
import { updateService } from './services-io';
import { updateCompanySetting } from './company-settings-io';

/**
 * Restore content from a history record
 * 
 * This function is kept in the facade because it depends on multiple submodules
 * and would create circular dependencies if placed in history-io.ts
 */
export async function restoreFromHistory(
  historyId: string,
  userId?: string
): Promise<boolean> {
  const supabase = await createClient();

  // Get the history record
  const { data: historyRecord, error: historyError } = await supabase
    .from('content_history')
    .select('*')
    .eq('id', historyId)
    .single();

  if (historyError || !historyRecord) {
    console.error('Error fetching history record:', historyError);
    return false;
  }

  const { content_type, content_id, old_value } = historyRecord;

  // Can't restore if there's no old value (was a create action)
  if (!old_value) {
    console.error('Cannot restore: no previous state available');
    return false;
  }

  // Restore based on content type
  switch (content_type) {
    case 'site_content': {
      const { content_en, content_zh } = old_value as { content_en: Record<string, unknown>; content_zh: Record<string, unknown> };
      // Find the section_key from the content_id
      const { data: content } = await supabase
        .from('site_content')
        .select('section_key')
        .eq('id', content_id)
        .single();

      if (content) {
        await updateSiteContent(content.section_key, content_en, content_zh, userId);
      }
      break;
    }
    case 'portfolio': {
      await updatePortfolioItem(content_id, old_value as Partial<PortfolioItemInput>, userId);
      break;
    }
    case 'service': {
      await updateService(content_id, old_value as Partial<ServiceInput>, userId);
      break;
    }
    case 'setting': {
      const { key, value } = old_value as { key: string; value: string };
      await updateCompanySetting(key, value, userId);
      break;
    }
  }

  return true;
}
