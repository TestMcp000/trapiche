import { MetadataRoute } from 'next';
import { getPublicPostsForSitemapCached } from '@/lib/modules/blog/cached';
import { getVisibleGalleryItemsForSitemapCached } from '@/lib/modules/gallery/cached';
import {
  getVisibleBlogGroupsCached,
  getVisibleBlogTopicsCached,
  getBlogTagsWithCountsCached,
} from '@/lib/modules/blog/taxonomy-cached';
import { getPublicEventsForSitemapCached } from '@/lib/modules/events/cached';
import { getFAQsForSitemapCached } from '@/lib/modules/faq/cached';
import { isBlogEnabledCached, isGalleryEnabledCached } from '@/lib/features/cached';
// P0-6: Use centralized SITE_URL from lib/seo/hreflang
import { SITE_URL } from '@/lib/seo/hreflang';


// Static pages that exist on the site
// Note: /platforms is a legacy route that redirects to /events (PR-43)
const STATIC_PAGES = [
  '',           // Homepage
  '/about',
  '/services',
  '/portfolio',
  '/gallery',
  '/contact',
  '/blog',
  '/privacy',
  '/events',
  '/faq',
  '/collaboration',
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
  if (blogEnabled) {
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

    // Add blog taxonomy pages (groups, topics, tags)
    try {
      // Blog Groups
      const groups = await getVisibleBlogGroupsCached();
      for (const group of groups) {
        sitemapEntries.push({
          url: `${SITE_URL}/zh/blog/groups/${group.slug}`,
          lastModified: new Date(group.updated_at),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }

      // Blog Topics (use /blog/categories/[slug] for backward compatibility)
      const topics = await getVisibleBlogTopicsCached();
      for (const topic of topics) {
        sitemapEntries.push({
          url: `${SITE_URL}/zh/blog/categories/${topic.slug}`,
          lastModified: new Date(topic.updated_at),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }

      // Blog Tags (only include tags with posts)
      const tagsWithCounts = await getBlogTagsWithCountsCached();
      for (const tag of tagsWithCounts) {
        if (tag.post_count > 0) {
          sitemapEntries.push({
            url: `${SITE_URL}/zh/blog/tags/${tag.slug}`,
            lastModified: new Date(tag.updated_at),
            changeFrequency: 'weekly',
            priority: 0.5,
          });
        }
      }
    } catch (error) {
      console.error('Error generating sitemap for blog taxonomy:', error);
    }
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

  // Add events
  try {
    const events = await getPublicEventsForSitemapCached();

    // Add events index page
    sitemapEntries.push({
      url: `${SITE_URL}/zh/events`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    });

    // Add individual event pages
    for (const event of events) {
      sitemapEntries.push({
        url: `${SITE_URL}/zh/events/${event.slug}`,
        lastModified: new Date(event.updated_at),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error('Error generating sitemap for events:', error);
  }

  // Add FAQ page
  try {
    const faqData = await getFAQsForSitemapCached();

    sitemapEntries.push({
      url: `${SITE_URL}/zh/faq`,
      lastModified: faqData ? new Date(faqData.updated_at) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  } catch (error) {
    console.error('Error generating sitemap for FAQ:', error);
  }

  return sitemapEntries;
}

