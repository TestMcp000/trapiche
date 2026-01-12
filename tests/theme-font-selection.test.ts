/**
 * Unit tests for lib/modules/theme/font-selection.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  FONT_SELECTION_PRESET,
  FONT_SELECTION_CUSTOM,
  resolveInitialSelection,
  resolveFontStack,
  hasUnsavedFontChanges,
  isSaveDisabled,
} from '../lib/modules/theme/font-selection';

describe('resolveInitialSelection', () => {
  it('returns PRESET when no override exists', () => {
    const result = resolveInitialSelection(null, null);
    assert.equal(result, FONT_SELECTION_PRESET);
  });

  it('returns the matched key when override is in allowlist', () => {
    const result = resolveInitialSelection('system-ui, sans-serif', 'system-sans');
    assert.equal(result, 'system-sans');
  });

  it('returns CUSTOM when override is not in allowlist', () => {
    const result = resolveInitialSelection('Comic Sans MS, cursive', null);
    assert.equal(result, FONT_SELECTION_CUSTOM);
  });
});

describe('resolveFontStack', () => {
  const presetStack = 'system-ui, sans-serif';
  const overrideStack = 'Georgia, serif';

  it('returns preset stack for PRESET selection', () => {
    const result = resolveFontStack(FONT_SELECTION_PRESET, presetStack, overrideStack);
    assert.equal(result, presetStack);
  });

  it('returns override stack for CUSTOM selection', () => {
    const result = resolveFontStack(FONT_SELECTION_CUSTOM, presetStack, overrideStack);
    assert.equal(result, overrideStack);
  });

  it('returns preset stack for CUSTOM when override is null', () => {
    const result = resolveFontStack(FONT_SELECTION_CUSTOM, presetStack, null);
    assert.equal(result, presetStack);
  });

  it('returns font stack for specific font key', () => {
    const result = resolveFontStack('system-mono', presetStack, overrideStack);
    // Should call getThemeFontStack('system-mono')
    assert.ok(result.includes('monospace'));
  });
});

describe('hasUnsavedFontChanges', () => {
  it('returns false for CUSTOM selection (cannot save)', () => {
    const result = hasUnsavedFontChanges(FONT_SELECTION_CUSTOM, 'any stack');
    assert.equal(result, false);
  });

  it('returns true for PRESET when there is an override', () => {
    const result = hasUnsavedFontChanges(FONT_SELECTION_PRESET, 'some override');
    assert.equal(result, true);
  });

  it('returns false for PRESET when there is no override', () => {
    const result = hasUnsavedFontChanges(FONT_SELECTION_PRESET, null);
    assert.equal(result, false);
  });

  it('returns true when selecting a different font', () => {
    const result = hasUnsavedFontChanges('system-mono', 'system-ui, sans-serif');
    assert.equal(result, true);
  });
});

describe('isSaveDisabled', () => {
  it('returns true when user cannot edit', () => {
    const result = isSaveDisabled(false, false, 'system-sans', null);
    assert.equal(result, true);
  });

  it('returns true when save is pending', () => {
    const result = isSaveDisabled(true, true, 'system-sans', null);
    assert.equal(result, true);
  });

  it('returns true when there are no changes', () => {
    const result = isSaveDisabled(true, false, FONT_SELECTION_PRESET, null);
    assert.equal(result, true);
  });

  it('returns false when there are changes and user can edit', () => {
    const result = isSaveDisabled(true, false, FONT_SELECTION_PRESET, 'some override');
    assert.equal(result, false);
  });
});
