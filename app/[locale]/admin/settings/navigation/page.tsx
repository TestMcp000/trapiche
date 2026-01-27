/**
 * Admin Navigation Settings Page
 *
 * Server component that loads initial data for the hamburger nav editor.
 * Provides a visual editor for the hamburger menu instead of raw JSON editing.
 *
 * @module app/[locale]/admin/settings/navigation/page
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-A1–A4)
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/infrastructure/supabase/server";
import { isSiteAdmin } from "@/lib/auth";
import { getSiteContent } from "@/lib/modules/content/site-content-io";
import { getContentHistory } from "@/lib/modules/content/history-io";
import { parseHamburgerNav } from "@/lib/validators/hamburger-nav";
import { getCategories } from "@/lib/modules/blog/io";
import { getVisibleGalleryCategories } from "@/lib/modules/gallery/io";
import { getVisibleEventTypesCached } from "@/lib/modules/events/cached";
import HamburgerNavEditorClient from "@/components/admin/settings/HamburgerNavEditorClient";
import type { HamburgerNavV2 } from "@/lib/types/hamburger-nav";
import type { Category } from "@/lib/types/blog";
import type { GalleryCategory } from "@/lib/types/gallery";
import type { EventType } from "@/lib/types/events";

export const metadata: Metadata = {
  title: "導覽選單設定 | 網站後台",
  robots: { index: false, follow: false },
};

/**
 * Default hamburger nav structure (matches cached.ts DEFAULT_HAMBURGER_NAV)
 */
const DEFAULT_NAV: HamburgerNavV2 = {
  version: 2,
  groups: [],
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NavigationSettingsPage({ params }: PageProps) {
  const { locale } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/${locale}/admin/settings/navigation`);
  }

  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    redirect(`/${locale}/admin`);
  }

  // Load current hamburger nav content
  const siteContent = await getSiteContent("hamburger_nav");
  let initialNav: HamburgerNavV2 = DEFAULT_NAV;
  let isPublished = false;

  if (siteContent) {
    isPublished = siteContent.is_published;
    const { nav } = parseHamburgerNav(siteContent.content_zh);
    if (nav) {
      initialNav = nav;
    }
  }

  // Load history for restore functionality
  const history = siteContent
    ? await getContentHistory("site_content", siteContent.id)
    : [];

  // Load target options for the picker
  const [blogCategories, galleryCategories, eventTypes] = await Promise.all([
    getCategories(),
    getVisibleGalleryCategories(),
    getVisibleEventTypesCached(),
  ]);

  // Static page options (allowlist from PRD)
  const staticPages = [
    { path: "/about", label: "關於 / 心理師介紹" },
    { path: "/services", label: "服務方式" },
    { path: "/contact", label: "聯絡表單" },
    { path: "/blog", label: "部落格首頁" },
    { path: "/gallery", label: "作品集首頁" },
    { path: "/events", label: "活動列表" },
    { path: "/platforms", label: "講座／活動" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <HamburgerNavEditorClient
        initialNav={initialNav}
        initialHistory={history}
        isPublished={isPublished}
        locale={locale}
        blogCategories={blogCategories as Category[]}
        galleryCategories={galleryCategories as GalleryCategory[]}
        eventTypes={eventTypes as EventType[]}
        staticPages={staticPages}
      />
    </div>
  );
}
