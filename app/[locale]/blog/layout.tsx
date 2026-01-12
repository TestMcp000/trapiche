/**
 * Blog Section Layout
 *
 * Applies blog-specific theme via ThemeScope.
 * This is a server component that wraps all blog pages.
 *
 * @see ARCHITECTURE.md §3.2 - ThemeScope component
 */

import { ThemeScope } from '@/components/theme/ThemeScope';

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeScope scope="blog">{children}</ThemeScope>;
}
