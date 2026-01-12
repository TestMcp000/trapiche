import AdminTabs from '@/components/admin/common/AdminTabs';

const BLOG_TABS = [
  { href: '/admin/posts', labelEn: 'Posts', labelZh: '文章管理' },
  { href: '/admin/categories', labelEn: 'Categories', labelZh: '分類管理' },
  { href: '/admin/comments', labelEn: 'Comments', labelZh: '留言管理' },
];

export default async function BlogLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div>
      <AdminTabs locale={locale} items={BLOG_TABS} />
      {children}
    </div>
  );
}
