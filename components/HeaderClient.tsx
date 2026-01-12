'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LOCALES } from '@/lib/i18n/locales';

interface NavItem {
  key: string;
  href: string;
  label: string;
}

interface HeaderClientProps {
  companyName: string;
  navItems: NavItem[];
  locale: string;
}


export default function HeaderClient({ companyName, navItems, locale }: HeaderClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const localePrefixPattern = new RegExp(`^/(${LOCALES.join('|')})(?=/|$)`);
  const pathnameWithoutLocale = pathname.replace(localePrefixPattern, '') || '/';

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'zh' : 'en';
    const basePath = pathnameWithoutLocale === '/' ? `/${newLocale}` : `/${newLocale}${pathnameWithoutLocale}`;
    const search = typeof window === 'undefined' ? '' : window.location.search;
    const hash = typeof window === 'undefined' ? '' : window.location.hash;
    router.replace(`${basePath}${search}${hash}`);
  };

  // Check if nav item is active based on current pathname (locale-stripped)
  const isActive = (itemKey: string) => {
    return (
      pathnameWithoutLocale === `/${itemKey}` ||
      pathnameWithoutLocale.startsWith(`/${itemKey}/`)
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo - Minimalist Tech Style */}
          <Link
            href={`/${locale}`}
            className="text-lg font-semibold tracking-tight text-foreground hover:opacity-80 transition-opacity"
          >
            {companyName}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const active = isActive(item.key);
              return (
                <a
                  key={item.key}
                  href={item.href}
                  className={`px-4 py-2 text-sm font-medium transition-colors rounded-full hover:bg-foreground/5 ${
                    active
                      ? 'text-foreground font-semibold bg-foreground/5'
                      : 'text-secondary hover:text-foreground'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Language Switcher & Mobile Toggle */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleLanguage}
              className="px-3 py-1 text-xs font-medium text-secondary hover:text-foreground border border-border rounded-full hover:border-foreground transition-all"
              aria-label={locale === 'en' ? 'Switch to Chinese' : '切換至英文'}
            >
              {locale === 'en' ? '中文' : 'EN'}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-foreground hover:bg-foreground/5 rounded-full transition-colors"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <div 
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-96 opacity-100 border-t border-border-light' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="py-4 flex flex-col space-y-2">
            {navItems.map((item) => {
              const active = isActive(item.key);
              return (
                <a
                  key={item.key}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors block ${
                    active
                      ? 'text-foreground font-semibold bg-foreground/5'
                      : 'text-secondary hover:text-foreground hover:bg-foreground/5'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
