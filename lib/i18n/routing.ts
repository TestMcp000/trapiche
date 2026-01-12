import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { LOCALES, DEFAULT_LOCALE } from './locales';

export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  pathnames: {
    '/': '/',
    '/about': '/about',
    '/services': '/services',
    '/platforms': '/platforms',
    '/portfolio': '/portfolio',
    '/gallery': '/gallery',
    '/contact': '/contact',
    '/blog': '/blog',
    '/login': '/login',
    '/privacy': '/privacy',
    '/admin': '/admin',
    '/admin/posts': '/admin/posts',
    '/admin/posts/new': '/admin/posts/new',
    '/admin/categories': '/admin/categories',
    '/admin/gallery': '/admin/gallery',
    '/admin/gallery/categories': '/admin/gallery/categories',
    '/admin/gallery/featured': '/admin/gallery/featured',
  },
});

export type Pathnames = keyof typeof routing.pathnames;
export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
