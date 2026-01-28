/**
 * Hamburger Nav Publish IO Tests
 *
 * Tests to verify that deep validation uses correct database table names.
 * These tests inspect the source code to prevent regressions where wrong
 * table names (e.g., 'blog_posts' instead of 'posts') cause publish failures.
 *
 * @see lib/modules/content/hamburger-nav-publish-io.ts
 * @see lib/modules/content/hamburger-nav-publish-blog-validate-io.ts
 * @see lib/modules/content/hamburger-nav-publish-gallery-validate-io.ts
 * @see lib/modules/content/hamburger-nav-publish-events-validate-io.ts
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (hamburger nav contract)
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (PR-42)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Tests run with `cwd` = repo root (set by `scripts/test.mjs`)
const repoRoot = process.cwd();
const contentModulePath = path.join(repoRoot, 'lib', 'modules', 'content');

// Read all hamburger-nav-publish*.ts files
const publishFiles = fs
    .readdirSync(contentModulePath)
    .filter((f) => f.startsWith('hamburger-nav-publish') && f.endsWith('.ts'));

const allSources = publishFiles.map((file) => ({
    file,
    source: fs.readFileSync(path.join(contentModulePath, file), 'utf8'),
}));

const combinedSource = allSources.map((s) => s.source).join('\n');

describe('hamburger-nav-publish-io table names', () => {
    describe('Module structure', () => {
        it('has orchestrator module', () => {
            assert.ok(
                publishFiles.includes('hamburger-nav-publish-io.ts'),
                'Expected hamburger-nav-publish-io.ts to exist'
            );
        });

        it('has blog validation module', () => {
            assert.ok(
                publishFiles.includes('hamburger-nav-publish-blog-validate-io.ts'),
                'Expected hamburger-nav-publish-blog-validate-io.ts to exist'
            );
        });

        it('has gallery validation module', () => {
            assert.ok(
                publishFiles.includes('hamburger-nav-publish-gallery-validate-io.ts'),
                'Expected hamburger-nav-publish-gallery-validate-io.ts to exist'
            );
        });

        it('has events validation module', () => {
            assert.ok(
                publishFiles.includes('hamburger-nav-publish-events-validate-io.ts'),
                'Expected hamburger-nav-publish-events-validate-io.ts to exist'
            );
        });
    });

    describe('Blog post validation', () => {
        it('uses "posts" table (not "blog_posts")', () => {
            assert.ok(
                combinedSource.includes(".from('posts')"),
                'Expected validateBlogPost to use .from(\'posts\') - DB SSoT table name'
            );
        });

        it('does not use wrong table name "blog_posts"', () => {
            assert.equal(
                combinedSource.includes(".from('blog_posts')"),
                false,
                'validateBlogPost should NOT use .from(\'blog_posts\') - wrong table name'
            );
        });
    });

    describe('Blog category validation', () => {
        it('uses "categories" table (not "blog_categories")', () => {
            assert.ok(
                combinedSource.includes(".from('categories')"),
                'Expected validateBlogCategory to use .from(\'categories\') - DB SSoT table name'
            );
        });

        it('does not use wrong table name "blog_categories"', () => {
            assert.equal(
                combinedSource.includes(".from('blog_categories')"),
                false,
                'validateBlogCategory should NOT use .from(\'blog_categories\') - wrong table name'
            );
        });
    });

    describe('Gallery validation (reference)', () => {
        it('uses "gallery_categories" table', () => {
            assert.ok(
                combinedSource.includes(".from('gallery_categories')"),
                'Expected validateGalleryCategory to use .from(\'gallery_categories\')'
            );
        });

        it('uses "gallery_items" table', () => {
            assert.ok(
                combinedSource.includes(".from('gallery_items')"),
                'Expected validateGalleryItem to use .from(\'gallery_items\')'
            );
        });
    });

    describe('Blog taxonomy validation (PR-42)', () => {
        it('uses "blog_groups" table', () => {
            assert.ok(
                combinedSource.includes(".from('blog_groups')"),
                'Expected validateBlogGroup to use .from(\'blog_groups\')'
            );
        });

        it('uses "blog_topics" table', () => {
            assert.ok(
                combinedSource.includes(".from('blog_topics')"),
                'Expected validateBlogTopic to use .from(\'blog_topics\')'
            );
        });

        it('uses "blog_tags" table', () => {
            assert.ok(
                combinedSource.includes(".from('blog_tags')"),
                'Expected validateBlogTag to use .from(\'blog_tags\')'
            );
        });
    });

    describe('Events validation (PR-42)', () => {
        it('uses "event_types" table', () => {
            assert.ok(
                combinedSource.includes(".from('event_types')"),
                'Expected validateEventType to use .from(\'event_types\')'
            );
        });

        it('uses "event_tags" table', () => {
            assert.ok(
                combinedSource.includes(".from('event_tags')"),
                'Expected validateEventTag to use .from(\'event_tags\')'
            );
        });

        it('uses "events" table', () => {
            assert.ok(
                combinedSource.includes(".from('events')"),
                'Expected validateEventDetail to use .from(\'events\')'
            );
        });
    });

    describe('Error path localization', () => {
        it('includes path in error structure', () => {
            assert.ok(
                combinedSource.includes('path,'),
                'Error structure should include path field for UI localization'
            );
            assert.ok(
                combinedSource.includes('targetType:'),
                'Error structure should include targetType field'
            );
            assert.ok(
                combinedSource.includes('targetSlug:'),
                'Error structure should include targetSlug field'
            );
        });

        it('generates correct path format for nav items', () => {
            assert.ok(
                combinedSource.includes('`groups[${gi}].items[${ii}].target`'),
                'Path should be formatted as groups[i].items[j].target'
            );
        });
    });

    describe('Server-only enforcement', () => {
        it('all modules import server-only', () => {
            for (const { file, source } of allSources) {
                assert.ok(
                    source.includes("import 'server-only'"),
                    `${file} should import 'server-only'`
                );
            }
        });
    });
});
