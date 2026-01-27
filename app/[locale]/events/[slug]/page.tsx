/**
 * Event Detail Page
 *
 * Displays a single event at /events/[slug]
 *
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-C2)
 * @see lib/seo/jsonld.ts (generateEventJsonLd)
 */

import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPublicEventBySlugCached } from "@/lib/modules/events/cached";
import { getMetadataAlternates, SITE_URL } from "@/lib/seo";
import {
  generateEventJsonLd,
  generateBreadcrumbJsonLd,
  serializeJsonLd,
} from "@/lib/seo/jsonld";
import {
  buildEventsListUrl,
  buildEventDetailUrl,
} from "@/lib/seo/url-builders";
import { validateOptionalExternalUrl } from "@/lib/validators/external-url";
import { markdownToHtml } from "@/lib/markdown/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "events" });

  const event = await getPublicEventBySlugCached(slug);

  if (!event) {
    return { title: t("notFound") };
  }

  const title = `${event.title_zh} - ${t("title")}`;
  const description = event.excerpt_zh || `${event.title_zh} 活動詳情`;
  const alternates = getMetadataAlternates(`/events/${slug}`, locale);

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      type: "website",
      ...(event.cover_image_url && {
        images: [{ url: event.cover_image_url }],
      }),
    },
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "events" });

  const event = await getPublicEventBySlugCached(slug);

  if (!event) {
    notFound();
  }

  // Validate external URLs (render-side hardening)
  const validatedOnlineUrl = validateOptionalExternalUrl(event.online_url);
  const validatedRegistrationUrl = validateOptionalExternalUrl(event.registration_url);

  const safeOnlineUrl = validatedOnlineUrl.valid
    ? validatedOnlineUrl.data
    : null;
  const safeRegistrationUrl = validatedRegistrationUrl.valid
    ? validatedRegistrationUrl.data
    : null;

  // Pre-compute date formatting
  const dateLocale = zhTW;
  const startDate = new Date(event.start_at);
  const endDate = event.end_at ? new Date(event.end_at) : null;

  const formattedStartDate = format(startDate, "PPP", { locale: dateLocale });
  const formattedStartTime = format(startDate, "HH:mm", { locale: dateLocale });
  const formattedEndDate = endDate
    ? format(endDate, "PPP", { locale: dateLocale })
    : null;
  const formattedEndTime = endDate
    ? format(endDate, "HH:mm", { locale: dateLocale })
    : null;

  // Determine if it's same day event
  const isSameDay = endDate
    ? format(startDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd")
    : true;

  const isOnline = !!safeOnlineUrl;
  const hasPhysicalLocation = !!event.location_name || !!event.location_address;

  // Render markdown content
  const renderedContent = event.content_md_zh
    ? await markdownToHtml(event.content_md_zh)
    : null;

  // Generate Event JSON-LD
  const eventUrl = `${SITE_URL}${buildEventDetailUrl(locale, slug)}`;
  const eventJsonLd = generateEventJsonLd({
    name: event.title_zh,
    description: event.excerpt_zh || undefined,
    startDate: event.start_at,
    endDate: event.end_at || undefined,
    timezone: event.timezone,
    url: eventUrl,
    image: event.cover_image_url || undefined,
    location: hasPhysicalLocation
      ? {
          name: event.location_name || undefined,
          address: event.location_address || undefined,
        }
      : undefined,
    isOnline,
    onlineUrl: safeOnlineUrl || undefined,
    registrationUrl: safeRegistrationUrl || undefined,
  });

  // Generate Breadcrumb JSON-LD
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "首頁", url: `${SITE_URL}/${locale}` },
    { name: t("title"), url: `${SITE_URL}${buildEventsListUrl(locale)}` },
    { name: event.title_zh, url: eventUrl },
  ]);

  return (
    <div className="min-h-screen">
      <Header locale={locale} />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(eventJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      <main className="pt-24 pb-16">
        <article className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm text-secondary">
            <a
              href={buildEventsListUrl(locale)}
              className="hover:text-primary transition-colors">
              {t("title")}
            </a>
            <span className="mx-2">/</span>
            <span className="text-foreground">{event.title_zh}</span>
          </nav>

          {/* Event Header */}
          <header className="mb-8">
            {/* Event Type Badge */}
            {event.event_type && (
              <span className="inline-block px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full mb-4">
                {event.event_type.name_zh}
              </span>
            )}

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              {event.title_zh}
            </h1>

            {/* Event Meta */}
            <div className="flex flex-wrap gap-6 text-secondary">
              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 mt-0.5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-foreground">
                    {formattedStartDate}
                  </p>
                  {isSameDay ? (
                    <p className="text-sm">
                      {formattedStartTime}
                      {formattedEndTime && ` - ${formattedEndTime}`}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm">{formattedStartTime} 開始</p>
                      {formattedEndDate && (
                        <p className="text-sm mt-1">
                          至 {formattedEndDate} {formattedEndTime}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Location */}
              {(hasPhysicalLocation || isOnline) && (
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 mt-0.5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div>
                    {hasPhysicalLocation && (
                      <>
                        <p className="font-medium text-foreground">
                          {event.location_name || "活動地點"}
                        </p>
                        {event.location_address && (
                          <p className="text-sm">{event.location_address}</p>
                        )}
                      </>
                    )}
                    {isOnline && (
                      <p className="text-sm flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded text-xs">
                          線上
                        </span>
                        {hasPhysicalLocation && <span>同步線上舉行</span>}
                        {!hasPhysicalLocation && <span>線上活動</span>}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Cover Image */}
          {event.cover_image_url && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
              <img
                src={event.cover_image_url}
                alt={event.cover_image_alt_zh || event.title_zh}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* CTA Buttons */}
          {safeRegistrationUrl && (
            <div className="mb-8 p-6 bg-surface-raised rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">立即報名</h3>
                  <p className="text-sm text-secondary">名額有限，把握機會！</p>
                </div>
                <a
                  href={safeRegistrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  前往報名
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          )}

          {/* Online Link (if no registration URL) */}
          {safeOnlineUrl && !safeRegistrationUrl && (
            <div className="mb-8 p-6 bg-surface-raised rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">線上參與</h3>
                  <p className="text-sm text-secondary">點擊下方連結加入</p>
                </div>
                <a
                  href={safeOnlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  加入活動
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          )}

          {/* Event Content */}
          {renderedContent && (
            <div
              className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-secondary prose-a:text-primary prose-strong:text-foreground"
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
          )}

          {/* Excerpt (if no markdown content) */}
          {!renderedContent && event.excerpt_zh && (
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <p className="text-secondary">{event.excerpt_zh}</p>
            </div>
          )}

          {/* Back to List */}
          <div className="mt-12 pt-8 border-t border-border">
            <a
              href={buildEventsListUrl(locale)}
              className="inline-flex items-center text-primary hover:text-primary-hover transition-colors">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              返回活動列表
            </a>
          </div>
        </article>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
