/**
 * Collaboration Page
 *
 * Independent content page for collaboration invitations.
 * Content is fetched from site_content(section_key='collaboration').
 *
 * @see doc/SPEC.md (Collaboration: /collaboration)
 * @see doc/archive/2026-01-28-step-plan-v15-cms-vnext-nav-blog-taxonomy-events-pages.md (PR-40)
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-C5)
 * @see lib/seo/url-builders.ts (buildCollaborationUrl)
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  getPublishedSiteContentCached,
  getCompanySettingsCached,
} from '@/lib/modules/content/cached';
import { getMetadataAlternates, SITE_URL } from '@/lib/seo';
import { generateBreadcrumbJsonLd } from '@/lib/seo/jsonld';
import { buildCollaborationUrl } from '@/lib/seo/url-builders';
import type { SiteContent, CompanySetting } from '@/lib/types/content';
import { getCompanySettingValue } from '@/lib/modules/content/company-settings';

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Collaboration content structure from site_content
 */
interface CollaborationContent {
  title: string;
  lead: string;
  sections: Array<{
    title: string;
    description: string;
    items?: string[];
  }>;
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
}

/**
 * Default content fallback (if site_content not yet seeded)
 */
const DEFAULT_COLLABORATION_CONTENT: CollaborationContent = {
  title: '合作邀請',
  lead: '歡迎企業、學校或社群單位洽談講座、工作坊或企業內訓合作。',
  sections: [
    {
      title: '講座主題',
      description: '依據單位需求規劃主題，常見方向包含：',
      items: [
        '情緒照顧與壓力調適',
        '職場心理健康與自我覺察',
        '睡眠議題與身心復原',
        '關係界線與人際溝通',
      ],
    },
    {
      title: '工作坊形式',
      description: '結合藝術療癒媒材的體驗式學習：',
      items: [
        '半日工作坊（2-3 小時）',
        '全日工作坊（6 小時）',
        '系列課程（依需求規劃）',
      ],
    },
    {
      title: '企業內訓',
      description: '為企業量身打造的員工心理健康課程，可結合 EAP 方案規劃。',
    },
  ],
  ctaTitle: '聯繫洽談',
  ctaText: '請透過電子郵件聯繫，說明您的需求與期待的合作形式，我們會在工作日內回覆。',
  ctaButton: '寄送郵件',
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const alternates = getMetadataAlternates('/collaboration', locale);

  const title = '合作邀請';
  const description = '歡迎企業、學校或社群單位洽談講座、工作坊或企業內訓合作';

  return {
    title,
    description,
    alternates,
  };
}

export default async function CollaborationPage({ params }: PageProps) {
  const { locale } = await params;

  let siteContents: SiteContent[] = [];
  let settings: CompanySetting[] = [];

  try {
    [siteContents, settings] = await Promise.all([
      getPublishedSiteContentCached(),
      getCompanySettingsCached(),
    ]);
  } catch (error) {
    console.error('[CollaborationPage] Error fetching data:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            內容暫時無法取得
          </h1>
          <p className="text-secondary">請稍後再試。</p>
          <Link
            href={`/${locale}`}
            className="mt-4 inline-block text-primary hover:underline">
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  // Get collaboration content from site_content
  const contentMap = new Map<string, SiteContent>();
  siteContents.forEach((c: SiteContent) => contentMap.set(c.section_key, c));

  const collaborationContent = contentMap.get('collaboration');
  const content: CollaborationContent = collaborationContent?.content_zh
    ? (collaborationContent.content_zh as unknown as CollaborationContent)
    : DEFAULT_COLLABORATION_CONTENT;

  // Get company email for mailto CTA
  const emailAddress = getCompanySettingValue(settings, 'email');

  // JSON-LD breadcrumbs
  const breadcrumbs = [
    { name: '首頁', url: `${SITE_URL}/${locale}` },
    { name: '合作邀請', url: `${SITE_URL}${buildCollaborationUrl(locale)}` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header locale={locale} />
      <main className="pt-24 md:pt-32 pb-16 min-h-[60vh]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {content.title}
            </h1>
            <p className="text-lg text-secondary max-w-2xl mx-auto">
              {content.lead}
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8 mb-12">
            {content.sections.map((section, index) => (
              <div
                key={index}
                className="bg-surface-raised rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  {section.title}
                </h2>
                <p className="text-secondary mb-4">{section.description}</p>
                {section.items && section.items.length > 0 && (
                  <ul className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <li
                        key={itemIndex}
                        className="flex items-start text-secondary">
                        <span className="text-primary mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="bg-primary/5 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {content.ctaTitle}
            </h2>
            <p className="text-secondary mb-6 max-w-lg mx-auto">
              {content.ctaText}
            </p>
            {emailAddress && (
              <a
                href={`mailto:${emailAddress}?subject=合作邀請洽談`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors">
                <svg
                  className="w-5 h-5"
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
                {content.ctaButton}
              </a>
            )}
          </div>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
