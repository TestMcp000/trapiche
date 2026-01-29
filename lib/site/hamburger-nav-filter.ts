import type { HamburgerNavV2, NavTargetType } from '@/lib/types/hamburger-nav';

const BLOG_TARGET_TYPES: NavTargetType[] = [
  'blog_index',
  'blog_category',
  'blog_post',
  'blog_group',
  'blog_topic',
  'blog_tag',
];

const GALLERY_TARGET_TYPES: NavTargetType[] = [
  'gallery_index',
  'gallery_category',
  'gallery_item',
];

function isTargetTypeIn(list: readonly NavTargetType[], type: NavTargetType): boolean {
  return list.includes(type);
}

/**
 * Filter hamburger nav items by feature visibility.
 *
 * - If blog is disabled, drop all `blog_*` targets.
 * - If gallery is disabled, drop all `gallery_*` targets.
 * - Remove empty groups.
 */
export function filterHamburgerNavByFeatures(
  nav: HamburgerNavV2,
  features: { blogEnabled: boolean; galleryEnabled: boolean }
): HamburgerNavV2 {
  const { blogEnabled, galleryEnabled } = features;

  const groups = nav.groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!blogEnabled && isTargetTypeIn(BLOG_TARGET_TYPES, item.target.type)) return false;
        if (!galleryEnabled && isTargetTypeIn(GALLERY_TARGET_TYPES, item.target.type)) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return { version: 2, groups };
}

