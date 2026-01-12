import { notFound, redirect } from 'next/navigation';
import { getTranslations, getMessages } from 'next-intl/server';
import { getPostBySlugWithCategoryCached, getRelatedPostsCached, getAuthorInfo } from '@/lib/modules/blog/cached';
import { getMetadataAlternates, getCanonicalUrl } from '@/lib/seo';
import { calculateReadingTimeMinutes } from '@/lib/utils/reading-time';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MarkdownContent from '@/components/blog/MarkdownContent';
import { markdownToHtml } from '@/lib/markdown/server';
import Breadcrumbs from '@/components/blog/Breadcrumbs';
import RelatedPosts from '@/components/blog/RelatedPosts';
import SimilarPosts from '@/components/blog/SimilarPosts';

import ArticleJsonLd from '@/components/blog/ArticleJsonLd';
import Image from 'next/image';
import ClientCommentSection from '@/components/blog/ClientCommentSection';
import { format } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';

interface PageProps {
  params: Promise<{ 
    locale: string; 
    category: string; 
    slug: string; 
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, slug, category: _category } = await params;
  const post = await getPostBySlugWithCategoryCached(slug);
  
  if (!post) {
    return { title: 'Post Not Found' };
  }
  
  const title = locale === 'zh' && post.title_zh ? post.title_zh : post.title_en;
  const description = locale === 'zh' && post.excerpt_zh ? post.excerpt_zh : post.excerpt_en;
  const categorySlug = post.category?.slug || 'uncategorized';
  
  // Select cover image based on locale (with fallback)
  const coverImage = locale === 'zh' 
    ? (post.cover_image_url_zh || post.cover_image_url_en || post.cover_image_url)
    : (post.cover_image_url_en || post.cover_image_url_zh || post.cover_image_url);
  
  // Generate hreflang alternates using Next.js Metadata API
  const alternates = getMetadataAlternates(`/blog/${categorySlug}/${slug}`, locale);
  
