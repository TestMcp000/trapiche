/**
 * HomePageV2 - New home page layout with UIUX design alignment
 *
 * Server component that renders the v2 home layout.
 * Data fetching is handled by app/[locale]/page.tsx (single data owner).
 * This component only receives prepared data via props.
 *
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md
 * @see ARCHITECTURE.md §3.0 (single data owner pattern)
 */

import Footer from "@/components/Footer";
import {
  MarqueeNotice,
  HeaderBarV2Client,
  HeroStageClient,
  SuggestSectionClient,
  FloatingFab,
} from "@/components/home";
import { pickLocaleContent } from "@/lib/i18n/pick-locale";
import { isValidExternalUrl } from "@/lib/validators/external-url";
import type { SiteContent, CompanySetting } from "@/lib/types/content";
import type {
  GalleryItem,
  GalleryHotspotPublic,
  GalleryPin,
} from "@/lib/types/gallery";
import type { ResolvedHamburgerNav } from "@/lib/types/hamburger-nav";
import { getCompanySettingValue } from "@/lib/modules/content/company-settings";

/** Hotspot with rendered HTML (from markdown) */
export interface HotspotWithHtml extends GalleryHotspotPublic {
  description_html: string;
}

/** Props passed from page.tsx - all data pre-fetched */
export interface HomePageV2Props {
  locale: string;
  siteContents: SiteContent[];
  settings: CompanySetting[];
  resolvedNav: ResolvedHamburgerNav;
  heroPins: GalleryPin[];
  heroHotspots: HotspotWithHtml[];
}

interface HeroContent {
  title: string;
  lead: string;
  cta: string;
  ctaHref?: string;
}

// Article shape rotation for visual variety
const ARTICLE_SHAPES = ["circle", "blob", "square", "triangle"] as const;
const ARTICLE_COLORS = ["#F3AE69", "#E8C4A0", "#DEB890", "#F3AE69"];

export function HomePageV2({
  locale,
  siteContents,
  settings,
  resolvedNav,
  heroPins,
  heroHotspots,
}: HomePageV2Props) {
  // Get hero item (first pin with surface='hero')
  const heroPin = heroPins.length > 0 ? heroPins[0] : null;
  const heroItem: GalleryItem | null = heroPin?.item || null;

  // Get marquee notice content
  const marqueeLabel = getCompanySettingValue(settings, "home_notice_label_zh", "Notice");
  const marqueeText = getCompanySettingValue(
    settings,
    "home_notice_text_zh",
    "歡迎來到心理師療癒空間",
  );

  // Get lecture CTA settings
  const rawEventCtaUrl = getCompanySettingValue(
    settings,
    "home_event_cta_url",
    "https://forms.google.com",
  );
  const eventCtaLabel = getCompanySettingValue(
    settings,
    "home_event_cta_label_zh",
    "講座邀請",
  );

  // Render-side hardening: validate URL before passing to FloatingFab
  // Prevents XSS from legacy invalid URLs in DB
  const eventCtaUrl = isValidExternalUrl(rawEventCtaUrl) ? rawEventCtaUrl : null;
  if (!eventCtaUrl && rawEventCtaUrl) {
    console.warn(
      `[HomePageV2] Invalid event CTA URL blocked: "${rawEventCtaUrl}". Only https: and mailto: are allowed.`
    );
  }

  // Get hero content from site_content
  const heroContent = siteContents.find(
    (c: SiteContent) => c.section_key === "hero",
  );
  const hero = pickLocaleContent<HeroContent>(heroContent, locale) || {
    title: "藝術療癒",
    lead: "透過創作找回內心的平靜",
    cta: "瞭解更多",
  };

  // Get suggest articles (placeholder - would fetch from blog in production)
  // For now using mock data matching uiux design
  const suggestArticles = [
    {
      id: "1",
      slug: "anxiety-body-signals",
      title: "焦慮來時，身體在說什麼？",
      shape: ARTICLE_SHAPES[0],
      accentColor: ARTICLE_COLORS[0],
    },
    {
      id: "2",
      slug: "building-boundaries",
      title: "建立界線：溫柔但清楚的練習",
      shape: ARTICLE_SHAPES[1],
      accentColor: ARTICLE_COLORS[1],
    },
    {
      id: "3",
      slug: "self-care-methods",
      title: "自我照顧的 3 個小方法",
      shape: ARTICLE_SHAPES[2],
      accentColor: ARTICLE_COLORS[2],
    },
    {
      id: "4",
      slug: "relationship-safety",
      title: "關係裡的安全感如何長出來？",
      shape: ARTICLE_SHAPES[3],
      accentColor: ARTICLE_COLORS[3],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F2EA]">
      {/* Marquee Notice */}
      <MarqueeNotice label={marqueeLabel} text={marqueeText} />

      {/* Header with Hamburger Menu */}
      <HeaderBarV2Client nav={resolvedNav} locale={locale} />

      <main>
        {/* Hero Section - Two Column Layout */}
        <section className="w-full py-12 md:py-20 px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left: Text Content */}
              <div className="space-y-6 order-2 lg:order-1">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#4A4A4A] leading-tight">
                  {hero.title}
                </h1>
                <p className="text-lg md:text-xl text-[#6B6B6B] leading-relaxed">
                  {hero.lead}
                </p>
                <div className="pt-4">
                  <a
                    href={hero.ctaHref || `/${locale}/about`}
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-white bg-[#F3AE69] hover:bg-[#E89D58] transition-all hover:scale-105 active:scale-95 shadow-lg">
                    {hero.cta}
                  </a>
                </div>
              </div>

              {/* Right: Artwork Stage with Hotspots */}
              <div className="order-1 lg:order-2">
                {heroItem ? (
                  <HeroStageClient
                    imageUrl={heroItem.image_url}
                    imageAlt={heroItem.image_alt_zh || heroItem.title_zh}
                    imageWidth={heroItem.image_width || 900}
                    imageHeight={heroItem.image_height || 675}
                    hotspots={heroHotspots}
                  />
                ) : (
                  /* Empty State: Placeholder blob */
                  <div className="relative bg-[#EEEBE3] rounded-[3rem] p-8 md:p-16 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                    <div
                      className="mx-auto overflow-hidden bg-gradient-to-br from-[#F5F2EA] to-[#E8E4DA] shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
                      style={{
                        aspectRatio: "4/3",
                        maxWidth: "500px",
                        borderRadius: "48% 52% 51% 49% / 45% 53% 47% 55%",
                      }}>
                      {/* Abstract decorative elements */}
                      <div className="absolute top-1/4 left-1/4 w-24 h-24 rounded-full bg-[#F3AE69]/20 blur-3xl" />
                      <div className="absolute bottom-1/3 right-1/4 w-32 h-32 rounded-full bg-[#DEB890]/30 blur-3xl" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Floating Action Button - only render if URL is valid */}
        {eventCtaUrl && (
          <>
            <div className="hidden md:block">
              <FloatingFab href={eventCtaUrl} label={eventCtaLabel} />
            </div>
            <div className="md:hidden">
              <FloatingFab href={eventCtaUrl} label={eventCtaLabel} isMobile />
            </div>
          </>
        )}

        {/* Suggested Articles Section */}
        <SuggestSectionClient
          title="Suggest"
          articles={suggestArticles}
          locale={locale}
        />
      </main>

      <Footer locale={locale} />
    </div>
  );
}

export default HomePageV2;
