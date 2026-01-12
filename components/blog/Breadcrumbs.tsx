import { generateBreadcrumbJsonLd, serializeJsonLd, SITE_URL } from '@/lib/seo';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Localized "Home" label from server */
  homeLabel: string;
  /** Current locale */
  locale: string;
  includeJsonLd?: boolean;
}

/**
 * Breadcrumbs - Server Component with BreadcrumbList JSON-LD schema
 * 
 * Converted from client to server component for P1 performance optimization.
 * JSON-LD is now rendered in server HTML (View Source visible).
 * Displays a navigation trail and embeds structured data for SEO.
 */
export default function Breadcrumbs({ 
  items, 
  homeLabel,
  locale,
  includeJsonLd = true 
}: BreadcrumbsProps) {
  // Prepend Home
  const fullItems: BreadcrumbItem[] = [
    { label: homeLabel, href: `/${locale}` },
    ...items,
  ];
  
  // Generate JSON-LD data
  const jsonLdItems = fullItems.map((item) => ({
    name: item.label,
    url: item.href ? (item.href.startsWith('http') ? item.href : `${SITE_URL}${item.href}`) : '',
  }));
  
  const jsonLd = generateBreadcrumbJsonLd(jsonLdItems);
  
  return (
    <>
      {includeJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-secondary">
          {fullItems.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <svg
                  className="w-4 h-4 mx-2 text-secondary/40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
              {item.href && index < fullItems.length - 1 ? (
                <a
                  href={item.href}
                  className="hover:text-primary transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <span className="text-foreground/80 font-medium">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

