import { PostSummary } from '@/lib/types/blog';
import { getTranslations } from 'next-intl/server';
import { format } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';

interface RelatedPostsProps {
  posts: PostSummary[];
  locale: string;
}

/**
 * Related Posts component
 * Displays 2-4 related articles with clear anchor text (titles)
 */
export default async function RelatedPosts({ posts, locale }: RelatedPostsProps) {
  const t = await getTranslations({ locale, namespace: 'blog' });
  
  if (posts.length === 0) {
    return null;
  }
  
  const dateLocale = locale === 'zh' ? zhTW : enUS;
  
  return (
    <section className="mt-16 pt-8 border-t border-border-light">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        {t('relatedPosts')}
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        {posts.slice(0, 4).map((post) => {
          const title = locale === 'zh' && post.title_zh ? post.title_zh : post.title_en;
          const excerpt = locale === 'zh' && post.excerpt_zh ? post.excerpt_zh : post.excerpt_en;
          const categorySlug = post.category?.slug || 'uncategorized';
          const categoryName = post.category
            ? (locale === 'zh' ? post.category.name_zh : post.category.name_en)
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
              {post.published_at && (
                <time
                  dateTime={post.published_at}
                  className="text-xs text-secondary/80"
                >
                  {format(new Date(post.published_at), 'PPP', { locale: dateLocale })}
                </time>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
