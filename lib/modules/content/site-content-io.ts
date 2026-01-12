/**
 * Site Content IO
 *
 * Server-side data access for site content sections.
 * Manages the site_content table for dynamic page content.
 *
 * @module lib/modules/content/site-content-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { SiteContent } from '@/lib/types/content';
import { recordHistory } from './history-io';

// =============================================================================
// Site Content Read Operations
// =============================================================================

/**
 * Get a specific site content section by key
 */
export async function getSiteContent(sectionKey: string): Promise<SiteContent | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('site_content')
    .select('*')
    .eq('section_key', sectionKey)
    .single();

  if (error) {
    console.error('Error fetching site content:', error);
    return null;
  }

  return data;
}

/**
 * Get all site content sections
 */
export async function getAllSiteContent(): Promise<SiteContent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('site_content')
    .select('*')
    .order('section_key');

  if (error) {
    console.error('Error fetching all site content:', error);
    return [];
  }

  return data || [];
}

/**
 * Get only published site content (for frontend)
 */
export async function getPublishedSiteContent(): Promise<SiteContent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('site_content')
    .select('*')
    .eq('is_published', true)
    .order('section_key');

  if (error) {
    console.error('Error fetching published site content:', error);
    return [];
  }

  return data || [];
}

// =============================================================================
// Site Content Write Operations
// =============================================================================

/**
 * Update site content section (creates history record)
 */
export async function updateSiteContent(
  sectionKey: string,
  contentEn: Record<string, unknown>,
  contentZh: Record<string, unknown>,
  userId?: string
): Promise<SiteContent | null> {
  const supabase = await createClient();

  // Get current content for history
  const current = await getSiteContent(sectionKey);

  const { data, error } = await supabase
    .from('site_content')
    .update({
      content_en: contentEn,
      content_zh: contentZh,
      updated_at: new Date().toISOString(),
      updated_by: userId
    })
    .eq('section_key', sectionKey)
    .select()
    .single();

  if (error) {
    console.error('Error updating site content:', error);
    return null;
  }

  // Record history
  if (current && data) {
    await recordHistory('site_content', data.id, 'update',
      { content_en: current.content_en, content_zh: current.content_zh },
      { content_en: contentEn, content_zh: contentZh },
      userId
    );
  }

  return data;
}

/**
 * Publish or unpublish site content
 */
export async function togglePublishSiteContent(
  sectionKey: string,
  publish: boolean,
  userId?: string
): Promise<SiteContent | null> {
  const supabase = await createClient();

  const current = await getSiteContent(sectionKey);

  const { data, error } = await supabase
    .from('site_content')
    .update({
      is_published: publish,
      updated_at: new Date().toISOString(),
      updated_by: userId
    })
    .eq('section_key', sectionKey)
    .select()
    .single();

  if (error) {
    console.error('Error toggling publish status:', error);
    return null;
  }

  // Record history
  if (current && data) {
    await recordHistory('site_content', data.id, publish ? 'publish' : 'unpublish',
      { is_published: current.is_published },
      { is_published: publish },
      userId
    );
  }

  return data;
}
