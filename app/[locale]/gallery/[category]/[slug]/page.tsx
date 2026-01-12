/**
 * Gallery Item Detail Page
 * 
 * Displays a single gallery item with image, description, tags, likes, and comments.
 */

import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getMessages } from 'next-intl/server';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { findVisibleGalleryItemsBySlugCached, getVisibleGalleryItemBySlugCached } from '@/lib/modules/gallery/cached';
import { isGalleryEnabledCached } from '@/lib/features/cached';
import { getMetadataAlternates } from '@/lib/seo/hreflang';
import { toWebp, toOgImage } from '@/lib/utils/cloudinary-url';
import { getLikedGalleryItemIds } from '@/lib/modules/gallery/liked-by-me-io';
import { ANON_ID_COOKIE_NAME } from '@/lib/utils/anon-id';
import LikeButton from '@/components/reactions/LikeButton';
import ClientCommentSection from '@/components/blog/ClientCommentSection';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SimilarGalleryItems from '@/components/gallery/SimilarGalleryItems';

interface PageProps {
  params: Promise<{ locale: string; category: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, category: categorySlug, slug } = await params;
  
  // Check if gallery is enabled
  const enabled = await isGalleryEnabledCached();
  if (!enabled) {
    return {};
  }
  
  const item = await getVisibleGalleryItemBySlugCached(categorySlug, slug);
  
  if (!item) {
    return {};
  }
  
  const title = locale === 'zh' ? item.title_zh : item.title_en;
  const description = locale === 'zh' 
    ? (item.description_zh || `${item.title_zh} - 作品詳情`)
    : (item.description_en || `${item.title_en} - Artwork details`);
  
  const ogImageUrl = toOgImage(item.image_url, item.og_image_format);
  
  return {
    title: `${title} | ${locale === 'zh' ? '畫廊' : 'Gallery'}`,
    description,
    alternates: getMetadataAlternates(`/gallery/${categorySlug}/${slug}`, locale),
    openGraph: {
      title,
      description,
      type: 'article',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: (locale === 'zh' ? item.image_alt_zh : item.image_alt_en) || title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function GalleryItemPage({ params }: PageProps) {
  const { locale, category: categorySlug, slug } = await params;
  
  // Check if gallery is enabled
  const enabled = await isGalleryEnabledCached();
  if (!enabled) {
    notFound();
  }
  
  // Get the item
  const item = await getVisibleGalleryItemBySlugCached(categorySlug, slug);
  
  if (!item) {
    // If the item slug is unique across categories, redirect to its canonical category path.
    const matches = await findVisibleGalleryItemsBySlugCached(slug);
    if (matches.length === 1 && matches[0].category.slug !== categorySlug) {
      redirect(`/${locale}/gallery/${matches[0].category.slug}/${slug}`);
    }
    notFound();
  }
  
  // Get liked status for this item
  const cookieStore = await cookies();
  const anonId = cookieStore.get(ANON_ID_COOKIE_NAME)?.value;
  
  const likedItemIds = await getLikedGalleryItemIds(anonId, [item.id]);
  const likedByMe = likedItemIds.has(item.id);
  
  // Get scoped messages for comment section (P1 optimization: only 'comments' namespace)
  const allMessages = await getMessages({ locale });
  const commentMessages = { comments: allMessages.comments };

  // Localized content
  const title = locale === 'zh' ? item.title_zh : item.title_en;
  const description = locale === 'zh' ? item.description_zh : item.description_en;
  const categoryName = locale === 'zh' ? item.category.name_zh : item.category.name_en;
  const material = locale === 'zh' ? item.material_zh : item.material_en;
  const tags = locale === 'zh' ? item.tags_zh : item.tags_en;
  const imageAlt = (locale === 'zh' ? item.image_alt_zh : item.image_alt_en) || title;
  
  // Convert image to WebP
  const imageUrl = toWebp(item.image_url);

  return (
    <div className="min-h-screen">
      <Header locale={locale} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-secondary">
          <a href={`/${locale}/gallery`} className="hover:text-primary transition-colors">
            {locale === 'zh' ? '畫廊' : 'Gallery'}
          </a>
          <span className="mx-2">/</span>
          <a href={`/${locale}/gallery/${categorySlug}`} className="hover:text-primary transition-colors">
            {categoryName}
          </a>
          <span className="mx-2">/</span>
          <span className="text-foreground">{title}</span>
        </nav>
        
        <article className="max-w-4xl mx-auto">
          {/* Main Image */}
          <div className="mb-8 rounded-lg overflow-hidden bg-surface-raised">
            <Image
              src={imageUrl}
              alt={imageAlt}
              width={1200}
              height={800}
              className="w-full h-auto object-contain"
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
          </div>
          
          {/* Title and Like */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {title}
            </h1>
            <div className="flex-shrink-0">
              <LikeButton
                targetType="gallery_item"
                targetId={item.id}
                initialLiked={likedByMe}
                initialCount={item.like_count}
                size="medium"
              />
            </div>
          </div>
          
          {/* Description */}
          {description && (
            <div className="prose dark:prose-invert max-w-none mb-8">
              <p className="text-secondary leading-relaxed">{description}</p>
            </div>
          )}
          
          {/* Material */}
          {material && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-secondary uppercase tracking-wide mb-2">
                {locale === 'zh' ? '材質' : 'Material'}
              </h2>
              <p className="text-foreground">{material}</p>
            </div>
          )}
          
          {/* Tags */}
          {tags.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-secondary uppercase tracking-wide mb-2">
                {locale === 'zh' ? '標籤' : 'Tags'}
              </h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <a
                    key={index}
                    href={`/${locale}/gallery?tag=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 text-sm bg-surface-raised text-secondary rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {tag}
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-secondary border-t border-border-light pt-4 mb-12">
            <a 
              href={`/${locale}/gallery/${categorySlug}`}
              className="hover:text-primary transition-colors"
            >
              {categoryName}
            </a>
            <span>•</span>
            <time dateTime={item.created_at}>
              {new Date(item.created_at).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>
          
          {/* Comments Section */}
          <ClientCommentSection targetType="gallery_item" targetId={item.id} messages={commentMessages} locale={locale} />
          
          {/* Similar Gallery Items (AI-based) */}
          <SimilarGalleryItems galleryItemId={item.id} locale={locale} />
        </article>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
