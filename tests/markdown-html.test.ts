import { describe, it } from 'node:test';
import assert from 'node:assert';
import { findClosestCopyTarget, extractCodeText } from '../lib/markdown/html';

// Simple mock for HTMLElement since we are in Node environment
class MockElement {
  tagName: string;
  classList: Set<string>;
  parentElement: MockElement | null;
  children: MockElement[];
  textContent: string;

  constructor(tagName: string, className = '', textContent = '') {
    this.tagName = tagName.toUpperCase();
    this.classList = new Set(className.split(' ').filter(c => c));
    this.parentElement = null;
    this.children = [];
    this.textContent = textContent;
  }

  closest(selector: string): MockElement | null {
    // Basic selector support for .class
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      if (this.classList.has(className)) return this;
    }
    return this.parentElement ? this.parentElement.closest(selector) : null;
  }

  querySelector(selector: string): MockElement | null {
    // Basic selector support for tag name
    if (this.tagName === selector.toUpperCase()) return this;
    for (const child of this.children) {
      if (child.tagName === selector.toUpperCase()) return child;
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }

  appendChild(child: MockElement) {
    this.children.push(child);
    child.parentElement = this;
  }
}

describe('markdown-html', () => {
    describe('findClosestCopyTarget', () => {
        it('should return null if element is null', () => {
            assert.strictEqual(findClosestCopyTarget(null), null);
        });

        it('should return the button if the element itself is the button', () => {
            const btn = new MockElement('button', 'copy-button');
            // @ts-expect-error - Test uses a minimal MockElement (not a real HTMLElement)
            assert.strictEqual(findClosestCopyTarget(btn), btn);
        });

        it('should return the button if the element is nested inside', () => {
            const btn = new MockElement('button', 'copy-button');
            const svg = new MockElement('svg');
            const path = new MockElement('path');
            btn.appendChild(svg);
            svg.appendChild(path);
            // @ts-expect-error - Test uses a minimal MockElement (not a real HTMLElement)
            assert.strictEqual(findClosestCopyTarget(path), btn);
        });

        it('should return null if no copy button is found in ancestry', () => {
            const div = new MockElement('div');
            const span = new MockElement('span');
            div.appendChild(span);
            // @ts-expect-error - Test uses a minimal MockElement (not a real HTMLElement)
            assert.strictEqual(findClosestCopyTarget(span), null);
        });
    });

    describe('extractCodeText', () => {
        it('should return null if wrapper is null', () => {
            assert.strictEqual(extractCodeText(null), null);
        });

        it('should return text from code element inside pre', () => {
            const wrapper = new MockElement('div', 'wrapper');
            const pre = new MockElement('pre');
            const code = new MockElement('code', '', 'const x = 1;');
            pre.appendChild(code);
            wrapper.appendChild(pre);

            // @ts-expect-error - Test uses a minimal MockElement (not a real HTMLElement)
            assert.strictEqual(extractCodeText(wrapper), 'const x = 1;');
        });

        it('should fallback to pre text content if code element is missing', () => {
             const wrapper = new MockElement('div', 'wrapper');
             const pre = new MockElement('pre', '', 'raw text');
             wrapper.appendChild(pre);
 
             // @ts-expect-error - Test uses a minimal MockElement (not a real HTMLElement)
             assert.strictEqual(extractCodeText(wrapper), 'raw text');
        });

        it('should return null if pre is missing', () => {
            const wrapper = new MockElement('div', 'wrapper');
            // @ts-expect-error - Test uses a minimal MockElement (not a real HTMLElement)
            assert.strictEqual(extractCodeText(wrapper), null);
        });
    });
});
