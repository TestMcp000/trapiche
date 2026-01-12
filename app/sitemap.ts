import { MetadataRoute } from 'next';
import { getPublicPostsForSitemapCached } from '@/lib/modules/blog/cached';
import { getVisibleGalleryItemsForSitemapCached } from '@/lib/modules/gallery/cached';
import { getVisibleProductsForSitemapCached, getVisibleProductCategoriesCached } from '@/lib/modules/shop/cached';
import { isBlogEnabledCached, isGalleryEnabledCached, isShopEnabledCached } from '@/lib/features/cached';
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
  '/shop',
  '/contact',
  '/blog',
  '/privacy',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [];
  
  // Check if features are enabled
  const [blogEnabled, galleryEnabled, shopEnabled] = await Promise.all([
    isBlogEnabledCached(),
    isGalleryEnabledCached(),
    isShopEnabledCached(),
  ]);
  
  // Filter static pages based on feature status
  const activeStaticPages = STATIC_PAGES.filter(page => {
    if (page === '/blog' && !blogEnabled) {
      return false;
    }
    if (page === '/gallery' && !galleryEnabled) {
      return false;
    }
    if (page === '/shop' && !shopEnabled) {
      return false;
    }
    return true;
  });
  
  // Add static pages with language alternates
  for (const page of activeStaticPages) {
    // English version
    sitemapEntries.push({
      url: `${SITE_URL}/en${page}`,
      lastModified: new Date(),
      changeFrequency: page === '' ? 'weekly' : 'monthly',
      priority: page === '' ? 1.0 : 0.8,
      alternates: {
        languages: {
          en: `${SITE_URL}/en${page}`,
          'zh-Hant': `${SITE_URL}/zh${page}`,
        },
      },
    });
    
    // Chinese version
    sitemapEntries.push({
      url: `${SITE_URL}/zh${page}`,
      lastModified: new Date(),
      changeFrequency: page === '' ? 'weekly' : 'monthly',
      priority: page === '' ? 1.0 : 0.8,
      alternates: {
        languages: {
          en: `${SITE_URL}/en${page}`,
          'zh-Hant': `${SITE_URL}/zh${page}`,
        },
      },
    });
  }
  
  // Add blog posts with language alternates
  try {
    const posts = await getPublicPostsForSitemapCached();
    
    for (const post of posts) {
      const blogPath = `/blog/${post.categorySlug}/${post.slug}`;
      const lastModified = new Date(post.updatedAt);
      
      // Only add English version if post has English content
      if (post.hasEnglish) {
        sitemapEntries.push({
          url: `${SITE_URL}/en${blogPath}`,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: {
            languages: {
              en: `${SITE_URL}/en${blogPath}`,
              ...(post.hasChinese && { 'zh-Hant': `${SITE_URL}/zh${blogPath}` }),
            },
          },
        });
      }
      
      // Only add Chinese version if post has Chinese content
      if (post.hasChinese) {
        sitemapEntries.push({
          url: `${SITE_URL}/zh${blogPath}`,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: {
            languages: {
              ...(post.hasEnglish && { en: `${SITE_URL}/en${blogPath}` }),
              'zh-Hant': `${SITE_URL}/zh${blogPath}`,
            },
          },
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
        const galleryPath = `/gallery/${item.categorySlug}/${item.itemSlug}`;
        const lastModified = new Date(item.updatedAt);
        
        // English version
        sitemapEntries.push({
          url: `${SITE_URL}/en${galleryPath}`,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: {
            languages: {
              en: `${SITE_URL}/en${galleryPath}`,
              'zh-Hant': `${SITE_URL}/zh${galleryPath}`,
            },
          },
        });
        
        // Chinese version
        sitemapEntries.push({
          url: `${SITE_URL}/zh${galleryPath}`,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: {
            languages: {
              en: `${SITE_URL}/en${galleryPath}`,
              'zh-Hant': `${SITE_URL}/zh${galleryPath}`,
            },
          },
        });
      }
    } catch (error) {
      console.error('Error generating sitemap for gallery items:', error);
    }
  }
  
  // Add shop categories and products (if shop is enabled)
  if (shopEnabled) {
    try {
      // Add category pages
      const categories = await getVisibleProductCategoriesCached();
      for (const category of categories) {
        const categoryPath = `/shop/${category.slug}`;
        
        // English version
        sitemapEntries.push({
          url: `${SITE_URL}/en${categoryPath}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: {
            languages: {
              en: `${SITE_URL}/en${categoryPath}`,
              'zh-Hant': `${SITE_URL}/zh${categoryPath}`,
            },
          },
        });
        
        // Chinese version
        sitemapEntries.push({
          url: `${SITE_URL}/zh${categoryPath}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: {
            languages: {
              en: `${SITE_URL}/en${categoryPath}`,
              'zh-Hant': `${SITE_URL}/zh${categoryPath}`,
            },
          },
        });
      }
      
      // Add product pages
      const products = await getVisibleProductsForSitemapCached();
      for (const product of products) {
        // Only add products with a category
        if (!product.category) continue;
        
        const productPath = `/shop/${product.category}/${product.slug}`;
        const lastModified = new Date(product.updatedAt);
        
        // English version
        sitemapEntries.push({
          url: `${SITE_URL}/en${productPath}`,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.6,
          alternates: {
            languages: {
              en: `${SITE_URL}/en${productPath}`,
              'zh-Hant': `${SITE_URL}/zh${productPath}`,
            },
          },
        });
        
        // Chinese version
        sitemapEntries.push({
          url: `${SITE_URL}/zh${productPath}`,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.6,
          alternates: {
            languages: {
              en: `${SITE_URL}/en${productPath}`,
              'zh-Hant': `${SITE_URL}/zh${productPath}`,
            },
          },
        });
      }
    } catch (error) {
      console.error('Error generating sitemap for shop:', error);
    }
  }
  
  return sitemapEntries;
}

