import { describe, it } from 'node:test';
import assert from 'node:assert';
import { markdownToHtml } from '../lib/markdown/server';

describe('markdown-server', () => {
  it('should wrap code blocks with a copy button', async () => {
    const markdown = '```text\nconst a = 1;\n```';
    const html = await markdownToHtml(markdown);

    // Check for wrapper class
    assert.strictEqual(html.includes('relative group not-prose'), true, 'Should contain wrapper classes');
    
    // Check for button class
    assert.strictEqual(html.includes('copy-button'), true, 'Should contain copy button');
    
    // Check for SVG
    assert.strictEqual(html.includes('<svg'), true, 'Should contain SVG icon');
    
    // Check for code content
    assert.strictEqual(html.includes('const a = 1;'), true, 'Should contain code content');
  });

  it('should not inject button if no code block', async () => {
    const markdown = '# Hello World';
    const html = await markdownToHtml(markdown);
    
    assert.strictEqual(html.includes('copy-button'), false, 'Should not contain copy button');
    assert.strictEqual(html.includes('bg-gray-700'), false, 'Should not contain button styles');
  });

  // Basic check to ensure we didn't break functionality
  it('should render headers correctly', async () => {
     const markdown = '# Title';
     const html = await markdownToHtml(markdown);
     assert.ok(html.includes('<h1>Title</h1>') || html.includes('<h1 id="title">Title</h1>'), 'Should render h1');
  });
});
