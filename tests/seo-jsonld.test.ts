import assert from 'node:assert/strict';
import test from 'node:test';
import { SITE_URL } from '../lib/seo/hreflang';
import {
  generateArticleJsonLd,
  generateBreadcrumbJsonLd,
  generateHomePageJsonLd,
} from '../lib/seo/jsonld';

test('generateArticleJsonLd emits BlogPosting with expected fields', () => {
  const jsonLd = generateArticleJsonLd({
    title: 'Hello',
    description: 'Desc',
    author: { name: 'Alice', url: 'https://example.com/alice' },
    datePublished: '2025-01-01T00:00:00.000Z',
    dateModified: '2025-01-02T00:00:00.000Z',
    image: 'https://example.com/image.png',
    url: 'https://example.com/post',
    locale: 'zh',
  }) as Record<string, unknown>;

  assert.equal(jsonLd['@type'], 'BlogPosting');
  assert.equal(jsonLd.headline, 'Hello');
  assert.equal(jsonLd.inLanguage, 'zh-Hant');

  const publisher = jsonLd.publisher as Record<string, unknown>;
  assert.equal(publisher['@type'], 'Organization');
  assert.equal(publisher.name, 'Quantum Nexus LNK');
  assert.equal(publisher.url, SITE_URL);
});

test('generateBreadcrumbJsonLd positions items starting from 1', () => {
  const jsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: 'https://example.com/en' },
    { name: 'Blog', url: 'https://example.com/en/blog' },
  ]) as Record<string, unknown>;

  assert.equal(jsonLd['@type'], 'BreadcrumbList');
  const items = jsonLd.itemListElement as Array<Record<string, unknown>>;
  assert.equal(items.length, 2);
  assert.equal(items[0].position, 1);
  assert.equal(items[1].position, 2);
});

test('generateHomePageJsonLd emits graph with Organization and WebSite', () => {
  const jsonLd = generateHomePageJsonLd({
    siteName: 'Quantum Nexus LNK',
    siteUrl: 'https://example.com',
    email: 'hello@example.com',
    githubUrl: 'https://github.com/example',
    description: 'Example',
    locale: 'en',
    services: [{ name: 'Build', description: 'Build stuff' }],
    faqs: [{ question: 'Q', answer: 'A' }],
    breadcrumbs: [{ name: 'Home', url: 'https://example.com/en' }],
  }) as Record<string, unknown>;

  assert.equal(jsonLd['@context'], 'https://schema.org');
  const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(graph));

  const org = graph.find((n) => n['@type'] === 'Organization');
  const website = graph.find((n) => n['@type'] === 'WebSite');
  const faq = graph.find((n) => n['@type'] === 'FAQPage');

  assert.ok(org);
  assert.ok(website);
  assert.ok(faq);
});

