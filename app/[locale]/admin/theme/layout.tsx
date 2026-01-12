import AdminTabs from '@/components/admin/common/AdminTabs';

const THEME_TABS = [
  { href: '/admin/theme', labelEn: 'Global Theme', labelZh: '全域主題' },
  { href: '/admin/theme/pages', labelEn: 'Page Themes', labelZh: '分頁主題' },
  { href: '/admin/theme/layouts', labelEn: 'Layout Settings', labelZh: '布局設定' },
  { href: '/admin/theme/fonts', labelEn: 'Fonts', labelZh: '字體' },
];

export default async function ThemeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div>
      <AdminTabs locale={locale} items={THEME_TABS} />
      {children}
    </div>
  );
}
