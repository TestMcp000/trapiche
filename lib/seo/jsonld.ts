/**
 * SEO Utilities - JSON-LD Structured Data
 * 
 * Generates JSON-LD structured data for articles/blog posts.
 * Follows Schema.org BlogPosting specification.
 */

import { SITE_URL } from './hreflang';

export interface ArticleAuthor {
  name: string;
  url?: string;
}

export interface ArticleJsonLdInput {
  title: string;
  description?: string;
  author: ArticleAuthor;
  datePublished: string;
  dateModified?: string;
  image?: string;
  url: string;
  locale: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generate BlogPosting JSON-LD for an article
 */
export function generateArticleJsonLd(input: ArticleJsonLdInput): object {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    author: {
      '@type': 'Person',
      name: input.author.name,
      ...(input.author.url && { url: input.author.url }),
    },
    datePublished: input.datePublished,
    url: input.url,
    inLanguage: input.locale === 'zh' ? 'zh-Hant' : 'en',
    publisher: {
      '@type': 'Organization',
      name: 'Quantum Nexus LNK',
      url: SITE_URL,
    },
  };

  if (input.dateModified) {
    jsonLd.dateModified = input.dateModified;
  }

  if (input.description) {
    jsonLd.description = input.description;
  }

  if (input.image) {
    jsonLd.image = {
      '@type': 'ImageObject',
      url: input.image,
    };
  }

  return jsonLd;
}

/**
 * Generate BreadcrumbList JSON-LD
 */
export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate WebSite JSON-LD (for homepage)
 */
export function generateWebSiteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Quantum Nexus LNK',
    url: SITE_URL,
    inLanguage: ['en', 'zh-Hant'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/en/blog?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Serialize JSON-LD to a string for embedding in HTML
 */
export function serializeJsonLd(jsonLd: object): string {
  return JSON.stringify(jsonLd, null, 0);
}

export interface OrganizationJsonLdInput {
  name: string;
  url: string;
  logo?: string;
  email?: string;
  sameAs?: string[];
  description?: string;
}

/**
 * Generate Organization JSON-LD
 */
export function generateOrganizationJsonLd(input: OrganizationJsonLdInput): object {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: input.url,
  };

  if (input.logo) {
    jsonLd.logo = {
      '@type': 'ImageObject',
      url: input.logo,
    };
  }

  if (input.email) {
    jsonLd.contactPoint = {
      '@type': 'ContactPoint',
      email: input.email,
      contactType: 'customer service',
    };
  }

  if (input.sameAs && input.sameAs.length > 0) {
    jsonLd.sameAs = input.sameAs.filter(Boolean);
  }

  if (input.description) {
    jsonLd.description = input.description;
  }

  return jsonLd;
}

export interface ServiceJsonLdInput {
  name: string;
  description?: string;
  url?: string;
  provider: {
    name: string;
    url: string;
  };
}

/**
 * Generate Service JSON-LD array
 */
export function generateServicesJsonLd(
  services: ServiceJsonLdInput[],
  locale: string
): object[] {
  return services.map((service) => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description || '',
    ...(service.url && { url: service.url }),
    provider: {
      '@type': 'Organization',
      name: service.provider.name,
      url: service.provider.url,
    },
    areaServed: {
      '@type': 'Place',
      name: locale === 'zh' ? '全球' : 'Worldwide',
    },
  }));
}

export interface HomePageJsonLdInput {
  siteName: string;
  siteUrl: string;
  logo?: string;
  email?: string;
  githubUrl?: string;
  description?: string;
  locale: string;
  services?: Array<{
    name: string;
    description?: string;
  }>;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  breadcrumbs?: BreadcrumbItem[];
}

/**
 * Generate FAQPage JSON-LD
 */
export function generateFAQPageJsonLd(
  faqs: Array<{ question: string; answer: string }>
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate combined JSON-LD graph for homepage
 * Includes: Organization, WebSite, Services, FAQPage, and BreadcrumbList
 */
export function generateHomePageJsonLd(input: HomePageJsonLdInput): object {
  const graph: object[] = [];

  // Organization
  graph.push({
    '@type': 'Organization',
    '@id': `${input.siteUrl}/#organization`,
    name: input.siteName,
    url: input.siteUrl,
    ...(input.logo && {
      logo: {
        '@type': 'ImageObject',
        url: input.logo,
      },
    }),
    ...(input.email && {
      contactPoint: {
        '@type': 'ContactPoint',
        email: input.email,
        contactType: 'customer service',
      },
    }),
    ...(input.githubUrl && {
      sameAs: [input.githubUrl],
    }),
    ...(input.description && { description: input.description }),
  });

  // WebSite
  graph.push({
    '@type': 'WebSite',
    '@id': `${input.siteUrl}/#website`,
    name: input.siteName,
    url: input.siteUrl,
    inLanguage: input.locale === 'zh' ? 'zh-Hant' : 'en',
    publisher: {
      '@id': `${input.siteUrl}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${input.siteUrl}/${input.locale}/blog?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  });

  // Services (if provided)
  if (input.services && input.services.length > 0) {
    input.services.forEach((service) => {
      graph.push({
        '@type': 'Service',
        name: service.name,
        description: service.description || '',
        provider: {
          '@id': `${input.siteUrl}/#organization`,
        },
        areaServed: {
          '@type': 'Place',
          name: input.locale === 'zh' ? '全球' : 'Worldwide',
        },
      });
    });
  }

  // FAQPage (if provided)
  if (input.faqs && input.faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${input.siteUrl}/#faq`,
      mainEntity: input.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  // BreadcrumbList (if provided)
  if (input.breadcrumbs && input.breadcrumbs.length > 0) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${input.siteUrl}/#breadcrumb`,
      itemListElement: input.breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export interface ProductJsonLdInput {
  name: string;
  description?: string;
  image?: string;
  url: string;
  sku?: string;
  category?: string;
  priceCurrency: string;
  minPrice: number;
  maxPrice: number;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
  locale: string;
}

/**
 * Generate Product JSON-LD for e-commerce products
 * Follows Schema.org Product specification
 */
export function generateProductJsonLd(input: ProductJsonLdInput): object {
  const priceSpec =
    input.minPrice === input.maxPrice
      ? {
          '@type': 'Offer',
          priceCurrency: input.priceCurrency,
          price: input.minPrice,
          availability: `https://schema.org/${input.availability}`,
        }
      : {
          '@type': 'AggregateOffer',
          priceCurrency: input.priceCurrency,
          lowPrice: input.minPrice,
          highPrice: input.maxPrice,
          availability: `https://schema.org/${input.availability}`,
        };

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    url: input.url,
    offers: priceSpec,
    inLanguage: input.locale === 'zh' ? 'zh-Hant' : 'en',
  };

  if (input.description) {
    jsonLd.description = input.description;
  }

  if (input.image) {
    jsonLd.image = input.image;
  }

  if (input.sku) {
    jsonLd.sku = input.sku;
  }

  if (input.category) {
    jsonLd.category = input.category;
  }

  return jsonLd;
}