  return {
    title,
    description: description || undefined,
    alternates,
    openGraph: {
      title,
      description: description || undefined,
      type: 'article',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      images: coverImage ? [{ url: coverImage }] : undefined,
      locale: locale === 'zh' ? 'zh_TW' : 'en_US',
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { locale, category: categorySlug, slug } = await params;
  const post = await getPostBySlugWithCategoryCached(slug);
  const t = await getTranslations({ locale, namespace: 'blog' });
  const tBreadcrumb = await getTranslations({ locale, namespace: 'breadcrumb' });
  
  if (!post) {
    notFound();
  }
  
  // Verify category matches - redirect if wrong category in URL
  const actualCategorySlug = post.category?.slug || 'uncategorized';
  if (categorySlug !== actualCategorySlug) {
    redirect(`/${locale}/blog/${actualCategorySlug}/${slug}`);
  }
  
  const title = locale === 'zh' && post.title_zh ? post.title_zh : post.title_en;
  const content = locale === 'zh' && post.content_zh ? post.content_zh : post.content_en;
  const excerpt = locale === 'zh' && post.excerpt_zh ? post.excerpt_zh : post.excerpt_en;
  
  // Select cover image based on locale (with fallback)
  const coverImage = locale === 'zh' 
    ? (post.cover_image_url_zh || post.cover_image_url_en || post.cover_image_url)
    : (post.cover_image_url_en || post.cover_image_url_zh || post.cover_image_url);
  const categoryName = post.category
    ? (locale === 'zh' ? post.category.name_zh : post.category.name_en)
    : null;
  
  const dateLocale = locale === 'zh' ? zhTW : enUS;
  const publishedDate = post.published_at
    ? format(new Date(post.published_at), 'PPP', { locale: dateLocale })
    : null;
  const updatedDate = post.updated_at && post.published_at && 
    new Date(post.updated_at).getTime() > new Date(post.published_at).getTime() + 86400000
    ? format(new Date(post.updated_at), 'PPP', { locale: dateLocale })
    : null;
  
  // Calculate reading time (use stored value or auto-calculate)
  const readingTime = post.reading_time_minutes || calculateReadingTimeMinutes(post.content_en, post.content_zh);
  
  // Fetch author info and related posts
  const author = await getAuthorInfo(post.author_id);
  const relatedPosts = await getRelatedPostsCached(post.id, post.category_id, 4);
  
  // Build breadcrumb items
  const breadcrumbItems = [
    { label: tBreadcrumb('blog'), href: `/${locale}/blog` },
    ...(categoryName ? [{ label: categoryName, href: `/${locale}/blog?category=${actualCategorySlug}` }] : []),
    { label: title },
  ];
  
  // URL for JSON-LD
  const articleUrl = getCanonicalUrl(locale, `/blog/${actualCategorySlug}/${slug}`);
  
  // Server-side Markdown to HTML conversion (reduces client bundle by ~80KB)
  const contentHtml = await markdownToHtml(content);

  // Get scoped messages for comment section (P1 optimization: only 'comments' namespace)
  const allMessages = await getMessages({ locale });
  const commentMessages = { comments: allMessages.comments };

  return (
    <div className="min-h-screen">
      {/* Article JSON-LD Structured Data */}
      <ArticleJsonLd
        title={title}
        description={excerpt || undefined}
        author={{ 
          name: author?.name || 'Quantum Nexus LNK',
          url: author?.email ? `mailto:${author.email}` : undefined,
        }}
        datePublished={post.published_at || post.created_at}
        dateModified={post.updated_at}
        image={coverImage || undefined}
        url={articleUrl}
        locale={locale}
      />
      
      <Header locale={locale} />
      
      <main className="pt-24 pb-16">
        <article className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Breadcrumbs */}
          <Breadcrumbs 
            items={breadcrumbItems} 
            homeLabel={tBreadcrumb('home')}
            locale={locale}
          />
          
          {/* Header - now before cover image */}
          <header className="mb-8">
            {/* Category */}
            {categoryName && (
              <a 
                href={`/${locale}/blog?category=${actualCategorySlug}`}
                className="inline-block px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full mb-4 hover:bg-primary/20 transition-colors"
              >
                {categoryName}
              </a>
            )}
            
            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              {title}
            </h1>
            
            {/* Byline: Author & Dates */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-secondary text-sm">
              {/* Author */}
              {author && (
                <span>
                  {t('writtenBy')}{' '}
                  <span className="font-medium text-foreground/80">
                    {author.name}
                  </span>
                </span>
              )}
              
              {/* Separator */}
              {author && publishedDate && (
                <span className="hidden sm:inline text-secondary/40">•</span>
              )}
              
              {/* Published Date */}
              {publishedDate && (
                <span>
                  {t('publishedOn')}{' '}
                  <time dateTime={post.published_at || undefined} className="font-medium text-foreground/80">
                    {publishedDate}
                  </time>
                </span>
              )}
              
              {/* Updated Date (only show if significantly later than published) */}
              {updatedDate && (
                <>
                  <span className="hidden sm:inline text-secondary/40">•</span>
                  <span>
                    {t('lastUpdated')}{' '}
                    <time dateTime={post.updated_at} className="font-medium text-foreground/80">
                      {updatedDate}
                    </time>
                  </span>
                </>
              )}
              
              {/* Reading Time */}
              <span className="hidden sm:inline text-secondary/40">•</span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t('readingTime', { minutes: readingTime })}</span>
              </span>
            </div>
          </header>
          
          {/* Cover Image - now after header */}
          {coverImage && (
            <figure className="mb-10 -mx-4 sm:mx-0">
              <Image
                src={coverImage}
                alt={
                  (locale === 'zh' 
                    ? (post.cover_image_alt_zh || post.cover_image_alt_en) 
                    : (post.cover_image_alt_en || post.cover_image_alt_zh)
                  ) || title
                }
                width={1200}
                height={630}
                sizes="(max-width: 768px) 100vw, 800px"
                className="w-full h-auto max-h-[500px] object-contain rounded-lg shadow-lg bg-surface"
                priority
              />
            </figure>
          )}
          
          {/* Content */}
          <div className="prose-container">
            <MarkdownContent html={contentHtml} />
          </div>
          
          {/* Comments Section */}
          <ClientCommentSection targetType="post" targetId={post.id} messages={commentMessages} locale={locale} />
          
          {/* Related Posts (Category-based) */}
          <RelatedPosts posts={relatedPosts} locale={locale} />
          
          {/* Similar Posts (AI-based) */}
          <SimilarPosts postId={post.id} locale={locale} />
         </article>
       </main>
       
       <Footer locale={locale} />
    </div>
  );
}
