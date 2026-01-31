/**
 * Hamburger Nav Autogen Tests
 *
 * Unit tests for the pure hamburger nav auto-generation builder.
 *
 * @see lib/site/hamburger-nav-autogen.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildHamburgerNavWithAutogen } from '@/lib/site/hamburger-nav-autogen';
import type { HamburgerNavV2 } from '@/lib/types/hamburger-nav';
import type { BlogGroup, BlogTag, BlogTopic } from '@/lib/types/blog-taxonomy';
import type { EventTag, EventType } from '@/lib/types/events';
import type { GalleryCategory } from '@/lib/types/gallery';

function isoNow(): string {
  return '2026-01-31T00:00:00Z';
}

describe('hamburger nav autogen', () => {
  it('merges blog taxonomy, events, and gallery selections into existing nav', () => {
    const current: HamburgerNavV2 = {
      version: 2,
      groups: [
        {
          id: 'health-education',
          label: '身心健康衛教 (legacy label should be overwritten)',
          items: [
            {
              id: 'legacy-item',
              label: 'legacy',
              target: { type: 'blog_index', q: 'legacy' },
            },
          ],
        },
        {
          id: 'events',
          label: '講座／活動',
          items: [
            { id: 'recent-talks', label: '近期講座', target: { type: 'events_index', eventType: 'talks' } },
            { id: 'all-events', label: '活動列表', target: { type: 'events_index' } },
            { id: 'collaboration', label: '合作邀請', target: { type: 'page', path: '/collaboration' } },
          ],
        },
        {
          id: 'gallery',
          label: '畫廊',
          items: [
            { id: 'legacy-gallery-cat', label: '舊分類', target: { type: 'gallery_category', categorySlug: 'legacy' } },
            { id: 'gallery-home', label: '畫廊首頁', target: { type: 'gallery_index' } },
          ],
        },
        {
          id: 'about-contact',
          label: '關於／聯絡',
          items: [{ id: 'about', label: '關於', target: { type: 'page', path: '/about' } }],
        },
      ],
    };

    const blogGroups: BlogGroup[] = [
      {
        id: 'bg-1',
        slug: 'health-education',
        name_zh: '身心健康衛教',
        sort_order: 1,
        is_visible: true,
        show_in_nav: true,
        created_at: isoNow(),
        updated_at: isoNow(),
      },
      {
        id: 'bg-2',
        slug: 'book-recommendations',
        name_zh: '書籍推薦',
        sort_order: 2,
        is_visible: true,
        show_in_nav: false,
        created_at: isoNow(),
        updated_at: isoNow(),
      },
    ];

    const blogTopics: BlogTopic[] = [
      {
        id: 'bt-1',
        group_id: 'bg-1',
        slug: 'emotion-care',
        name_zh: '情緒照顧',
        sort_order: 1,
        is_visible: true,
        show_in_nav: true,
        created_at: isoNow(),
        updated_at: isoNow(),
      },
      {
        id: 'bt-2',
        group_id: 'bg-1',
        slug: 'sleep',
        name_zh: '睡眠議題',
        sort_order: 2,
        is_visible: true,
        show_in_nav: false,
        created_at: isoNow(),
        updated_at: isoNow(),
      },
    ];

    const blogTags: BlogTag[] = [
      {
        id: 'tag-1',
        slug: 'beginner',
        name_zh: '入門',
        show_in_nav: true,
        created_at: isoNow(),
        updated_at: isoNow(),
      },
      {
        id: 'tag-2',
        slug: 'practice',
        name_zh: '實作練習',
        show_in_nav: false,
        created_at: isoNow(),
        updated_at: isoNow(),
      },
    ];

    const eventTypes: EventType[] = [
      {
        id: 'et-1',
        slug: 'talks',
        name_zh: '近期講座',
        sort_order: 1,
        is_visible: true,
        show_in_nav: true,
        created_at: isoNow(),
        updated_at: isoNow(),
      },
      {
        id: 'et-2',
        slug: 'workshops',
        name_zh: '療癒工作坊',
        sort_order: 2,
        is_visible: true,
        show_in_nav: false,
        created_at: isoNow(),
        updated_at: isoNow(),
      },
    ];

    const eventTags: EventTag[] = [
      {
        id: 'etag-1',
        slug: 'online',
        name_zh: '線上',
        sort_order: 1,
        is_visible: true,
        show_in_nav: true,
        created_at: isoNow(),
        updated_at: isoNow(),
      },
    ];

    const galleryCategories: GalleryCategory[] = [
      {
        id: 'gc-1',
        sort_order: 1,
        name_en: 'Art Therapy',
        name_zh: '藝術療癒',
        slug: 'art-therapy',
        is_visible: true,
        show_in_nav: true,
        created_at: isoNow(),
        updated_at: isoNow(),
      },
    ];

    const next = buildHamburgerNavWithAutogen(current, {
      blogGroups,
      blogTopics,
      blogTags,
      eventTypes,
      eventTags,
      galleryCategories,
    });

    // Blog groups: only selected group exists, label comes from DB, items are selected topics only
    const health = next.groups.find((g) => g.id === 'health-education');
    assert.ok(health, 'Expected health-education group to exist');
    assert.strictEqual(health!.label, '身心健康衛教');
    assert.deepEqual(
      health!.items,
      [
        {
          id: 'blog-topic:emotion-care',
          label: '情緒照顧',
          target: { type: 'blog_topic', topicSlug: 'emotion-care' },
        },
      ],
      'Expected only selected blog topics to be included'
    );

    assert.ok(!next.groups.some((g) => g.id === 'book-recommendations'), 'Unselected blog group should be removed');

    // Blog tags group exists
    const tagsGroup = next.groups.find((g) => g.id === 'blog-tags');
    assert.ok(tagsGroup, 'Expected blog-tags group to exist');
    assert.deepEqual(tagsGroup!.items[0].target, { type: 'blog_tag', tagSlug: 'beginner' });

    // Events group: filter items regenerated, non-filter items kept
    const events = next.groups.find((g) => g.id === 'events');
    assert.ok(events, 'Expected events group to exist');
    assert.deepEqual(
      events!.items.map((i) => i.id),
      ['event-type:talks', 'event-tag:online', 'all-events', 'collaboration'],
      'Expected auto items first, legacy filter removed, manual items preserved'
    );

    // Gallery group: category items replaced, non-category items kept
    const gallery = next.groups.find((g) => g.id === 'gallery');
    assert.ok(gallery, 'Expected gallery group to exist');
    assert.deepEqual(
      gallery!.items.map((i) => i.id),
      ['gallery-category:art-therapy', 'gallery-home'],
      'Expected selected gallery categories first, legacy category removed, manual item preserved'
    );

    // Unrelated groups remain
    assert.ok(next.groups.some((g) => g.id === 'about-contact'), 'Expected unrelated group to remain');
  });
});

