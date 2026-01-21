import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getMetadataAlternates, SITE_URL } from "@/lib/seo";
import { generateHomePageJsonLd } from "@/lib/seo/jsonld";
import { HomePageV2, type HotspotWithHtml } from "@/components/home";
import {
  getPublishedSiteContentCached,
  getVisibleServicesCached,
  getCompanySettingsCached,
  getHamburgerNavCached,
} from "@/lib/modules/content/cached";
import {
  getVisibleGalleryPinsCached,
  getHotspotsByItemIdCached,
} from "@/lib/modules/gallery/cached";
import { resolveHamburgerNav } from "@/lib/site/nav-resolver";
import { hotspotsMarkdownToHtml } from "@/lib/markdown/hotspots";
import type { SiteContent, CompanySetting } from "@/lib/types/content";
import { getCompanySettingValue } from "@/lib/modules/content/company-settings";
import { pickLocaleContent } from "@/lib/i18n/pick-locale";

/**
 * Resolve siteName using SSoT fallback chain (ARCHITECTURE.md §3.11):
 * 1. company_settings.company_name_short
 * 2. site_content(section_key='metadata') title
 * 3. next-intl metadata.title
 * No hardcoded brand strings allowed.
 */
async function resolveSiteName(
  settings: CompanySetting[],
  siteContent: SiteContent[],
  locale: string,
): Promise<string> {
  // Priority 1: company_settings.company_name_short
  const companyNameShort = getCompanySettingValue(settings, "company_name_short");
  if (companyNameShort) {
    return companyNameShort;
  }

  // Priority 2: site_content(section_key='metadata') title
  const metadataContent = siteContent.find((c) => c.section_key === "metadata");
  if (metadataContent) {
    const content = pickLocaleContent<{ title: string }>(
      metadataContent,
      locale,
    );
    if (content?.title) {
      return content.title;
    }
  }

  // Priority 3: next-intl metadata.title (i18n fallback)
  const t = await getTranslations({ locale, namespace: "metadata" });
  return t("title");
}

/**
 * Resolve site description using SSoT fallback chain:
 * 1. site_content(section_key='metadata') description
 * 2. next-intl metadata.description
 * No hardcoded strings allowed.
 */
async function resolveSiteDescription(
  siteContent: SiteContent[],
  locale: string,
): Promise<string> {
  // Priority 1: site_content(section_key='metadata') description
  const metadataContent = siteContent.find((c) => c.section_key === "metadata");
  if (metadataContent) {
    const content = pickLocaleContent<{ description: string }>(
      metadataContent,
      locale,
    );
    if (content?.description) {
      return content.description;
    }
  }

  // Priority 2: next-intl metadata.description (i18n fallback)
  const t = await getTranslations({ locale, namespace: "metadata" });
  return t("description");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Generate hreflang alternates
  const alternates = getMetadataAlternates("", locale);

  // Try to load from database first
  const contents = await getPublishedSiteContentCached();
  const metadataContent = contents.find(
    (c: SiteContent) => c.section_key === "metadata",
  );

  if (metadataContent) {
    const content = pickLocaleContent<{ title: string; description: string }>(
      metadataContent,
      locale,
    );
    if (content) {
      return {
        title: content.title,
        description: content.description,
        alternates,
      };
    }
  }

  // Fallback to static translations
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
    alternates,
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // ==========================================================================
  // Single data owner: fetch ALL data needed for Home (SEO + UI) in parallel
  // @see ARCHITECTURE.md §3.0 (single data owner pattern)
  // ==========================================================================
  const [settings, services, siteContent, hamburgerNav, heroPins] =
    await Promise.all([
      getCompanySettingsCached(),
      getVisibleServicesCached(),
      getPublishedSiteContentCached(),
      getHamburgerNavCached(),
      getVisibleGalleryPinsCached("hero"),
    ]);

  // Resolve hamburger nav to render-ready format
  const resolvedNav = resolveHamburgerNav(hamburgerNav, locale);

  // Fetch hero hotspots if hero item exists
  const heroPin = heroPins.length > 0 ? heroPins[0] : null;
  const heroItem = heroPin?.item || null;

  let heroHotspots: HotspotWithHtml[] = [];
  if (heroItem) {
    const rawHotspots = await getHotspotsByItemIdCached(heroItem.id);
    // Convert markdown to HTML for each hotspot
    heroHotspots = await Promise.all(
      rawHotspots.map(async (h) => ({
        ...h,
        description_html: await hotspotsMarkdownToHtml(h.description_md),
      })),
    );
  }

  // ==========================================================================
  // JSON-LD for SEO (Organization + WebSite + Services + Breadcrumb)
  // ==========================================================================
  const siteUrl = SITE_URL;
  const emailAddress = getCompanySettingValue(settings, "email");
  const githubUrl = getCompanySettingValue(settings, "github_url");

  // Build breadcrumbs for homepage
  const breadcrumbs = [{ name: "首頁", url: `${siteUrl}/${locale}` }];

  // Resolve siteName and description using SSoT fallback chain
  const [siteName, description] = await Promise.all([
    resolveSiteName(settings, siteContent, locale),
    resolveSiteDescription(siteContent, locale),
  ]);

  const jsonLd = generateHomePageJsonLd({
    siteName,
    siteUrl,
    logo: `${siteUrl}/logo.png`,
    email: emailAddress,
    githubUrl,
    description,
    locale,
    services: services.map((s) => ({
      name: s.title_zh,
      description: s.description_zh || undefined,
    })),
    breadcrumbs,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageV2
        locale={locale}
        siteContents={siteContent}
        settings={settings}
        resolvedNav={resolvedNav}
        heroPins={heroPins}
        heroHotspots={heroHotspots}
      />
    </>
  );
}
