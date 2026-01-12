import AdminTabs from '@/components/admin/common/AdminTabs';

const GALLERY_TABS = [
  { href: '/admin/gallery', labelEn: 'Items', labelZh: '作品管理' },
  { href: '/admin/gallery/categories', labelEn: 'Categories', labelZh: '分類管理' },
  { href: '/admin/gallery/featured', labelEn: 'Featured', labelZh: '精選管理' },
];

export default async function GalleryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div>
      <AdminTabs locale={locale} items={GALLERY_TABS} />
      {children}
    </div>
  );
}
