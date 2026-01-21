import { MetadataRoute } from 'next';
import { getPublicPostsForSitemapCached } from '@/lib/modules/blog/cached';
import { getVisibleGalleryItemsForSitemapCached } from '@/lib/modules/gallery/cached';
import { isBlogEnabledCached, isGalleryEnabledCached } from '@/lib/features/cached';
// P0-6: Use centralized SITE_URL from lib/seo/hreflang
import { SITE_URL } from '@/lib/seo/hreflang';

// Static pages that exist on the site
const STATIC_PAGES = [
  '',           // Homepage
  '/about',
  '/services',
  '/platforms',
  '/portfolio',
  '/gallery',
  '/contact',
  '/blog',
  '/privacy',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Check if features are enabled
  const [blogEnabled, galleryEnabled] = await Promise.all([
    isBlogEnabledCached(),
    isGalleryEnabledCached(),
  ]);

  // Filter static pages based on feature status
  const activeStaticPages = STATIC_PAGES.filter(page => {
    if (page === '/blog' && !blogEnabled) {
      return false;
    }
    if (page === '/gallery' && !galleryEnabled) {
      return false;
    }
    return true;
  });

  // Add static pages with language alternates
  for (const page of activeStaticPages) {
    sitemapEntries.push({
      url: `${SITE_URL}/zh${page}`,
      lastModified: new Date(),
      changeFrequency: page === '' ? 'weekly' : 'monthly',
      priority: page === '' ? 1.0 : 0.8,
    });
  }

  // Add blog posts with language alternates
  try {
    const posts = await getPublicPostsForSitemapCached();

    for (const post of posts) {
      // v2 canonical URL: /blog/posts/[slug]
      const blogPath = `/blog/posts/${post.slug}`;
      const lastModified = new Date(post.updatedAt);

      // Only add Chinese version if post has Chinese content
      if (post.hasChinese) {
        sitemapEntries.push({
          url: `${SITE_URL}/zh${blogPath}`,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  } catch (error) {
    console.error('Error generating sitemap for blog posts:', error);
  }

  // Add gallery items with language alternates (if gallery is enabled)
  if (galleryEnabled) {
    try {
      const galleryItems = await getVisibleGalleryItemsForSitemapCached();

      for (const item of galleryItems) {
        // v2 canonical URL: /gallery/items/[category]/[slug]
        const galleryPath = `/gallery/items/${item.categorySlug}/${item.itemSlug}`;
        const lastModified = new Date(item.updatedAt);

        sitemapEntries.push({
          url: `${SITE_URL}/zh${galleryPath}`,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    } catch (error) {
      console.error('Error generating sitemap for gallery items:', error);
    }
  }

  return sitemapEntries;
}

