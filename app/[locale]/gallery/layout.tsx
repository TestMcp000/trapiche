/**
 * Gallery Section Layout
 *
 * Applies gallery-specific theme via ThemeScope.
 * This is a server component that wraps all gallery pages.
 *
 * @see ARCHITECTURE.md §3.2 - ThemeScope component
 */

import { ThemeScope } from '@/components/theme/ThemeScope';

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeScope scope="gallery">{children}</ThemeScope>;
}
