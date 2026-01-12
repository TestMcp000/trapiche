import AdminTabs from '@/components/admin/common/AdminTabs';

const SHOP_TABS = [
  { href: '/admin/shop', labelKey: 'shop.tabs.dashboard' },
  { href: '/admin/shop/orders', labelKey: 'shop.tabs.orders' },
  { href: '/admin/shop/products', labelKey: 'shop.tabs.products' },
  { href: '/admin/shop/coupons', labelKey: 'shop.tabs.coupons' },
  { href: '/admin/shop/members', labelKey: 'shop.tabs.members' },
  { href: '/admin/shop/access', labelKey: 'shop.tabs.access' },
  { href: '/admin/shop/settings', labelKey: 'shop.tabs.settings' },
  { href: '/admin/shop/payments', labelKey: 'shop.tabs.payments' },
];

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div>
      <AdminTabs locale={locale} items={SHOP_TABS} />
      {children}
    </div>
  );
}
