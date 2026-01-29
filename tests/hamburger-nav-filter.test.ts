import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterHamburgerNavByFeatures } from '@/lib/site/hamburger-nav-filter';
import type { HamburgerNavV2 } from '@/lib/types/hamburger-nav';

describe('filterHamburgerNavByFeatures', () => {
  const baseNav: HamburgerNavV2 = {
    version: 2,
    groups: [
      {
        id: 'g1',
        label: 'Mixed',
        items: [
          { id: 'b1', label: 'Blog', target: { type: 'blog_index' } },
          { id: 'ga1', label: 'Gallery', target: { type: 'gallery_index' } },
          { id: 'p1', label: 'About', target: { type: 'page', path: '/about' } },
        ],
      },
      {
        id: 'g2',
        label: 'Blog Only',
        items: [{ id: 'b2', label: 'Blog', target: { type: 'blog_tag', tagSlug: 'tag' } }],
      },
    ],
  };

  it('drops blog targets when blog is disabled', () => {
    const filtered = filterHamburgerNavByFeatures(baseNav, {
      blogEnabled: false,
      galleryEnabled: true,
    });

    assert.equal(filtered.groups.length, 1);
    assert.equal(filtered.groups[0].id, 'g1');
    assert.deepEqual(
      filtered.groups[0].items.map((i) => i.id),
      ['ga1', 'p1']
    );
  });

  it('drops gallery targets when gallery is disabled', () => {
    const filtered = filterHamburgerNavByFeatures(baseNav, {
      blogEnabled: true,
      galleryEnabled: false,
    });

    assert.equal(filtered.groups.length, 2);
    assert.deepEqual(
      filtered.groups[0].items.map((i) => i.id),
      ['b1', 'p1']
    );
  });

  it('removes empty groups', () => {
    const filtered = filterHamburgerNavByFeatures(baseNav, {
      blogEnabled: false,
      galleryEnabled: false,
    });

    assert.equal(filtered.groups.length, 1);
    assert.equal(filtered.groups[0].id, 'g1');
    assert.deepEqual(
      filtered.groups[0].items.map((i) => i.id),
      ['p1']
    );
  });
});

