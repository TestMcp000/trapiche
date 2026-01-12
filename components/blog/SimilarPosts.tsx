/**
 * Similar Posts Component (AI-based)
 * @see uiux_refactor.md §6.3.2 item 3
 *
 * Server component rendering AI-based related posts using embeddings.
 * Complements the existing RelatedPosts component which uses category-based matching.
 * Returns null if feature disabled or no similar items found.
 */

import { getTranslations } from 'next-intl/server';
import { format } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';
import { getResolvedSimilarPosts } from '@/lib/modules/embedding/similar-items-public-io';

interface SimilarPostsProps {
  postId: string;
  locale: string;
}

/**
 * AI-based Similar Posts component
 * Displays posts with semantic similarity (embedding-based)
 */
export default async function SimilarPosts({ postId, locale }: SimilarPostsProps) {
  const _t = await getTranslations({ locale, namespace: 'blog' });
  const similarPosts = await getResolvedSimilarPosts(postId, 4);

  if (similarPosts.length === 0) {
    return null;
  }

  const dateLocale = locale === 'zh' ? zhTW : enUS;

  return (
    <section className="mt-16 pt-8 border-t border-border-light">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        {locale === 'zh' ? '相似文章' : 'Similar Articles'}
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        {similarPosts.map((post) => {
          const title = locale === 'zh' && post.titleZh ? post.titleZh : post.titleEn;
          const excerpt = locale === 'zh' && post.excerptZh ? post.excerptZh : post.excerptEn;
          const categorySlug = post.category?.slug || 'uncategorized';
          const categoryName = post.category
            ? locale === 'zh'
              ? post.category.nameZh
              : post.category.nameEn
            : null;

          return (
            <article
              key={post.id}
              className="group bg-surface-raised rounded-theme p-6 shadow-sm hover:shadow-md transition-shadow border border-border-light"
            >
              {categoryName && (
                <span className="inline-block text-xs font-medium text-primary mb-2">
                  {categoryName}
                </span>
              )}

              {/* Title - Clear anchor text */}
              <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                <a href={`/${locale}/blog/${categorySlug}/${post.slug}`}>
                  {title}
                </a>
              </h3>

              {/* Excerpt */}
              {excerpt && (
                <p className="text-sm text-secondary line-clamp-2 mb-3">
                  {excerpt}
                </p>
              )}

              {/* Date */}
              {post.publishedAt && (
                <time
                  dateTime={post.publishedAt}
                  className="text-xs text-secondary/80"
                >
                  {format(new Date(post.publishedAt), 'PPP', { locale: dateLocale })}
                </time>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
