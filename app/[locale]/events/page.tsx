/**
 * Events List Page
 *
 * Displays all public events at /events
 *
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-C2, FR-C4)
 * @see lib/seo/url-builders.ts (buildEventsListUrl)
 */

import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import Image from "next/image";
import {
  getPublicEventsCached,
  getEventTypesWithCountsCached,
  getEventTagsWithCountsCached,
} from "@/lib/modules/events/cached";
import { getMetadataAlternates } from "@/lib/seo";
import {
  buildEventsListUrl,
  buildEventDetailUrl,
} from "@/lib/seo/url-builders";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    type?: string;
    tag?: string;
    q?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { type: typeSlug, tag: tagSlug } = await searchParams;
  const t = await getTranslations({ locale, namespace: "events" });

  let title = t("title");
  let description = t("description");

  // If filtering by type, adjust the title
  if (typeSlug) {
    const eventTypes = await getEventTypesWithCountsCached();
    const eventType = eventTypes.find((et) => et.slug === typeSlug);
    if (eventType) {
      title = `${eventType.name_zh} - ${t("title")}`;
      description = `瀏覽所有「${eventType.name_zh}」類型的活動`;
    }
  }

  // If filtering by tag, adjust the title
  if (tagSlug) {
    const eventTags = await getEventTagsWithCountsCached();
    const eventTag = eventTags.find((et) => et.slug === tagSlug);
    if (eventTag) {
      title = `${eventTag.name_zh} - ${t("title")}`;
      description = `瀏覽所有「${eventTag.name_zh}」標籤的活動`;
    }
  }

  const alternates = getMetadataAlternates("/events", locale);

  return {
    title,
    description,
    alternates,
  };
}

function EventCard({
  event,
  locale,
  dateLocale,
}: {
  event: {
    id: string;
    slug: string;
    title_zh: string;
    excerpt_zh: string | null;
    cover_image_url: string | null;
    cover_image_alt_zh: string | null;
    start_at: string;
    end_at: string | null;
    location_name: string | null;
    online_url: string | null;
    event_type?: { name_zh: string; slug: string } | null;
    event_tags?: { name_zh: string; slug: string }[];
  };
  locale: string;
  dateLocale: typeof zhTW;
}) {
  const eventUrl = buildEventDetailUrl(locale, event.slug);
  const startDate = new Date(event.start_at);
  const formattedDate = format(startDate, "PPP", { locale: dateLocale });
  const formattedTime = format(startDate, "HH:mm", { locale: dateLocale });

  const isOnline = !!event.online_url;
  const locationText =
    event.location_name || (isOnline ? "線上活動" : "地點待定");

  return (
    <article className="group bg-surface-raised rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Cover Image */}
      {event.cover_image_url && (
        <a
          href={eventUrl}
          className="block aspect-video relative overflow-hidden">
          <Image
            src={event.cover_image_url}
            alt={event.cover_image_alt_zh || event.title_zh}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </a>
      )}

      <div className="p-6">
        {/* Event Type Badge & Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {event.event_type && (
            <a
              href={buildEventsListUrl(locale, { type: event.event_type.slug })}
              className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors">
              {event.event_type.name_zh}
            </a>
          )}
          {event.event_tags?.map((tag) => (
            <a
              key={tag.slug}
              href={buildEventsListUrl(locale, { tag: tag.slug })}
              className="inline-block px-3 py-1 text-xs font-medium bg-secondary/10 text-secondary rounded-full hover:bg-secondary/20 transition-colors">
              {tag.name_zh}
            </a>
          ))}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
          <a href={eventUrl}>{event.title_zh}</a>
        </h2>

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm text-secondary mb-2">
          <svg
            className="w-4 h-4"
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
          <span>{formattedDate}</span>
          <span>•</span>
          <span>{formattedTime}</span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-secondary mb-4">
          <svg
            className="w-4 h-4"
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
          <span>{locationText}</span>
          {isOnline && (
            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
              線上
            </span>
          )}
        </div>

        {/* Excerpt */}
        {event.excerpt_zh && (
          <p className="text-secondary text-sm line-clamp-2 mb-4">
            {event.excerpt_zh}
          </p>
        )}

        {/* CTA */}
        <a
          href={eventUrl}
          className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-hover transition-colors">
          了解更多
          <svg
            className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </a>
      </div>
    </article>
  );
}

