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
import { zhTW, enUS } from 'date-fns/locale';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  
  // Generate hreflang alternates
  const alternates = getMetadataAlternates('/blog', locale);
  
  return {
    title: t('title'),
    description: t('description'),
    alternates,
  };
}

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; search?: string; sort?: string }>;
}) {
  const { locale } = await params;
  
  // Check if blog feature is enabled
  const isEnabled = await isBlogEnabledCached();
  if (!isEnabled) {
    notFound();
  }
  
  const { category: categorySlug, search, sort } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'blog' });
  
  // Pass locale, search, and sort to filter posts
  const posts = await getPublicPostsCached({ 
    categorySlug, 
    locale, 
    search,
    sort: sort as 'newest' | 'oldest' | 'title-asc' | 'title-desc',
  });
  const { categories, uncategorizedCount } = await getCategoriesWithCountsCached();

  // Pre-compute locale-specific date formatting
  const dateLocale = locale === 'zh' ? zhTW : enUS;
  const readMoreLabel = locale === 'zh' ? '閱讀更多' : 'Read Article';

  return (
    <div className="min-h-screen">
      <Header locale={locale} />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t('title')}
            </h1>
            <p className="text-lg text-secondary max-w-2xl mx-auto">
              {t('description')}
            </p>
          </div>
          
          {/* Search */}
          <BlogSearch locale={locale} placeholder={locale === 'zh' ? '搜索文章...' : 'Search posts...'} />
          
          {/* Main Content with Sidebar */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - Hidden on mobile, visible on large screens */}
            <div className="hidden lg:block">
              <BlogCategorySidebar
                categories={categories}
                uncategorizedCount={uncategorizedCount}
                locale={locale}
                currentCategorySlug={categorySlug}
                searchQuery={search}
              />
            </div>
            
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Mobile Category Filter - Hidden on large screens */}
              {categories.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-6 lg:hidden">
                  <a
                    href={`/${locale}/blog${search ? `?search=${search}` : ''}`}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      !categorySlug
                        ? 'bg-primary text-white'
                        : 'bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground'
                    }`}
                  >
                    {t('allCategories')}
                  </a>
                  {categories.map((cat) => (
                    <a
                      key={cat.id}
                      href={`/${locale}/blog?category=${cat.slug}${search ? `&search=${search}` : ''}`}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        categorySlug === cat.slug
                          ? 'bg-primary text-white'
                          : 'bg-surface-raised text-secondary hover:bg-surface-raised-hover hover:text-foreground'
                      }`}
                    >
                      {locale === 'zh' ? cat.name_zh : cat.name_en}
                    </a>
                  ))}
                </div>
              )}
              
              {/* Active filters indicator */}
              {(search || categorySlug) && (
                <div className="text-center lg:text-left mb-6">
                  <p className="text-sm text-secondary">
                    {locale === 'zh' ? `找到 ${posts.length} 篇文章` : `Found ${posts.length} posts`}
                    {search && (
                      <span className="ml-2">
                        {locale === 'zh' ? `含「${search}」` : `containing "${search}"`}
                      </span>
                    )}
                  </p>
                </div>
              )}
              
              {/* Posts Grid */}
              {posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {posts.map((post) => {
                    // Pre-compute all locale-specific values for BlogCard (server component)
                    const title = locale === 'zh' && post.title_zh ? post.title_zh : post.title_en;
                    const excerpt = locale === 'zh' && post.excerpt_zh ? post.excerpt_zh : post.excerpt_en;
                    const categoryName = post.category 
                      ? (locale === 'zh' ? post.category.name_zh : post.category.name_en)
                      : null;
                    const formattedDate = post.published_at 
                      ? format(new Date(post.published_at), 'PPP', { locale: dateLocale })
                      : null;
                    const imageAlt = locale === 'zh' 
                      ? (post.cover_image_alt_zh || post.cover_image_alt_en || title)
                      : (post.cover_image_alt_en || post.cover_image_alt_zh || title);
                    const postCategorySlug = post.category?.slug || 'uncategorized';
                    const postUrl = `/${locale}/blog/${postCategorySlug}/${post.slug}`;

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

