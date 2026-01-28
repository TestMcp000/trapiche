import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  getPublishedSiteContentCached,
  getCompanySettingsCached,
} from "@/lib/modules/content/cached";
import { getMetadataAlternates, SITE_URL } from "@/lib/seo";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import type { SiteContent } from "@/lib/types/content";
import { getCompanySettingValue } from "@/lib/modules/content/company-settings";

// Helper to get localized content
function getContent<T>(
  content: SiteContent | undefined,
  _locale: string,
): T | null {
  if (!content) return null;
  return content.content_zh as T;
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const alternates = getMetadataAlternates("/contact", locale);

  const title = "聯絡我們";
  const description = "透過聯絡方式與我們取得聯繫";

  return {
    title,
    description,
    alternates,
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Load content from database
  const [siteContents, settings] = await Promise.all([
    getPublishedSiteContentCached(),
    getCompanySettingsCached(),
  ]);

  // Map content by section
  const contentMap = new Map<string, SiteContent>();
  siteContents.forEach((c: SiteContent) => contentMap.set(c.section_key, c));

  // Get localized contact content
  const contact = getContent<ContactContent>(contentMap.get("contact"), locale);

  // Get settings
  const emailAddress = getCompanySettingValue(settings, "email");
  const githubUrl = getCompanySettingValue(settings, "github_url");

  // JSON-LD breadcrumbs
  const breadcrumbs = [
    { name: "首頁", url: `${SITE_URL}/${locale}` },
    { name: "聯絡我們", url: `${SITE_URL}/${locale}/contact` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbs);

  if (!contact) {
    return (
      <>
        <Header locale={locale} />
        <main className="pt-24 md:pt-32 pb-16">
          <div className="container mx-auto px-4 text-center">
            <p className="text-secondary">內容不存在</p>
          </div>
        </main>
        <Footer locale={locale} />
      </>
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header locale={locale} />
      <main className="pt-24 md:pt-32 pb-16">
        <section
          id="contact"
          className="py-24 md:py-32 bg-surface/30 border-t border-border-light">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
            <div className="glass-card rounded-theme-lg p-8 md:p-12 shadow-soft text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {contact.ctaTitle}
              </h2>
              <p className="text-lg text-secondary mb-8 max-w-xl mx-auto">
                {contact.ctaText}
              </p>

              {/* Mailto CTA Button */}
              <a
                href={`mailto:${emailAddress}`}
                className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-white bg-primary hover:bg-primary-hover transition-all shadow-glow hover:scale-[1.02] active:scale-[0.98]">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {contact.ctaButton}
              </a>

              {/* Contact Info */}
              <div className="mt-10 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 text-sm">
                <span className="text-secondary">聯絡方式：</span>
                <a
                  href={`mailto:${emailAddress}`}
                  className="text-secondary hover:text-primary transition-colors">
                  {emailAddress}
                </a>
                {githubUrl && (
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:text-primary transition-colors">
                    GitHub
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}
