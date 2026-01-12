/**
 * Shop Section Layout
 *
 * Applies shop-specific theme via ThemeScope.
 * This is a server component that wraps all shop pages.
 *
 * @see ARCHITECTURE.md §3.2 - ThemeScope component
 */

import { ThemeScope } from '@/components/theme/ThemeScope';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeScope scope="shop">{children}</ThemeScope>;
}
