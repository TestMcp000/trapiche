'use server';

import { togglePublishSiteContent } from '@/lib/modules/content/io';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import { revalidatePath, revalidateTag } from 'next/cache';
import { buildGalleryListUrl } from '@/lib/seo/url-builders';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';

export async function toggleSectionVisibility(
  sectionKey: string,
  publish: boolean,
  locale: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
      return actionError(guard.errorCode);
    }

    if (!sectionKey) {
      return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
    }

    // Toggle the publish status
    const result = await togglePublishSiteContent(sectionKey, publish, guard.userId);

    if (!result) {
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    // Invalidate cached site content (Header/Footer/Home rely on unstable_cache tags)
    revalidateTag('site-content', { expire: 0 });

    // Revalidate paths
    revalidatePath(`/${locale}/admin/content`);
    revalidatePath(`/${locale}`); // Revalidate homepage

    // Gallery-specific revalidations
    if (sectionKey === 'gallery') {
      revalidatePath(buildGalleryListUrl(locale));
      revalidatePath('/sitemap.xml');
    }

    return actionSuccess();
  } catch (error) {
    console.error('Error toggling section visibility:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}
