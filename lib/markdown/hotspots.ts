import 'server-only';

/**
 * Safe Markdown to HTML converter for gallery hotspots.
 *
 * This module is designed for hotspots content that appears on the Home Hero
 * (highest exposure area). It uses a more conservative pipeline than the
 * trusted admin markdown converter (lib/markdown/server.ts).
 *
 * Security measures:
 * - Raw HTML is NOT allowed (no allowDangerousHtml)
 * - Content is sanitized with a GFM subset allowlist
 * - Only https: and mailto: links are permitted
 * - All links are forced to have target="_blank" + rel="noopener noreferrer"
 *
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (Implementation Contract §A)
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import type { Element, Root, RootContent } from 'hast';
import { visit } from 'unist-util-visit';
import { normalizeEscapedNewlines } from '@/lib/utils/normalize-escaped-newlines';

/**
 * Allowed protocols for links in hotspots content.
 * Only https and mailto are permitted to prevent XSS via javascript:/data: URLs.
 */
const ALLOWED_PROTOCOLS = ['https', 'mailto'];

/**
 * Custom sanitization schema for hotspots.
 * Uses a GFM subset allowlist - only safe formatting elements are permitted.
 */
const hotspotsSchema = {
    ...defaultSchema,
    // Strip dangerous elements completely
    strip: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select'],
    // Only allow safe GFM elements
    tagNames: [
        'p', 'br',
        'strong', 'b', 'em', 'i', 'del', 's',
        'ul', 'ol', 'li',
        'blockquote',
        'a',
        'code', 'pre',
    ],
    // Restrict attributes - only href for links
    attributes: {
        ...defaultSchema.attributes,
        a: ['href'],
        '*': [],
    },
    // Only allow https and mailto protocols
    protocols: {
        ...defaultSchema.protocols,
        href: ALLOWED_PROTOCOLS,
    },
};

/**
 * Check if a URL has an allowed protocol.
 */
function hasAllowedProtocol(href: string): boolean {
    const trimmed = href.trim().toLowerCase();
    return ALLOWED_PROTOCOLS.some(protocol => trimmed.startsWith(`${protocol}:`));
}

/**
 * Custom rehype plugin to secure links.
 *
 * - Strips links with disallowed protocols (http, javascript, data, etc.)
 * - Adds target="_blank" and rel="noopener noreferrer" to all remaining links
 */
function rehypeSecureLinks() {
    return (tree: Root) => {
        visit(tree, 'element', (node: Element, index: number | undefined, parent: Root | Element | undefined) => {
            if (node.tagName !== 'a') return;

            const href = node.properties?.href;

            // If no href or invalid protocol, unwrap the link (keep text content)
            if (!href || typeof href !== 'string' || !hasAllowedProtocol(href)) {
                if (parent && typeof index === 'number' && 'children' in parent) {
                    // Replace the <a> with its children (text content)
                    const parentChildren = parent.children as RootContent[];
                    parentChildren.splice(index, 1, ...node.children as RootContent[]);
                }
                return;
            }

            // Add security attributes to valid links
            node.properties = {
                ...node.properties,
                target: '_blank',
                rel: 'noopener noreferrer',
            };
        });
    };
}

/**
 * Create the unified processor for hotspots markdown.
 */
function createProcessor() {
    return unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype, { allowDangerousHtml: false }) // Explicitly disable raw HTML
        .use(rehypeSanitize, hotspotsSchema)
        .use(rehypeSecureLinks)
        .use(rehypeStringify);
}

/**
 * Convert hotspots markdown to safe HTML.
 *
 * @param markdown - Raw markdown content
 * @returns Safe HTML string ready for rendering
 */
export async function hotspotsMarkdownToHtml(markdown: string): Promise<string> {
    if (!markdown || typeof markdown !== 'string') {
        return '';
    }

    const normalized = normalizeEscapedNewlines(markdown);

    const processor = createProcessor();
    const result = await processor.process(normalized);
    return String(result).trim();
}

/**
 * Validate hotspots markdown content.
 *
 * Returns false if:
 * - Input is empty or not a string
 * - Sanitized output is empty (all content was stripped)
 *
 * @param markdown - Raw markdown content to validate
 * @returns true if content is valid and non-empty after sanitization
 */
export async function isValidHotspotsMarkdown(markdown: string): Promise<boolean> {
    if (!markdown || typeof markdown !== 'string') {
        return false;
    }

    const trimmed = markdown.trim();
    if (trimmed === '') {
        return false;
    }

    const html = await hotspotsMarkdownToHtml(trimmed);

    // Strip all HTML tags to check if there's actual text content
    const textContent = html.replace(/<[^>]*>/g, '').trim();

    return textContent.length > 0;
}