export default async function EventsListPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { type: typeSlug, tag: tagSlug, q, sort } = await searchParams;
  const t = await getTranslations({ locale, namespace: "events" });

  // Get events, event types, and event tags
  const [events, eventTypes, eventTags] = await Promise.all([
    getPublicEventsCached({
      typeSlug,
      tagSlug,
      search: q,
      sort: sort as
        | "newest"
        | "oldest"
        | "upcoming"
        | "start-asc"
        | "start-desc",
      includeExpired: sort === "oldest" || sort === "newest",
    }),
    getEventTypesWithCountsCached(),
    getEventTagsWithCountsCached(),
  ]);

  // Determine current type and tag for filter highlight
  const currentType = typeSlug
    ? eventTypes.find((et) => et.slug === typeSlug)
    : null;
  const currentTag = tagSlug
    ? eventTags.find((et) => et.slug === tagSlug)
    : null;

  // Pre-compute locale-specific date formatting
  const dateLocale = zhTW;

  // Build page title based on filters
  let pageTitle = t("title");
  let pageDescription = t("description");
  if (currentType) {
    pageTitle = currentType.name_zh;
    pageDescription = `瀏覽所有「${currentType.name_zh}」類型的活動`;
  } else if (currentTag) {
    pageTitle = `${currentTag.name_zh} 相關活動`;
    pageDescription = `瀏覽所有「${currentTag.name_zh}」標籤的活動`;
  }

  return (
    <div className="min-h-screen">
      <Header locale={locale} />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {pageTitle}
            </h1>
            <p className="text-lg text-secondary max-w-2xl mx-auto">
              {pageDescription}
            </p>
          </div>

          {/* Type Filters */}
          {eventTypes.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <a
                href={buildEventsListUrl(locale, { tag: tagSlug, q, sort })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !typeSlug
                    ? "bg-primary text-white"
                    : "bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground"
                }`}>
                全部類型
              </a>
              {eventTypes.map((et) => (
                <a
                  key={et.id}
                  href={buildEventsListUrl(locale, {
                    type: et.slug,
                    tag: tagSlug,
                    q,
                    sort,
                  })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    typeSlug === et.slug
                      ? "bg-primary text-white"
                      : "bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground"
                  }`}>
                  {et.name_zh}
                  <span className="ml-1 opacity-75">({et.event_count})</span>
                </a>
              ))}
            </div>
          )}

          {/* Tag Filters */}
          {eventTags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <span className="px-2 py-2 text-sm text-secondary">標籤：</span>
              <a
                href={buildEventsListUrl(locale, { type: typeSlug, q, sort })}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  !tagSlug
                    ? "bg-accent text-white"
                    : "bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground"
                }`}>
                全部
              </a>
              {eventTags.map((et) => (
                <a
                  key={et.id}
                  href={buildEventsListUrl(locale, {
                    type: typeSlug,
                    tag: et.slug,
                    q,
                    sort,
                  })}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    tagSlug === et.slug
                      ? "bg-accent text-white"
                      : "bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground"
                  }`}>
                  {et.name_zh}
                  <span className="ml-1 opacity-75">({et.event_count})</span>
                </a>
              ))}
            </div>
          )}

          {/* Sort Options */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-lg bg-surface-raised p-1">
              <a
                href={buildEventsListUrl(locale, {
                  type: typeSlug,
                  tag: tagSlug,
                  q,
                  sort: "upcoming",
                })}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !sort || sort === "upcoming"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-secondary hover:text-foreground"
                }`}>
                即將舉行
              </a>
              <a
                href={buildEventsListUrl(locale, {
                  type: typeSlug,
                  tag: tagSlug,
                  q,
                  sort: "newest",
                })}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  sort === "newest"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-secondary hover:text-foreground"
                }`}>
                最新發布
              </a>
              <a
                href={buildEventsListUrl(locale, {
                  type: typeSlug,
                  tag: tagSlug,
                  q,
                  sort: "oldest",
                })}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  sort === "oldest"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-secondary hover:text-foreground"
                }`}>
                過往活動
              </a>
            </div>
          </div>

          {/* Events Grid */}
          <Suspense
            fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-surface-raised rounded-2xl overflow-hidden animate-pulse">
                    <div className="aspect-video bg-surface-raised-hover" />
                    <div className="p-6 space-y-4">
                      <div className="h-4 bg-surface-raised-hover rounded w-1/4" />
                      <div className="h-6 bg-surface-raised-hover rounded w-3/4" />
                      <div className="h-4 bg-surface-raised-hover rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            }>
            {events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    locale={locale}
                    dateLocale={dateLocale}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-raised mb-4">
                  <svg
                    className="w-8 h-8 text-secondary"
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
                </div>
                <p className="text-secondary text-lg">{t("noEvents")}</p>
              </div>
            )}
          </Suspense>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
