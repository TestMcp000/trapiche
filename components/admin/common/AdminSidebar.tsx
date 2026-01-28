"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import AdminSignOutButton from "@/components/admin/common/AdminSignOutButton";

interface AdminSidebarProps {
  /** Route locale from URL path — used for hrefs and UI */
  locale: string;
  userEmail: string;
}

interface NavItem {
  /** Translation key in admin.sidebar namespace */
  labelKey: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  groupKey: string;
  /** Translation key in admin.sidebar namespace */
  labelKey: string;
  icon: React.ReactNode;
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

const STORAGE_KEY = "admin-sidebar-collapsed";

/**
 * Inner component that uses i18n hooks.
 * Must be rendered under a NextIntlClientProvider.
 */
function AdminSidebarContent({
  locale,
  userEmail,
}: {
  locale: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const routeLocale = locale;
  const tSidebar = useTranslations("admin.sidebar");
  const tCommon = useTranslations("admin.common");
  const tButtons = useTranslations("admin.buttons");

  // Collapsed state for groups (persisted)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as Record<string, boolean>;
      }
    } catch {
      // Ignore localStorage errors
    }

    return {};
  });

  // Save collapsed state to localStorage
  const toggleGroup = (groupKey: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [groupKey]: !prev[groupKey] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  };

  const isActive = (href: string): boolean => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Check if any child in a group is active
  const isGroupActive = (children: NavItem[]): boolean => {
    return children.some((child) => isActive(child.href));
  };

  // Icons
  const icons = {
    dashboard: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
    content: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
        />
      </svg>
    ),
    landing: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
    blog: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
        />
      </svg>
    ),
    portfolio: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
    gallery: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    settings: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    theme: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>
    ),
    features: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
        />
      </svg>
    ),
    users: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    safety: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    ai: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
    embeddings: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
    ),
    preprocessing: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
    system: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
        />
      </svg>
    ),
    controlCenter: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
        />
      </svg>
    ),
    reports: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    history: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    importExport: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
        />
      </svg>
    ),
    chevron: (
      <svg
        className="w-4 h-4 transition-transform duration-200"
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
    ),
  };

  const navItems: NavEntry[] = [
    // Dashboard (standalone)
    {
      labelKey: "dashboard",
      href: `/${routeLocale}/admin`,
      icon: icons.dashboard,
    },
    // Content Management Group
    {
      groupKey: "contentGroup",
      labelKey: "contentGroup",
      icon: icons.content,
      children: [
        {
          labelKey: "landing",
          href: `/${routeLocale}/admin/landing`,
          icon: icons.landing,
        },
        {
          labelKey: "blogManagement",
          href: `/${routeLocale}/admin/posts`,
          icon: icons.blog,
        },
        {
          labelKey: "eventsManagement",
          href: `/${routeLocale}/admin/events`,
          icon: icons.landing,
        },
        {
          labelKey: "faqsManagement",
          href: `/${routeLocale}/admin/faqs`,
          icon: icons.content,
        },
        {
          labelKey: "portfolio",
          href: `/${routeLocale}/admin/portfolio`,
          icon: icons.portfolio,
        },
        {
          labelKey: "galleryManagement",
          href: `/${routeLocale}/admin/gallery`,
          icon: icons.gallery,
        },
      ],
    },
    // Site Settings Group
    {
      groupKey: "siteSettings",
      labelKey: "siteSettings",
      icon: icons.settings,
      children: [
        {
          labelKey: "settings",
          href: `/${routeLocale}/admin/settings`,
          icon: icons.settings,
        },
        {
          labelKey: "navigation",
          href: `/${routeLocale}/admin/settings/navigation`,
          icon: icons.content,
        },
        {
          labelKey: "theme",
          href: `/${routeLocale}/admin/theme`,
          icon: icons.theme,
        },
        {
          labelKey: "features",
          href: `/${routeLocale}/admin/features`,
          icon: icons.features,
        },
      ],
    },
    // Users & Security Group
    {
      groupKey: "usersSecurity",
      labelKey: "usersSecurity",
      icon: icons.users,
      children: [
        {
          labelKey: "usersManagement",
          href: `/${routeLocale}/admin/users`,
          icon: icons.users,
        },
        {
          labelKey: "safety",
          href: `/${routeLocale}/admin/comments/safety`,
          icon: icons.safety,
        },
      ],
    },
    // AI Tools Group
    {
      groupKey: "aiTools",
      labelKey: "aiTools",
      icon: icons.ai,
      children: [
        {
          labelKey: "aiAnalysis",
          href: `/${routeLocale}/admin/ai-analysis`,
          icon: icons.ai,
        },
        {
          labelKey: "embeddings",
          href: `/${routeLocale}/admin/embeddings`,
          icon: icons.embeddings,
        },
        {
          labelKey: "preprocessing",
          href: `/${routeLocale}/admin/preprocessing`,
          icon: icons.preprocessing,
        },
      ],
    },
    // System Group
    {
      groupKey: "systemGroup",
      labelKey: "systemGroup",
      icon: icons.system,
      children: [
        {
          labelKey: "controlCenter",
          href: `/${routeLocale}/admin/control-center`,
          icon: icons.controlCenter,
        },
        {
          labelKey: "reports",
          href: `/${routeLocale}/admin/reports`,
          icon: icons.reports,
        },
        {
          labelKey: "history",
          href: `/${routeLocale}/admin/history`,
          icon: icons.history,
        },
        {
          labelKey: "importExport",
          href: `/${routeLocale}/admin/import-export`,
          icon: icons.importExport,
        },
        {
          labelKey: "content",
          href: `/${routeLocale}/admin/content`,
          icon: icons.content,
        },
      ],
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <Link
          href={`/${routeLocale}/admin`}
          prefetch={false}
          className="text-xl font-bold text-white">
          {tCommon("siteAdmin")}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            // Handle collapsible group
            if ("groupKey" in item) {
              const group = item as NavGroup;
              const isOpen = !collapsed[group.groupKey];
              const groupActive = isGroupActive(group.children);
              // Auto-expand if a child is active
              const shouldShow = isOpen || groupActive;

              return (
                <li key={group.groupKey}>
                  <button
                    onClick={() => toggleGroup(group.groupKey)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      groupActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}>
                    <span className="flex items-center gap-3">
                      {group.icon}
                      {tSidebar(group.labelKey)}
                    </span>
                    <span
                      className={`transform transition-transform duration-200 ${
                        shouldShow ? "rotate-180" : ""
                      }`}>
                      {icons.chevron}
                    </span>
                  </button>
                  {/* Collapsible children */}
                  <ul
                    className={`overflow-hidden transition-all duration-200 ${
                      shouldShow ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}>
                    {group.children.map((child) => {
                      const active = isActive(child.href);
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            prefetch={false}
                            className={`flex items-center gap-3 pl-12 pr-4 py-2 rounded-lg transition-colors ${
                              active
                                ? "bg-blue-600 text-white"
                                : "text-gray-400 hover:bg-gray-800 hover:text-white"
                            }`}>
                            {tSidebar(child.labelKey)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            }

            // Regular nav item (Dashboard)
            const navItem = item as NavItem;
            const active = isActive(navItem.href);
            // Special case: dashboard should only be active on exact match
            const dashboardActive =
              navItem.labelKey === "dashboard"
                ? pathname === navItem.href
                : active;

            return (
              <li key={navItem.href}>
                <Link
                  href={navItem.href}
                  prefetch={false}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    dashboardActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}>
                  {navItem.icon}
                  {tSidebar(navItem.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-800">
        <div className="mb-3">
          <p className="text-xs text-gray-500">{tCommon("loggedInAs")}</p>
          <p className="text-sm text-gray-300 truncate">{userEmail}</p>
        </div>
        <AdminSignOutButton
          locale={routeLocale}
          messages={{ buttons: tButtons("signOut") }}
        />

        {/* Back to Site */}
        <Link
          href={`/${routeLocale}`}
          prefetch={false}
          className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          {tButtons("backToSite")}
        </Link>
      </div>
    </aside>
  );
}

/**
 * Admin sidebar with module-level entries.
 * Sub-pages are handled by module-specific tabs in layouts.
 *
 * Key concept:
 * - locale: determines hrefs (URL path) and UI language
 */
export default function AdminSidebar({ locale, userEmail }: AdminSidebarProps) {
  return <AdminSidebarContent locale={locale} userEmail={userEmail} />;
}
