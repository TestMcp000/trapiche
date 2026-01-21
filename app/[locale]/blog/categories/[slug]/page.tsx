/**
 * Blog Category Page (v2 Canonical)
 * 
 * Displays blog posts filtered by category at /blog/categories/[slug]
 */

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getPublicPostsCached, getCategoriesWithCountsCached } from '@/lib/modules/blog/cached';
import { isBlogEnabledCached } from '@/lib/features/cached';
import { getMetadataAlternates } from '@/lib/seo';
import BlogCard from '@/components/blog/BlogCard';
import BlogSearch from '@/components/blog/BlogSearch';
import BlogCategorySidebar from '@/components/blog/BlogCategorySidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, slug: categorySlug } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  
  // Find category
  const { categories } = await getCategoriesWithCountsCached();
  const category = categories.find(c => c.slug === categorySlug);
  
  if (!category) {
    return { title: t('notFound') };
  }
  
  const title = `${category.name_zh} - ${t('title')}`;
  const description = `瀏覽「${category.name_zh}」分類的所有文章`;
  
  // Generate hreflang alternates (v2 canonical)
  const alternates = getMetadataAlternates(`/blog/categories/${categorySlug}`, locale);
  
  return {
    title,
    description,
    alternates,
  };
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, slug: categorySlug } = await params;
  
  // Check if blog feature is enabled
  const isEnabled = await isBlogEnabledCached();
  if (!isEnabled) {
    notFound();
  }
  
  const { q, sort } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'blog' });
  
  // Get categories and find current one
  const { categories, uncategorizedCount } = await getCategoriesWithCountsCached();
  const category = categories.find(c => c.slug === categorySlug);
  
  if (!category) {
    notFound();
  }
  
  // Pass locale, search, and sort to filter posts
  const posts = await getPublicPostsCached({ 
    categorySlug, 
    locale, 
    search: q,
    sort: sort as 'newest' | 'oldest' | 'title-asc' | 'title-desc',
  });

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
            <a href={`/${locale}/blog`} className="hover:text-primary transition-colors">
              {t('title')}
            </a>
            <span className="mx-2">/</span>
            <span className="text-foreground">{category.name_zh}</span>
          </nav>
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {category.name_zh}
            </h1>
            <p className="text-lg text-secondary max-w-2xl mx-auto">
              {`此分類共有 ${posts.length} 篇文章`}
            </p>
          </div>
          
          {/* Search */}
          <BlogSearch locale={locale} placeholder="搜尋文章..." />
          
          {/* Main Content with Sidebar */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - Hidden on mobile, visible on large screens */}
            <div className="hidden lg:block">
              <BlogCategorySidebar
                categories={categories}
                uncategorizedCount={uncategorizedCount}
                locale={locale}
                currentCategorySlug={categorySlug}
                searchQuery={q}
              />
            </div>
            
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Mobile Category Filter - Hidden on large screens */}
              {categories.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-6 lg:hidden">
                  <a
                    href={`/${locale}/blog${q ? `?q=${q}` : ''}`}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground"
                  >
                    {t('allCategories')}
                  </a>
                  {categories.map((cat) => (
                    <a
                      key={cat.id}
                      href={`/${locale}/blog/categories/${cat.slug}${q ? `?q=${q}` : ''}`}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        categorySlug === cat.slug
                          ? 'bg-primary text-white'
                          : 'bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground'
                      }`}
                    >
                      {cat.name_zh}
                    </a>
                  ))}
                </div>
              )}
              
              {/* Active filters indicator */}
              {q && (
                <div className="text-center lg:text-left mb-6">
                  <p className="text-sm text-secondary">
                    {`找到 ${posts.length} 篇文章`}
                    <span className="ml-2">
                      {`含「${q}」`}
                    </span>
                  </p>
                </div>
              )}
              
              {/* Posts Grid */}
              {posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {posts.map((post) => {
                    // Pre-compute all locale-specific values for BlogCard (server component)
                    const title = post.title_zh || '（無標題）';
                    const excerpt = post.excerpt_zh || '';
                    const categoryName = post.category 
                      ? post.category.name_zh
                      : null;
                    const formattedDate = post.published_at 
                      ? format(new Date(post.published_at), 'PPP', { locale: dateLocale })
                      : null;
                    const imageAlt = post.cover_image_alt_zh || title;
                    // Use v2 canonical URL for post links
                    const postUrl = `/${locale}/blog/posts/${post.slug}`;

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
                  <p className="text-secondary text-lg">
                    {t('noPosts')}
                  </p>
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
