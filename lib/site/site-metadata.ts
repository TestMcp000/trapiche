import type { CompanySetting, SiteContent } from '@/lib/types/content';
import { getCompanySettingValue } from '@/lib/modules/content/company-settings';
import { pickLocaleContent } from '@/lib/i18n/pick-locale';

/**
 * Resolve site display name using the SSoT fallback chain.
 *
 * Priority:
 * 1) company_settings.company_name_short
 * 2) site_content(section_key='metadata').title
 * 3) caller-provided fallbackTitle (typically next-intl `metadata.title`)
 */
export function resolveSiteName(args: {
  settings: CompanySetting[];
  siteContent: SiteContent[];
  locale: string;
  fallbackTitle: string;
}): string {
  const { settings, siteContent, locale, fallbackTitle } = args;

  const companyNameShort = getCompanySettingValue(settings, 'company_name_short');
  if (companyNameShort) return companyNameShort;

  const metadataContent = siteContent.find((c) => c.section_key === 'metadata');
  if (metadataContent) {
    const content = pickLocaleContent<{ title?: string }>(metadataContent, locale);
    if (content?.title) return content.title;
  }

  return fallbackTitle;
}

/**
 * Resolve site description using the SSoT fallback chain.
 *
 * Priority:
 * 1) site_content(section_key='metadata').description
 * 2) caller-provided fallbackDescription (typically next-intl `metadata.description`)
 */
export function resolveSiteDescription(args: {
  siteContent: SiteContent[];
  locale: string;
  fallbackDescription: string;
}): string {
  const { siteContent, locale, fallbackDescription } = args;

  const metadataContent = siteContent.find((c) => c.section_key === 'metadata');
  if (metadataContent) {
    const content = pickLocaleContent<{ description?: string }>(metadataContent, locale);
    if (content?.description) return content.description;
  }

  return fallbackDescription;
}

