/**
 * Gallery Item Detail Page (v2 Canonical)
 * 
 * Displays a single gallery item at /gallery/items/[category]/[slug]
 * with image, description, tags, likes, comments, and hotspots overlay.
 */

import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getMessages } from 'next-intl/server';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { 
  findVisibleGalleryItemsBySlugCached, 
  getVisibleGalleryItemBySlugCached,
  getHotspotsByItemIdCached,
} from '@/lib/modules/gallery/cached';
import { isGalleryEnabledCached } from '@/lib/features/cached';
import { getMetadataAlternates } from '@/lib/seo/hreflang';
import { toWebp, toOgImage } from '@/lib/utils/cloudinary-url';
import { getLikedGalleryItemIds } from '@/lib/modules/gallery/liked-by-me-io';
import { ANON_ID_COOKIE_NAME } from '@/lib/utils/anon-id';
import { hotspotsMarkdownToHtml } from '@/lib/markdown/hotspots';
import LikeButton from '@/components/reactions/LikeButton';
import ClientCommentSection from '@/components/comments/ClientCommentSection';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SimilarGalleryItems from '@/components/gallery/SimilarGalleryItems';
import GalleryItemHotspotsClient from '@/components/gallery/GalleryItemHotspotsClient';

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
  
  const title = item.title_zh;
  const description = item.description_zh || `${item.title_zh}－作品詳情`;
  
  const ogImageUrl = toOgImage(item.image_url, item.og_image_format);
  
  // v2 canonical URL
  return {
    title: `${title}｜畫廊`,
    description,
    alternates: getMetadataAlternates(`/gallery/items/${categorySlug}/${slug}`, locale),
    openGraph: {
      title,
      description,
      type: 'article',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: item.image_alt_zh || title,
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
      redirect(`/${locale}/gallery/items/${matches[0].category.slug}/${slug}`);
    }
    notFound();
  }
  
  // Get liked status and hotspots for this item in parallel
  const cookieStore = await cookies();
  const anonId = cookieStore.get(ANON_ID_COOKIE_NAME)?.value;
  
  const [likedItemIds, hotspots] = await Promise.all([
    getLikedGalleryItemIds(anonId, [item.id]),
    getHotspotsByItemIdCached(item.id),
  ]);
  const likedByMe = likedItemIds.has(item.id);
  
  // Process hotspots markdown to HTML on server (safe pipeline)
  const hotspotsWithHtml = await Promise.all(
    hotspots.map(async (hotspot) => ({
      ...hotspot,
      description_html: await hotspotsMarkdownToHtml(hotspot.description_md),
    }))
  );
  
  // Get scoped messages for comment section (P1 optimization: only 'comments' namespace)
  const allMessages = await getMessages({ locale });
  const commentMessages = { comments: allMessages.comments };

  // Localized content
  const title = item.title_zh;
  const description = item.description_zh;
  const categoryName = item.category.name_zh;
  const material = item.material_zh;
  const tags = item.tags_zh;
  const imageAlt = item.image_alt_zh || title;
  
  // Convert image to WebP
  const imageUrl = toWebp(item.image_url);

  // Hotspot UI labels
  const hotspotLabels = {
    viewMaterialsList: '查看媒材清單',
    close: '關閉',
    readMore: '延伸閱讀',
    usageAndTexture: '使用方式 / 觸感',
    symbolism: '象徵意涵',
  };

  return (
    <div className="min-h-screen">
      <Header locale={locale} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {/* Breadcrumb (v2 canonical) */}
        <nav className="mb-4 text-sm text-secondary">
          <a href={`/${locale}/gallery`} className="hover:text-primary transition-colors">
            畫廊
          </a>
          <span className="mx-2">/</span>
          <a href={`/${locale}/gallery/categories/${categorySlug}`} className="hover:text-primary transition-colors">
            {categoryName}
          </a>
          <span className="mx-2">/</span>
          <span className="text-foreground">{title}</span>
        </nav>
        
        <article className="max-w-4xl mx-auto">
          {/* Main Image with Hotspots Overlay */}
          <div className="mb-8">
            <GalleryItemHotspotsClient
              hotspots={hotspotsWithHtml}
              labels={hotspotLabels}
              className="rounded-lg overflow-hidden bg-surface-raised"
            >
              <Image
                src={imageUrl}
                alt={imageAlt}
                width={1200}
                height={800}
                className="w-full h-auto object-contain"
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
            </GalleryItemHotspotsClient>
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
                材質
              </h2>
              <p className="text-foreground">{material}</p>
            </div>
          )}
          
          {/* Tags */}
          {tags.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-secondary uppercase tracking-wide mb-2">
                標籤
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
              href={`/${locale}/gallery/categories/${categorySlug}`}
              className="hover:text-primary transition-colors"
            >
              {categoryName}
            </a>
            <span>•</span>
            <time dateTime={item.created_at}>
              {new Date(item.created_at).toLocaleDateString('zh-TW', {
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
