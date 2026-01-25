import { generateArticleJsonLd, serializeJsonLd, ArticleAuthor } from '@/lib/seo';

interface ArticleJsonLdProps {
  title: string;
  description?: string;
  author: ArticleAuthor;
  datePublished: string;
  dateModified?: string;
  image?: string;
  url: string;
  locale: string;
  publisherName?: string;
  publisherUrl?: string;
}

/**
 * Article JSON-LD component
 * Embeds BlogPosting structured data for SEO
 */
export default function ArticleJsonLd({
  title,
  description,
  author,
  datePublished,
  dateModified,
  image,
  url,
  locale,
  publisherName,
  publisherUrl,
}: ArticleJsonLdProps) {
  const jsonLd = generateArticleJsonLd({
    title,
    description,
    author,
    datePublished,
    dateModified,
    image,
    url,
    locale,
    publisherName,
    publisherUrl,
  });
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
    />
  );
}
