/**
 * Events Tags Tests
 *
 * PR-39: Tests for events tag URL builders, types, and validation.
 *
 * @see ARCHITECTURE.md §3.11 (v2 canonical path builders)
 * @see STEP_PLAN.md PR-39 (Events v2: Add Tags)
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { buildEventsListUrl } from "@/lib/seo/url-builders";
import type { EventTag, EventTagInput, EventTagWithCount } from "@/lib/types/events";

describe("Events Tags URL Builders", () => {
    describe("buildEventsListUrl with tag filter", () => {
        it("generates events list URL without tag", () => {
            const url = buildEventsListUrl("zh");
            assert.strictEqual(url, "/zh/events");
        });

        it("includes tag filter param", () => {
            const url = buildEventsListUrl("zh", { tag: "workshop" });
            assert.strictEqual(url, "/zh/events?tag=workshop");
        });

        it("combines tag with type filter", () => {
            const url = buildEventsListUrl("zh", { type: "lecture", tag: "beginner" });
            assert.strictEqual(url, "/zh/events?type=lecture&tag=beginner");
        });

        it("combines tag with search query", () => {
            const url = buildEventsListUrl("zh", { tag: "online", q: "therapy" });
            assert.strictEqual(url, "/zh/events?tag=online&q=therapy");
        });

        it("combines tag with sort param", () => {
            const url = buildEventsListUrl("zh", { tag: "free", sort: "upcoming" });
            assert.strictEqual(url, "/zh/events?tag=free&sort=upcoming");
        });

        it("combines all query params including tag", () => {
            const url = buildEventsListUrl("zh", {
                type: "workshop",
                tag: "advanced",
                q: "art",
                sort: "newest",
            });
            assert.strictEqual(
                url,
                "/zh/events?type=workshop&tag=advanced&q=art&sort=newest"
            );
        });

        it("handles empty tag param", () => {
            const url = buildEventsListUrl("zh", { tag: "" });
            assert.strictEqual(url, "/zh/events");
        });

        it("handles tag with different locale", () => {
            const url = buildEventsListUrl("en", { tag: "beginner" });
            assert.strictEqual(url, "/en/events?tag=beginner");
        });

        it("handles tag slug with hyphens", () => {
            const url = buildEventsListUrl("zh", { tag: "art-therapy" });
            assert.strictEqual(url, "/zh/events?tag=art-therapy");
        });
    });
});

describe("EventTag Type Contracts", () => {
    describe("EventTag interface", () => {
        it("has required fields", () => {
            const tag: EventTag = {
                id: "uuid-123",
                slug: "workshop",
                name_zh: "工作坊",
                sort_order: 1,
                is_visible: true,
                show_in_nav: false,
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
            };

            assert.strictEqual(tag.id, "uuid-123");
            assert.strictEqual(tag.slug, "workshop");
            assert.strictEqual(tag.name_zh, "工作坊");
            assert.strictEqual(tag.sort_order, 1);
            assert.strictEqual(tag.is_visible, true);
            assert.ok(tag.created_at);
            assert.ok(tag.updated_at);
        });
    });

    describe("EventTagInput interface", () => {
        it("supports creation input with required fields", () => {
            const input: EventTagInput = {
                slug: "beginner",
                name_zh: "初學者",
            };

            assert.strictEqual(input.slug, "beginner");
            assert.strictEqual(input.name_zh, "初學者");
        });

        it("supports optional fields", () => {
            const input: EventTagInput = {
                slug: "advanced",
                name_zh: "進階",
                sort_order: 5,
                is_visible: false,
            };

            assert.strictEqual(input.sort_order, 5);
            assert.strictEqual(input.is_visible, false);
        });
    });

    describe("EventTagWithCount interface", () => {
        it("extends EventTag with event_count", () => {
            const tagWithCount: EventTagWithCount = {
                id: "uuid-456",
                slug: "online",
                name_zh: "線上",
                sort_order: 2,
                is_visible: true,
                show_in_nav: false,
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
                event_count: 5,
            };

            assert.strictEqual(tagWithCount.event_count, 5);
            // Also verify it has all EventTag fields
            assert.strictEqual(tagWithCount.slug, "online");
            assert.strictEqual(tagWithCount.name_zh, "線上");
        });

        it("allows zero event_count", () => {
            const tagWithCount: EventTagWithCount = {
                id: "uuid-789",
                slug: "new-tag",
                name_zh: "新標籤",
                sort_order: 3,
                is_visible: true,
                show_in_nav: false,
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
                event_count: 0,
            };

            assert.strictEqual(tagWithCount.event_count, 0);
        });
    });
});

describe("Event Tag Slug Validation Patterns", () => {
    describe("valid slug patterns", () => {
        const validSlugs = [
            "workshop",
            "art-therapy",
            "beginner-level",
            "online-2024",
            "free_event",
            "workshop_01",
        ];

        for (const slug of validSlugs) {
            it(`accepts valid slug: ${slug}`, () => {
                // Slug pattern: lowercase alphanumeric with hyphens and underscores
                const pattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
                assert.ok(pattern.test(slug), `Expected "${slug}" to be valid`);
            });
        }
    });

    describe("invalid slug patterns", () => {
        const invalidSlugs = [
            "Workshop", // uppercase
            "art therapy", // space
            "-beginner", // starts with hyphen
            "online-", // ends with hyphen
            "free--event", // double hyphen
            "", // empty
        ];

        for (const slug of invalidSlugs) {
            it(`rejects invalid slug: "${slug || "(empty)"}"`, () => {
                const pattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
                assert.ok(!pattern.test(slug), `Expected "${slug}" to be invalid`);
            });
        }
    });
});

describe("Event-Tag Association Data Flow", () => {
    it("supports array of tag_ids in EventInput", () => {
        // This tests the type contract for creating/updating events with tags
        const eventInput = {
            title: "Test Event",
            slug: "test-event",
            tag_ids: ["uuid-1", "uuid-2", "uuid-3"],
        };

        assert.ok(Array.isArray(eventInput.tag_ids));
        assert.strictEqual(eventInput.tag_ids.length, 3);
    });

    it("supports empty tag_ids array", () => {
        const eventInput = {
            title: "Test Event",
            slug: "test-event",
            tag_ids: [],
        };

        assert.ok(Array.isArray(eventInput.tag_ids));
        assert.strictEqual(eventInput.tag_ids.length, 0);
    });

    it("supports undefined tag_ids", () => {
        const eventInput: { title: string; slug: string; tag_ids?: string[] } = {
            title: "Test Event",
            slug: "test-event",
        };

        assert.strictEqual(eventInput.tag_ids, undefined);
    });
});
