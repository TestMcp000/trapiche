/**
 * Pure utility functions for interacting with Markdown HTML structure.
 * These functions are used for event delegation to avoid attaching listeners to every node.
 */

/**
 * Finds the closest copy button target from a clicked element.
 * @param element - The clicked element
 * @returns The button element if found, null otherwise
 */
export function findClosestCopyTarget(element: HTMLElement | null): HTMLButtonElement | null {
  if (!element) return null;
  return element.closest('.copy-button');
}

/**
 * Extracts the text content from the code block associated with the copy button wrapper.
 * Assumes the structure: <div class="wrapper"><pre><code>...</code></pre><button>...</div>
 * @param wrapper - The wrapper element containing the code block and button
 * @returns The text content of the code block, or null if not found
 */
export function extractCodeText(wrapper: HTMLElement | null): string | null {
  if (!wrapper) return null;
  
  // The wrapper should contain a 'pre' tag
  const pre = wrapper.querySelector('pre');
  if (!pre) return null;

  // Ideally get text from 'code', fallback to 'pre'
  const code = pre.querySelector('code');
  return code?.textContent || pre.textContent || null;
}
