/**
 * Section Renderer - Server Component
 *
 * Dispatches to the appropriate section component based on section_key (preset)
 * or section_type (custom). This is the main orchestration component for the
 * dynamic landing page.
 */

import type { LandingSection, TextContent, TextImageContent, CardsContent, CtaContent } from '@/lib/types/landing';
import type { SiteContent, Service, PortfolioItem } from '@/lib/types/content';
import type { GalleryItem } from '@/lib/types/gallery';

// Preset section components
import HeroSection from './HeroSection';
import AboutSection from './AboutSection';
import ServicesSection from './ServicesSection';
import PlatformsSection from './PlatformsSection';
import PortfolioSection from './PortfolioSection';
import ContactSection from './ContactSection';

// Custom section components
import TextSection from './TextSection';
import TextImageSection from './TextImageSection';
import CardsSection from './CardsSection';
import GallerySection from './GallerySection';
import CtaSection from './CtaSection';

// ============================================
// Types
// ============================================

interface CompanyMeta {
  emailAddress: string;
  githubUrl: string;
  domainUrl: string;
  founderName: string;
  founderGithub: string;
}

interface UILabels {
  services: { title: string };
  portfolio: {
    title: string;
    intro: string;
    visit: string;
    inDevelopment: string;
  };
}

interface HeroContent {
  eyebrow: string;
  title: string;
  lead: string;
  cta: string;
  secondaryCta: string;
  cardTitle: string;
  cardItems: string[];
}

interface AboutContent {
  title: string;
  paragraph1: string;
  paragraph2: string;
  snapshot: string;
  founder: string;
  email: string;
  domain: string;
  focus: string;
  focusValue: string;
}

interface PlatformsContent {
  title: string;
  paragraph1: string;
  paragraph2: string;
  cardTitle: string;
  items: string[];
}

interface ContactContent {
  title: string;
  paragraph: string;
  email: string;
  github: string;
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
}

export interface SectionRendererProps {
  section: LandingSection;
  locale: string;
  siteContents: SiteContent[];
  services: Service[];
  portfolioItems?: PortfolioItem[];
  companyMeta?: CompanyMeta | null;
  uiLabels: UILabels;
  galleryData?: Record<string, GalleryItem[]>;
}

// ============================================
// Helpers
// ============================================

/**
 * Get localized content from a SiteContent object
 */
function getContent<T>(content: SiteContent | undefined, locale: string): T | null {
  if (!content) return null;
  return (locale === 'zh' ? content.content_zh : content.content_en) as T;
}

// ============================================
// Component
// ============================================

export default function SectionRenderer({
  section,
  locale,
  siteContents,
  services,
  portfolioItems = [],
  companyMeta,
  uiLabels,
  galleryData = {},
}: SectionRendererProps) {
  // Build content map for quick lookups
  const contentMap = new Map<string, SiteContent>();
  siteContents.forEach((c) => contentMap.set(c.section_key, c));

  // Get localized title and subtitle from landing section
  const sectionTitle = locale === 'zh' ? section.title_zh : section.title_en;
  const sectionSubtitle = locale === 'zh' ? section.subtitle_zh : section.subtitle_en;
  const sectionContent = locale === 'zh' ? section.content_zh : section.content_en;

  // ============================================
  // Preset Sections (by section_key)
  // ============================================
  switch (section.section_key) {
    case 'hero': {
      const hero = getContent<HeroContent>(contentMap.get('hero'), locale);
      if (!hero || !companyMeta) return null;
      return (
        <HeroSection
          hero={hero}
          locale={locale}
          emailAddress={companyMeta.emailAddress}
          githubUrl={companyMeta.githubUrl}
        />
      );
    }

    case 'about': {
      const about = getContent<AboutContent>(contentMap.get('about'), locale);
      if (!about || !companyMeta) return null;
      return (
        <AboutSection
          about={about}
          locale={locale}
          founderName={companyMeta.founderName}
          founderGithub={companyMeta.founderGithub}
          emailAddress={companyMeta.emailAddress}
          domainUrl={companyMeta.domainUrl}
        />
      );
    }

    case 'services': {
      if (services.length === 0) return null;
      return (
        <ServicesSection
          services={services}
          locale={locale}
          title={sectionTitle || uiLabels.services.title}
        />
      );
    }

    case 'platforms': {
      const platforms = getContent<PlatformsContent>(contentMap.get('platforms'), locale);
      if (!platforms) return null;
      return <PlatformsSection platforms={platforms} locale={locale} />;
    }

    case 'product_design': {
      const items = galleryData[section.id] || [];
      if (items.length === 0) return null;
      return (
        <GallerySection
          id={section.section_key}
          title={sectionTitle}
          subtitle={sectionSubtitle}
          items={items}
          locale={locale}
        />
      );
    }

    case 'portfolio': {
      if (portfolioItems.length === 0) return null;
      return (
        <PortfolioSection
          portfolioItems={portfolioItems}
          locale={locale}
          labels={{
            title: sectionTitle || uiLabels.portfolio.title,
            intro: sectionSubtitle || uiLabels.portfolio.intro,
            visit: uiLabels.portfolio.visit,
            inDevelopment: uiLabels.portfolio.inDevelopment,
          }}
        />
      );
    }

    case 'contact': {
      const contact = getContent<ContactContent>(contentMap.get('contact'), locale);
      if (!contact || !companyMeta) return null;
      return (
        <ContactSection
          contact={contact}
          emailAddress={companyMeta.emailAddress}
          githubUrl={companyMeta.githubUrl}
        />
      );
    }
  }

  // ============================================
  // Custom Sections (by section_type)
  // ============================================
  switch (section.section_type) {
    case 'text': {
      return (
        <TextSection
          id={section.section_key}
          title={sectionTitle}
          subtitle={sectionSubtitle}
          content={sectionContent as TextContent | null}
        />
      );
    }

    case 'text_image': {
      return (
        <TextImageSection
          id={section.section_key}
          title={sectionTitle}
          subtitle={sectionSubtitle}
          content={sectionContent as TextImageContent | null}
        />
      );
    }

    case 'cards': {
      return (
        <CardsSection
          id={section.section_key}
          title={sectionTitle}
          subtitle={sectionSubtitle}
          content={sectionContent as CardsContent | null}
        />
      );
    }

    case 'gallery': {
      const items = galleryData[section.id] || [];
      return (
        <GallerySection
          id={section.section_key}
          title={sectionTitle}
          subtitle={sectionSubtitle}
          items={items}
          locale={locale}
        />
      );
    }

    case 'cta': {
      return (
        <CtaSection
          id={section.section_key}
          title={sectionTitle}
          subtitle={sectionSubtitle}
          content={sectionContent as CtaContent | null}
        />
      );
    }

    default:
      return null;
  }
}
