import 'server-only';

/**
 * Server-side Markdown to HTML converter.
 * This module is server-only and should NOT be imported from client components.
 *
 * Benefits:
 * - Heavy remark/rehype processing stays on server
 * - Client only receives pre-rendered HTML
 * - Reduces public bundle by ~80KB
 *
 * ============================================================================
 * SECURITY: MARKDOWN TRUST BOUNDARY
 * ============================================================================
 *
 * This module uses `allowDangerousHtml: true` which permits raw HTML in
 * markdown content. This is **intentionally allowed** because:
 *
 * 1. ALL markdown sources are admin-controlled:
 *    - Blog posts (`posts` table) - protected by site_admins RLS
 *    - Product descriptions (`products` table) - protected by site_admins RLS
 *    - Landing page content (`site_content` table) - protected by site_admins RLS
 *
 * 2. There is NO user-submitted markdown in this system.
 *
 * 3. Admin users are trusted to author safe HTML content.
 *
 * ⚠️  CRITICAL: If user-submitted markdown is EVER introduced (e.g., comments
 *     with markdown, user profiles), you MUST:
 *     - Add DOMPurify or rehype-sanitize to this pipeline
 *     - Create a separate `userMarkdownToHtml()` function with sanitization
 *     - NEVER pass user content through this function
 *
 * Last audited: 2025-12-21
 * Audited sources: posts, products, site_content, landing_sections
 * ============================================================================
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypePrismPlus from 'rehype-prism-plus';
import rehypeStringify from 'rehype-stringify';
import type { Element, Parent, Root } from 'hast';

import { visit } from 'unist-util-visit';

/**
 * Custom Rehype plugin to add copy buttons to code blocks.
 * Wraps <pre> in <div class="relative group not-prose"> and adds a button.
 */
function rehypeCopyButton() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index: number | undefined, parent: Parent | undefined) => {
      // Look for <pre> tags
      if (node.tagName === 'pre') {
        // Double check it contains a <code> tag (standard markdown structure)
        const codeNode = node.children.find(
          (child): child is Element => child.type === 'element' && child.tagName === 'code'
        );
        if (!codeNode) return;

        // Create the wrapper div
        const wrapper: Element = {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['relative', 'group', 'not-prose']
          },
          children: [
            // The original <pre> node
            node,
            // The button node - positioned at top-right, always visible
            {
              type: 'element',
              tagName: 'button',
              properties: {
                className: ['copy-button', 'absolute', 'top-2', 'right-2', 'px-2', 'py-1', 'rounded-md', 'bg-gray-200', 'hover:bg-gray-300', 'text-gray-600', 'hover:text-gray-900', 'transition-all', 'text-xs', 'font-medium', 'flex', 'items-center', 'gap-1'],
                'aria-label': 'Copy code'
              },
              children: [
                // The SVG icon (smaller)
                {
                  type: 'element',
                  tagName: 'svg',
                  properties: {
                    xmlns: 'http://www.w3.org/2000/svg',
                    width: '14',
                    height: '14',
                    viewBox: '0 0 24 24',
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: '2',
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                  },
                  children: [
                    {
                      type: 'element',
                      tagName: 'rect',
                      properties: { x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' },
                      children: []
                    },
                    {
                      type: 'element',
                      tagName: 'path',
                      properties: { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' },
                      children: []
                    }
                  ]
                },
                // Text label
                {
                  type: 'element',
                  tagName: 'span',
                  properties: {},
                  children: [{ type: 'text', value: 'Copy' }]
                }
              ]
            }
          ]
        };

        // Replace the original node with the wrapper in the parent's children
        if (parent && typeof index === 'number') {
          parent.children[index] = wrapper;
        }
      }
    });
  };
}

/**
 * Convert Markdown content to HTML string.
 * Supports GFM, math equations (KaTeX), and code syntax highlighting (Prism).
 *
 * @param markdown - Raw Markdown content
 * @returns HTML string ready for rendering
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypePrismPlus, { ignoreMissing: true })
    .use(rehypeCopyButton) // Apply our custom plugin
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  return String(result);
}
