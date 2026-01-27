/**
 * Blog Tag Page (Taxonomy v2)
 *
 * Displays blog posts filtered by tag at /blog/tags/[slug]
 *
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-B4)
 * @see lib/seo/url-builders.ts (buildBlogTagUrl)
 */

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getPublicPostsByTagCached } from '@/lib/modules/blog/cached';
import {
  getBlogTagBySlugCached,
  getBlogTagsWithCountsCached,
} from '@/lib/modules/blog/taxonomy-cached';
import { isBlogEnabledCached } from '@/lib/features/cached';
import { getMetadataAlternates } from '@/lib/seo';
import { buildBlogListUrl, buildBlogTagUrl, buildBlogPostUrl } from '@/lib/seo/url-builders';
import BlogCard from '@/components/blog/BlogCard';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, slug: tagSlug } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });

  const tag = await getBlogTagBySlugCached(tagSlug);

  if (!tag) {
    return { title: t('notFound') };
  }

  const title = `#${tag.name_zh} - ${t('title')}`;
  const description = `瀏覽標籤「${tag.name_zh}」的所有文章`;

  const alternates = getMetadataAlternates(`/blog/tags/${tagSlug}`, locale);

  return {
    title,
    description,
    alternates,
  };
}

export default async function BlogTagPage({ params, searchParams }: PageProps) {
  const { locale, slug: tagSlug } = await params;

  // Check if blog feature is enabled
  const isEnabled = await isBlogEnabledCached();
  if (!isEnabled) {
    notFound();
  }

  const { sort } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'blog' });

  // Get tag data
  const tag = await getBlogTagBySlugCached(tagSlug);

  if (!tag) {
    notFound();
  }

  // Get posts for this tag
  const posts = await getPublicPostsByTagCached({
    tagSlug,
    locale,
    sort: sort as 'newest' | 'oldest' | 'title-asc' | 'title-desc',
  });

  // Get all tags with counts for tag cloud
  const tagsWithCounts = await getBlogTagsWithCountsCached();

  // Pre-compute locale-specific date formatting
  const dateLocale = zhTW;
  const readMoreLabel = '閱讀更多';

  return (
    <div className="min-h-screen">
      <Header locale={locale} />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-4 text-sm text-secondary">
            <a
              href={buildBlogListUrl(locale)}
              className="hover:text-primary transition-colors"
            >
              {t('title')}
            </a>
            <span className="mx-2">/</span>
            <span className="text-foreground">#{tag.name_zh}</span>
          </nav>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              #{tag.name_zh}
            </h1>
            <p className="text-lg text-secondary max-w-2xl mx-auto">
              {`此標籤共有 ${posts.length} 篇文章`}
            </p>
          </div>

          {/* Main Content with Tag Cloud */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - Tag Cloud */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24">
                <h3 className="font-semibold text-foreground mb-4">熱門標籤</h3>
                <div className="flex flex-wrap gap-2">
                  {tagsWithCounts
                    .filter((t) => t.post_count > 0)
                    .slice(0, 20)
                    .map((t) => (
                      <a
                        key={t.id}
                        href={buildBlogTagUrl(locale, t.slug)}
                        className={`inline-block px-3 py-1 rounded-full text-sm transition-colors ${
                          tagSlug === t.slug
                            ? 'bg-primary text-white'
                            : 'bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground'
                        }`}
                      >
                        #{t.name_zh}
                        <span className="ml-1 text-xs opacity-75">({t.post_count})</span>
                      </a>
                    ))}
                </div>
                <a
                  href={buildBlogListUrl(locale)}
                  className="inline-block mt-4 text-sm text-primary hover:underline"
                >
                  ← 返回文章列表
                </a>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Mobile Tag Cloud */}
              {tagsWithCounts.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-6 lg:hidden">
                  {tagsWithCounts
                    .filter((t) => t.post_count > 0)
                    .slice(0, 10)
                    .map((t) => (
                      <a
                        key={t.id}
                        href={buildBlogTagUrl(locale, t.slug)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          tagSlug === t.slug
                            ? 'bg-primary text-white'
                            : 'bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground'
                        }`}
                      >
                        #{t.name_zh}
                      </a>
                    ))}
                </div>
              )}

              {/* Posts Grid */}
              {posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {posts.map((post) => {
                    const title = post.title_zh || '（無標題）';
                    const excerpt = post.excerpt_zh || '';
                    const categoryName = post.category ? post.category.name_zh : null;
                    const formattedDate = post.published_at
                      ? format(new Date(post.published_at), 'PPP', { locale: dateLocale })
                      : null;
                    const imageAlt = post.cover_image_alt_zh || title;
                    const postUrl = buildBlogPostUrl(locale, post.slug);

                    return (
                      <BlogCard
                        key={post.id}
                        title={title}
                        excerpt={excerpt}
                        categoryName={categoryName}
                        imageUrl={post.cover_image_url}
                        imageAlt={imageAlt}
                        formattedDate={formattedDate}
                        postUrl={postUrl}
                        locale={locale}
                        readMoreLabel={readMoreLabel}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-secondary text-lg">{t('noPosts')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
