/**
 * Edit Post Page (Server Component)
 * 
 * Located in (blog) route group for shared tabs layout.
 * Uses admin i18n via getTranslations.
 */

import { notFound } from 'next/navigation';
import { getCategories, getPostById } from '@/lib/modules/blog/admin-io';
import { getAdminLocale } from '@/lib/i18n/admin-locale.server';
import { getTranslations, getMessages } from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';
import PostForm from '../../components/PostForm';

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: routeLocale, id } = await params;
  
  // Get admin UI locale
  const adminLocale = await getAdminLocale();
  
  // Get translations for admin blog namespace
  const t = await getTranslations({ locale: adminLocale, namespace: 'admin.blog.postForm' });
  
  // Get messages for client component
  const allMessages = await getMessages({ locale: adminLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;
  
  let post;
  let categories;
  
  try {
    [post, categories] = await Promise.all([
      getPostById(id),
      getCategories(),
    ]);
  } catch (error) {
    console.error('Error loading edit post page:', error);
    return (
      <div className="p-8 text-red-600">
        <h1>Error loading post</h1>
        <p>There was an error loading the post data. Please try again.</p>
        <pre className="mt-4 text-sm">{String(error)}</pre>
      </div>
    );
  }
  
  if (!post) {
    notFound();
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('editPost')}</h1>
      </div>
      
      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        <PostForm
          routeLocale={routeLocale}
          categories={categories}
          messages={adminMessages}
          initialData={{
            id: post.id,
            title_en: post.title_en,
            title_zh: post.title_zh || '',
            slug: post.slug,
            content_en: post.content_en,
            content_zh: post.content_zh || '',
            excerpt_en: post.excerpt_en || '',
            excerpt_zh: post.excerpt_zh || '',
            cover_image_url: post.cover_image_url || '',
            cover_image_url_en: post.cover_image_url_en || post.cover_image_url || '',
            cover_image_url_zh: post.cover_image_url_zh || post.cover_image_url || '',
            category_id: post.category_id || '',
            visibility: post.visibility,
            reading_time_minutes: post.reading_time_minutes,
          }}
        />
      </div>
    </div>
  );
}

