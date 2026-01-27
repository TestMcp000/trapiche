/**
 * Blog Group Page (Taxonomy v2)
 *
 * Displays blog posts filtered by group at /blog/groups/[slug]
 *
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-B4)
 * @see lib/seo/url-builders.ts (buildBlogGroupUrl)
 */

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getPublicPostsByGroupCached } from '@/lib/modules/blog/cached';
import {
  getBlogGroupBySlugCached,
  getBlogGroupsWithCountsCached,
} from '@/lib/modules/blog/taxonomy-cached';
import { isBlogEnabledCached } from '@/lib/features/cached';
import { getMetadataAlternates } from '@/lib/seo';
import { buildBlogListUrl, buildBlogGroupUrl, buildBlogPostUrl } from '@/lib/seo/url-builders';
import BlogCard from '@/components/blog/BlogCard';
import BlogSearch from '@/components/blog/BlogSearch';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, slug: groupSlug } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });

  const group = await getBlogGroupBySlugCached(groupSlug);

  if (!group) {
    return { title: t('notFound') };
  }

  const title = `${group.name_zh} - ${t('title')}`;
  const description = `瀏覽「${group.name_zh}」分類的所有文章`;

  const alternates = getMetadataAlternates(`/blog/groups/${groupSlug}`, locale);

  return {
    title,
    description,
    alternates,
  };
}

export default async function BlogGroupPage({ params, searchParams }: PageProps) {
  const { locale, slug: groupSlug } = await params;

  // Check if blog feature is enabled
  const isEnabled = await isBlogEnabledCached();
  if (!isEnabled) {
    notFound();
  }

  const { q, sort } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'blog' });

  // Get group data
  const group = await getBlogGroupBySlugCached(groupSlug);

  if (!group) {
    notFound();
  }

  // Get posts for this group
  const posts = await getPublicPostsByGroupCached({
    groupSlug,
    locale,
    search: q,
    sort: sort as 'newest' | 'oldest' | 'title-asc' | 'title-desc',
  });

  // Get all groups for sidebar/filter
  const groupsWithCounts = await getBlogGroupsWithCountsCached();

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
            <span className="text-foreground">{group.name_zh}</span>
          </nav>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {group.name_zh}
            </h1>
            <p className="text-lg text-secondary max-w-2xl mx-auto">
              {`此分類共有 ${posts.length} 篇文章`}
            </p>
          </div>

          {/* Search */}
          <BlogSearch locale={locale} placeholder="搜尋文章..." />

          {/* Main Content with Group Filter */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - Group List */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24">
                <h3 className="font-semibold text-foreground mb-4">文章分類</h3>
                <nav className="space-y-2">
                  <a
                    href={buildBlogListUrl(locale, { q })}
                    className="block px-3 py-2 rounded-lg text-sm transition-colors bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground"
                  >
                    全部文章
                  </a>
                  {groupsWithCounts.map((g) => (
                    <a
                      key={g.id}
                      href={buildBlogGroupUrl(locale, g.slug, { q })}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        groupSlug === g.slug
                          ? 'bg-primary text-white'
                          : 'bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground'
                      }`}
                    >
                      {g.name_zh}
                      <span className="ml-2 text-xs opacity-75">({g.post_count})</span>
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Mobile Group Filter */}
              {groupsWithCounts.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-6 lg:hidden">
                  <a
                    href={buildBlogListUrl(locale, { q })}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground"
                  >
                    全部
                  </a>
                  {groupsWithCounts.map((g) => (
                    <a
                      key={g.id}
                      href={buildBlogGroupUrl(locale, g.slug, { q })}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        groupSlug === g.slug
                          ? 'bg-primary text-white'
                          : 'bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground'
                      }`}
                    >
                      {g.name_zh}
                    </a>
                  ))}
                </div>
              )}

              {/* Active filters indicator */}
              {q && (
                <div className="text-center lg:text-left mb-6">
                  <p className="text-sm text-secondary">
                    {`找到 ${posts.length} 篇文章`}
                    <span className="ml-2">{`含「${q}」`}</span>
                  </p>
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
