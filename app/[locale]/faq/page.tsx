/**
 * FAQ Page
 *
 * Displays all public FAQs at /faq with FAQPage JSON-LD
 *
 * @see doc/meta/STEP_PLAN.md (PR-38)
 * @see lib/seo/url-builders.ts (buildFAQUrl)
 */

import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getVisibleFAQsCached } from "@/lib/modules/faq/cached";
import { getMetadataAlternates, SITE_URL } from "@/lib/seo";
import {
  generateFAQPageJsonLd,
  generateBreadcrumbJsonLd,
} from "@/lib/seo/jsonld";
import { buildFAQUrl } from "@/lib/seo/url-builders";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const alternates = getMetadataAlternates("/faq", locale);

  const title = "常見問題";
  const description = "瀏覽常見問題與解答，了解更多關於我們的服務";

  return {
    title,
    description,
    alternates,
  };
}

export default async function FAQPage({ params }: PageProps) {
  const { locale } = await params;

  // Load FAQs from database
  const faqs = await getVisibleFAQsCached();

  // JSON-LD breadcrumbs
  const breadcrumbs = [
    { name: "首頁", url: `${SITE_URL}/${locale}` },
    { name: "常見問題", url: `${SITE_URL}${buildFAQUrl(locale)}` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbs);

  // FAQPage JSON-LD for rich snippets
  const faqJsonLd =
    faqs.length > 0
      ? generateFAQPageJsonLd(
          faqs.map((faq) => ({
            question: faq.question_zh,
            answer: faq.answer_zh,
          })),
        )
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <Header locale={locale} />
      <main className="pt-24 md:pt-32 pb-16 min-h-[60vh]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              常見問題
            </h1>
            <p className="text-lg text-secondary max-w-2xl mx-auto">
              以下是一些常見的問題與解答，希望能幫助您了解更多
            </p>
          </div>

          {/* FAQ List */}
          {faqs.length > 0 ? (
            <div className="space-y-4">
              {faqs.map((faq) => (
                <FAQItem
                  key={faq.id}
                  question={faq.question_zh}
                  answer={faq.answer_zh}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-secondary">目前沒有常見問題</p>
            </div>
          )}
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}

/**
 * FAQ Item Component (Accordion style)
 */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group bg-surface-raised rounded-xl overflow-hidden shadow-sm">
      <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-surface-hover transition-colors">
        <h2 className="text-lg font-medium text-foreground pr-8">{question}</h2>
        <span className="flex-shrink-0 text-secondary group-open:rotate-180 transition-transform duration-200">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </summary>
      <div className="px-6 pb-6 text-secondary leading-relaxed">{answer}</div>
    </details>
  );
}
