import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

function getNestedValue(obj: unknown, pathSegments: string[]): unknown {
  let current: unknown = obj;
  for (const segment of pathSegments) {
    if (typeof current !== 'object' || current === null) return undefined;
    const record = current as Record<string, unknown>;
    current = record[segment];
  }
  return current;
}

function getNestedString(obj: unknown, pathSegments: string[]): string | null {
  const value = getNestedValue(obj, pathSegments);
  return typeof value === 'string' ? value : null;
}

describe('admin i18n namespaces', () => {
  it('uses existing zh namespaces for Events/FAQs/Taxonomy', () => {
    const zh = JSON.parse(readRepoFile('messages/zh.json')) as unknown;

    // Ensure message keys exist (prevents silent fallback-to-key UI).
    assert.ok(getNestedString(zh, ['admin', 'blog', 'events', 'title']));
    assert.ok(getNestedString(zh, ['admin', 'blog', 'faqs', 'title']));
    assert.ok(getNestedString(zh, ['admin', 'blog', 'taxonomy', 'groups', 'title']));

    const expectations: Array<{
      file: string;
      mustContain: string[];
      mustNotContain: string[];
    }> = [
      {
        file: 'app/[locale]/admin/events/page.tsx',
        mustContain: ['namespace: "admin.blog.events"'],
        mustNotContain: ['namespace: "admin.events"'],
      },
      {
        file: 'app/[locale]/admin/events/new/page.tsx',
        mustContain: ['namespace: "admin.blog.events"'],
        mustNotContain: ['namespace: "admin.events"'],
      },
      {
        file: 'app/[locale]/admin/events/[id]/edit/page.tsx',
        mustContain: ['namespace: "admin.blog.events"'],
        mustNotContain: ['namespace: "admin.events"'],
      },
      {
        file: 'app/[locale]/admin/events/components/EventsListClient.tsx',
        mustContain: ['useTranslations("admin.blog.events")'],
        mustNotContain: ['useTranslations("admin.events")'],
      },
      {
        file: 'app/[locale]/admin/events/components/EventFormClient.tsx',
        mustContain: ['useTranslations("admin.blog.events")'],
        mustNotContain: ['useTranslations("admin.events")'],
      },
      {
        file: 'app/[locale]/admin/faqs/page.tsx',
        mustContain: ['namespace: "admin.blog.faqs"'],
        mustNotContain: ['namespace: "admin.faqs"'],
      },
      {
        file: 'app/[locale]/admin/faqs/components/FAQsListClient.tsx',
        mustContain: ['useTranslations("admin.blog.faqs")'],
        mustNotContain: ['useTranslations("admin.faqs")'],
      },
      {
        file: 'app/[locale]/admin/(blog)/groups/page.tsx',
        mustContain: ['namespace: "admin.blog.taxonomy"'],
        mustNotContain: ['namespace: "admin.taxonomy"'],
      },
      {
        file: 'app/[locale]/admin/(blog)/topics/page.tsx',
        mustContain: ['namespace: "admin.blog.taxonomy"'],
        mustNotContain: ['namespace: "admin.taxonomy"'],
      },
      {
        file: 'app/[locale]/admin/(blog)/tags/page.tsx',
        mustContain: ['namespace: "admin.blog.taxonomy"'],
        mustNotContain: ['namespace: "admin.taxonomy"'],
      },
      {
        file: 'app/[locale]/admin/(blog)/groups/components/GroupsListClient.tsx',
        mustContain: ['useTranslations("admin.blog.taxonomy")'],
        mustNotContain: ['useTranslations("admin.taxonomy")'],
      },
      {
        file: 'app/[locale]/admin/(blog)/topics/components/TopicsListClient.tsx',
        mustContain: ['useTranslations("admin.blog.taxonomy")'],
        mustNotContain: ['useTranslations("admin.taxonomy")'],
      },
      {
        file: 'app/[locale]/admin/(blog)/tags/components/TagsListClient.tsx',
        mustContain: ['useTranslations("admin.blog.taxonomy")'],
        mustNotContain: ['useTranslations("admin.taxonomy")'],
      },
    ];

    for (const { file, mustContain, mustNotContain } of expectations) {
      const src = readRepoFile(file);

      for (const needle of mustContain) {
        assert.ok(
          src.includes(needle),
          `${file} is expected to include: ${needle}`,
        );
      }

      for (const needle of mustNotContain) {
        assert.ok(
          !src.includes(needle),
          `${file} must not include: ${needle}`,
        );
      }
    }
  });
});
